use crate::state::AppState;
use axum::{
    extract::{DefaultBodyLimit, Path, State},
    http::{self, StatusCode},
    response::IntoResponse,
    routing::{get, post},
    Json, Router,
};
use bytes::Bytes;
use futures::{stream::StreamExt, Stream};
use mts::agents::{AgentEvent, SessionConfig};
use mts::conversation::message::{Message, MessageContent, TokenState};
use mts::conversation::Conversation;
use mts::session::SessionManager;
use rmcp::model::ServerNotification;
use serde::{Deserialize, Serialize};
use std::{
    convert::Infallible,
    pin::Pin,
    sync::Arc,
    task::{Context, Poll},
    time::Duration,
};
use tokio::sync::{broadcast, mpsc};
use tokio::time::timeout;
use tokio_stream::wrappers::ReceiverStream;
use tokio_util::sync::CancellationToken;

fn track_tool_telemetry(content: &MessageContent, all_messages: &[Message]) {
    match content {
        MessageContent::ToolRequest(tool_request) => {
            if let Ok(tool_call) = &tool_request.tool_call {
                tracing::info!(monotonic_counter.mts.tool_calls = 1,
                    tool_name = %tool_call.name,
                    "Tool call started"
                );
            }
        }
        MessageContent::ToolResponse(tool_response) => {
            let tool_name = all_messages
                .iter()
                .rev()
                .find_map(|msg| {
                    msg.content.iter().find_map(|c| {
                        if let MessageContent::ToolRequest(req) = c {
                            if req.id == tool_response.id {
                                if let Ok(tool_call) = &req.tool_call {
                                    Some(tool_call.name.clone())
                                } else {
                                    None
                                }
                            } else {
                                None
                            }
                        } else {
                            None
                        }
                    })
                })
                .unwrap_or_else(|| "unknown".to_string().into());

            let success = tool_response.tool_result.is_ok();
            let result_status = if success { "success" } else { "error" };

            tracing::info!(
                counter.mts.tool_completions = 1,
                tool_name = %tool_name,
                result = %result_status,
                "Tool call completed"
            );
        }
        _ => {}
    }
}

#[derive(Debug, Deserialize, Serialize, utoipa::ToSchema)]
pub struct ChatRequest {
    messages: Vec<Message>,
    session_id: String,
    recipe_name: Option<String>,
    recipe_version: Option<String>,
}

pub struct SseResponse {
    rx: ReceiverStream<String>,
}

impl SseResponse {
    fn new(rx: ReceiverStream<String>) -> Self {
        Self { rx }
    }
}

impl Stream for SseResponse {
    type Item = Result<Bytes, Infallible>;

    fn poll_next(mut self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<Option<Self::Item>> {
        Pin::new(&mut self.rx)
            .poll_next(cx)
            .map(|opt| opt.map(|s| Ok(Bytes::from(s))))
    }
}

impl IntoResponse for SseResponse {
    fn into_response(self) -> axum::response::Response {
        let stream = self;
        let body = axum::body::Body::from_stream(stream);

        http::Response::builder()
            .header("Content-Type", "text/event-stream")
            .header("Cache-Control", "no-cache")
            .header("Connection", "keep-alive")
            .body(body)
            .unwrap()
    }
}

#[derive(Debug, Clone, Serialize, utoipa::ToSchema)]
#[serde(tag = "type")]
pub enum MessageEvent {
    Message {
        message: Message,
        token_state: TokenState,
    },
    Error {
        error: String,
    },
    Finish {
        reason: String,
        token_state: TokenState,
    },
    ModelChange {
        model: String,
        mode: String,
    },
    Notification {
        request_id: String,
        #[schema(value_type = Object)]
        message: ServerNotification,
    },
    UpdateConversation {
        conversation: Conversation,
    },
    Ping,
}

async fn get_token_state(session_id: &str) -> TokenState {
    SessionManager::get_session(session_id, false)
        .await
        .map(|session| TokenState {
            input_tokens: session.input_tokens.unwrap_or(0),
            output_tokens: session.output_tokens.unwrap_or(0),
            total_tokens: session.total_tokens.unwrap_or(0),
            accumulated_input_tokens: session.accumulated_input_tokens.unwrap_or(0),
            accumulated_output_tokens: session.accumulated_output_tokens.unwrap_or(0),
            accumulated_total_tokens: session.accumulated_total_tokens.unwrap_or(0),
        })
        .inspect_err(|e| {
            tracing::warn!(
                "Failed to fetch session token state for {}: {}",
                session_id,
                e
            );
        })
        .unwrap_or_default()
}

/// Stream event to the connected client and optionally broadcast to background subscribers
async fn stream_event(
    event: MessageEvent,
    tx: &mpsc::Sender<String>,
    broadcaster: Option<&broadcast::Sender<MessageEvent>>,
) {
    let json = serde_json::to_string(&event).unwrap_or_else(|e| {
        format!(
            r#"{{"type":"Error","error":"Failed to serialize event: {}"}}"#,
            e
        )
    });

    // Broadcast to background subscribers (ignore errors - subscribers may have disconnected)
    if let Some(bc) = broadcaster {
        let _ = bc.send(event);
    }

    // Send to connected client (ignore if client disconnected - task continues in background)
    if tx.send(format!("data: {}\n\n", json)).await.is_err() {
        tracing::info!("client disconnected, task continues in background");
        // Note: We do NOT cancel the task here - it continues running
    }
}

#[allow(clippy::too_many_lines)]
#[utoipa::path(
    post,
    path = "/reply",
    request_body = ChatRequest,
    responses(
        (status = 200, description = "Streaming response initiated",
         body = MessageEvent,
         content_type = "text/event-stream"),
        (status = 424, description = "Agent not initialized"),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn reply(
    State(state): State<Arc<AppState>>,
    Json(request): Json<ChatRequest>,
) -> Result<SseResponse, StatusCode> {
    let session_start = std::time::Instant::now();

    tracing::info!(
        counter.mts.session_starts = 1,
        session_type = "app",
        interface = "ui",
        "Session started"
    );

    let session_id = request.session_id.clone();

    if let Some(recipe_name) = request.recipe_name.clone() {
        if state.mark_recipe_run_if_absent(&session_id).await {
            let recipe_version = request
                .recipe_version
                .clone()
                .unwrap_or_else(|| "unknown".to_string());

            tracing::info!(
                counter.mts.recipe_runs = 1,
                recipe_name = %recipe_name,
                recipe_version = %recipe_version,
                session_type = "app",
                interface = "ui",
                "Recipe execution started"
            );
        }
    }

    let (tx, rx) = mpsc::channel(100);
    let stream = ReceiverStream::new(rx);
    let cancel_token = CancellationToken::new();

    let messages = Conversation::new_unvalidated(request.messages);

    let task_cancel = cancel_token.clone();
    let task_tx = tx.clone();

    // Register this task with the background task manager for durable execution
    let broadcaster = state
        .background_tasks
        .register_task(session_id.clone(), cancel_token.clone())
        .await;
    let bg_tasks = state.background_tasks.clone();
    let bg_session_id = session_id.clone();

    drop(tokio::spawn(async move {
        let agent = match state.get_agent(session_id.clone()).await {
            Ok(agent) => agent,
            Err(e) => {
                tracing::error!("Failed to get session agent: {}", e);
                let _ = stream_event(
                    MessageEvent::Error {
                        error: format!("Failed to get session agent: {}", e),
                    },
                    &task_tx,
                    Some(&broadcaster),
                )
                .await;
                bg_tasks.mark_error(&bg_session_id).await;
                return;
            }
        };

        let session = match SessionManager::get_session(&session_id, false).await {
            Ok(metadata) => metadata,
            Err(e) => {
                tracing::error!("Failed to read session for {}: {}", session_id, e);
                let _ = stream_event(
                    MessageEvent::Error {
                        error: format!("Failed to read session: {}", e),
                    },
                    &task_tx,
                    Some(&broadcaster),
                )
                .await;
                bg_tasks.mark_error(&bg_session_id).await;
                return;
            }
        };

        let session_config = SessionConfig {
            id: session_id.clone(),
            schedule_id: session.schedule_id.clone(),
            max_turns: None,
            retry_config: None,
        };

        let user_message = match messages.last() {
            Some(msg) => msg,
            _ => {
                let _ = stream_event(
                    MessageEvent::Error {
                        error: "Reply started with empty messages".to_string(),
                    },
                    &task_tx,
                    Some(&broadcaster),
                )
                .await;
                bg_tasks.mark_error(&bg_session_id).await;
                return;
            }
        };

        let mut stream = match agent
            .reply(
                user_message.clone(),
                session_config,
                Some(task_cancel.clone()),
            )
            .await
        {
            Ok(stream) => stream,
            Err(e) => {
                tracing::error!("Failed to start reply stream: {:?}", e);
                stream_event(
                    MessageEvent::Error {
                        error: e.to_string(),
                    },
                    &task_tx,
                    Some(&broadcaster),
                )
                .await;
                bg_tasks.mark_error(&bg_session_id).await;
                return;
            }
        };

        let mut all_messages = messages.clone();

        let mut heartbeat_interval = tokio::time::interval(Duration::from_millis(500));
        let mut task_error = false;
        loop {
            tokio::select! {
                _ = task_cancel.cancelled() => {
                    tracing::info!("Agent task cancelled");
                    break;
                }
                _ = heartbeat_interval.tick() => {
                    // Update activity timestamp and send heartbeat
                    bg_tasks.update_activity(&bg_session_id).await;
                    stream_event(MessageEvent::Ping, &tx, Some(&broadcaster)).await;
                }
                response = timeout(Duration::from_millis(500), stream.next()) => {
                    match response {
                        Ok(Some(Ok(AgentEvent::Message(message)))) => {
                            for content in &message.content {
                                track_tool_telemetry(content, all_messages.messages());
                            }

                            all_messages.push(message.clone());

                            let token_state = get_token_state(&session_id).await;

                            bg_tasks.update_activity(&bg_session_id).await;
                            stream_event(MessageEvent::Message { message, token_state }, &tx, Some(&broadcaster)).await;
                        }
                        Ok(Some(Ok(AgentEvent::HistoryReplaced(new_messages)))) => {
                            all_messages = new_messages.clone();
                            bg_tasks.update_activity(&bg_session_id).await;
                            stream_event(MessageEvent::UpdateConversation {conversation: new_messages}, &tx, Some(&broadcaster)).await;
                        }
                        Ok(Some(Ok(AgentEvent::ModelChange { model, mode }))) => {
                            stream_event(MessageEvent::ModelChange { model, mode }, &tx, Some(&broadcaster)).await;
                        }
                        Ok(Some(Ok(AgentEvent::McpNotification((request_id, n))))) => {
                            stream_event(MessageEvent::Notification{
                                request_id: request_id.clone(),
                                message: n,
                            }, &tx, Some(&broadcaster)).await;
                        }

                        Ok(Some(Err(e))) => {
                            tracing::error!("Error processing message: {}", e);
                            stream_event(
                                MessageEvent::Error {
                                    error: e.to_string(),
                                },
                                &tx,
                                Some(&broadcaster),
                            ).await;
                            task_error = true;
                            break;
                        }
                        Ok(None) => {
                            // Agent stream completed normally
                            break;
                        }
                        Err(_) => {
                            // Timeout - continue processing (client disconnect doesn't stop the task)
                            continue;
                        }
                    }
                }
            }
        }

        let session_duration = session_start.elapsed();

        if let Ok(session) = SessionManager::get_session(&session_id, true).await {
            let total_tokens = session.total_tokens.unwrap_or(0);
            tracing::info!(
                counter.mts.session_completions = 1,
                session_type = "app",
                interface = "ui",
                exit_type = "normal",
                duration_ms = session_duration.as_millis() as u64,
                total_tokens = total_tokens,
                message_count = session.message_count,
                "Session completed"
            );

            tracing::info!(
                counter.mts.session_duration_ms = session_duration.as_millis() as u64,
                session_type = "app",
                interface = "ui",
                "Session duration"
            );

            if total_tokens > 0 {
                tracing::info!(
                    counter.mts.session_tokens = total_tokens,
                    session_type = "app",
                    interface = "ui",
                    "Session tokens"
                );
            }
        } else {
            tracing::info!(
                counter.mts.session_completions = 1,
                session_type = "app",
                interface = "ui",
                exit_type = "normal",
                duration_ms = session_duration.as_millis() as u64,
                total_tokens = 0u64,
                message_count = all_messages.len(),
                "Session completed"
            );

            tracing::info!(
                counter.mts.session_duration_ms = session_duration.as_millis() as u64,
                session_type = "app",
                interface = "ui",
                "Session duration"
            );
        }

        let final_token_state = get_token_state(&session_id).await;

        let _ = stream_event(
            MessageEvent::Finish {
                reason: "stop".to_string(),
                token_state: final_token_state,
            },
            &task_tx,
            Some(&broadcaster),
        )
        .await;

        // Mark task as completed or errored in background task manager
        if task_error {
            bg_tasks.mark_error(&bg_session_id).await;
        } else {
            bg_tasks.mark_completed(&bg_session_id).await;
        }
    }));
    Ok(SseResponse::new(stream))
}

/// Subscribe to updates from an existing running agent task
/// Returns SSE stream of events from the background task
#[utoipa::path(
    get,
    path = "/sessions/{session_id}/subscribe",
    params(
        ("session_id" = String, Path, description = "Session ID to subscribe to")
    ),
    responses(
        (status = 200, description = "Subscribed to session events",
         body = MessageEvent,
         content_type = "text/event-stream"),
        (status = 404, description = "No active task for this session")
    )
)]
pub async fn subscribe_to_session(
    State(state): State<Arc<AppState>>,
    Path(session_id): Path<String>,
) -> Result<SseResponse, StatusCode> {
    // Try to subscribe to the background task
    let receiver = state
        .background_tasks
        .subscribe(&session_id)
        .await
        .ok_or(StatusCode::NOT_FOUND)?;

    let (tx, rx) = mpsc::channel(100);
    let stream = ReceiverStream::new(rx);

    // Spawn a task to forward events from the broadcaster to the SSE stream
    tokio::spawn(async move {
        let mut receiver = receiver;
        loop {
            match receiver.recv().await {
                Ok(event) => {
                    let json = serde_json::to_string(&event).unwrap_or_else(|e| {
                        format!(
                            r#"{{"type":"Error","error":"Failed to serialize event: {}"}}"#,
                            e
                        )
                    });

                    if tx.send(format!("data: {}\n\n", json)).await.is_err() {
                        // Client disconnected
                        break;
                    }

                    // If this is a Finish event, we're done
                    if matches!(event, MessageEvent::Finish { .. }) {
                        break;
                    }
                }
                Err(broadcast::error::RecvError::Closed) => {
                    // Broadcaster closed, task finished
                    break;
                }
                Err(broadcast::error::RecvError::Lagged(_)) => {
                    // We missed some events, continue
                    continue;
                }
            }
        }
    });

    Ok(SseResponse::new(stream))
}

/// Get the status of a background task for a session
#[utoipa::path(
    get,
    path = "/sessions/{session_id}/task-status",
    params(
        ("session_id" = String, Path, description = "Session ID to check")
    ),
    responses(
        (status = 200, description = "Task status",
         body = crate::background_tasks::TaskStatusResponse),
        (status = 404, description = "No task for this session")
    )
)]
pub async fn get_task_status(
    State(state): State<Arc<AppState>>,
    Path(session_id): Path<String>,
) -> Result<Json<crate::background_tasks::TaskStatusResponse>, StatusCode> {
    state
        .background_tasks
        .get_status(&session_id)
        .await
        .map(Json)
        .ok_or(StatusCode::NOT_FOUND)
}

/// Cancel a running background task
#[utoipa::path(
    post,
    path = "/sessions/{session_id}/cancel-task",
    params(
        ("session_id" = String, Path, description = "Session ID to cancel")
    ),
    responses(
        (status = 200, description = "Task cancelled"),
        (status = 404, description = "No active task for this session")
    )
)]
pub async fn cancel_task(
    State(state): State<Arc<AppState>>,
    Path(session_id): Path<String>,
) -> Result<StatusCode, StatusCode> {
    if state.background_tasks.cancel_task(&session_id).await {
        Ok(StatusCode::OK)
    } else {
        Err(StatusCode::NOT_FOUND)
    }
}

pub fn routes(state: Arc<AppState>) -> Router {
    Router::new()
        .route(
            "/reply",
            post(reply).layer(DefaultBodyLimit::max(50 * 1024 * 1024)),
        )
        .route(
            "/sessions/{session_id}/subscribe",
            get(subscribe_to_session),
        )
        .route("/sessions/{session_id}/task-status", get(get_task_status))
        .route("/sessions/{session_id}/cancel-task", post(cancel_task))
        .with_state(state)
}

#[cfg(test)]
mod tests {
    use super::*;

    mod integration_tests {
        use super::*;
        use axum::{body::Body, http::Request};
        use mts::conversation::message::Message;
        use tower::ServiceExt;

        #[tokio::test(flavor = "multi_thread")]
        async fn test_reply_endpoint() {
            let state = AppState::new().await.unwrap();

            let app = routes(state);

            let request = Request::builder()
                .uri("/reply")
                .method("POST")
                .header("content-type", "application/json")
                .header("x-secret-key", "test-secret")
                .body(Body::from(
                    serde_json::to_string(&ChatRequest {
                        messages: vec![Message::user().with_text("test message")],
                        session_id: "test-session".to_string(),
                        recipe_name: None,
                        recipe_version: None,
                    })
                    .unwrap(),
                ))
                .unwrap();

            let response = app.oneshot(request).await.unwrap();

            assert_eq!(response.status(), StatusCode::OK);
        }
    }
}
