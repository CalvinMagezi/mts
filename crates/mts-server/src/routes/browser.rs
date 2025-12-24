use crate::state::AppState;
use axum::{
    extract::{
        ws::{Message, WebSocket, WebSocketUpgrade},
        State,
    },
    response::IntoResponse,
    routing::get,
    Router,
};
use futures::{sink::SinkExt, stream::StreamExt};
use serde::{Deserialize, Serialize};
use std::{
    collections::{HashSet, VecDeque},
    sync::Arc,
};
use tokio::sync::{mpsc, RwLock};
use tracing::{error, info, warn};

// =============================================================================
// Message Protocol Types
// =============================================================================

/// Commands sent from frontend to backend to control the browser
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum BrowserCommand {
    Navigate {
        url: String,
        command_id: String,
    },
    Click {
        selector: String,
        command_id: String,
    },
    Type {
        selector: String,
        text: String,
        command_id: String,
    },
    ExtractDOM {
        selector: Option<String>,
        command_id: String,
    },
    Screenshot {
        command_id: String,
    },
    ExecuteScript {
        script: String,
        command_id: String,
    },
}

impl BrowserCommand {
    pub fn command_id(&self) -> &str {
        match self {
            BrowserCommand::Navigate { command_id, .. } => command_id,
            BrowserCommand::Click { command_id, .. } => command_id,
            BrowserCommand::Type { command_id, .. } => command_id,
            BrowserCommand::ExtractDOM { command_id, .. } => command_id,
            BrowserCommand::Screenshot { command_id } => command_id,
            BrowserCommand::ExecuteScript { command_id, .. } => command_id,
        }
    }

    pub fn type_name(&self) -> &str {
        match self {
            BrowserCommand::Navigate { .. } => "navigate",
            BrowserCommand::Click { .. } => "click",
            BrowserCommand::Type { .. } => "type",
            BrowserCommand::ExtractDOM { .. } => "extract_dom",
            BrowserCommand::Screenshot { .. } => "screenshot",
            BrowserCommand::ExecuteScript { .. } => "execute_script",
        }
    }

    pub fn url(&self) -> Option<&str> {
        match self {
            BrowserCommand::Navigate { url, .. } => Some(url),
            _ => None,
        }
    }

    pub fn selector(&self) -> Option<&str> {
        match self {
            BrowserCommand::Click { selector, .. } => Some(selector),
            BrowserCommand::Type { selector, .. } => Some(selector),
            BrowserCommand::ExtractDOM { selector, .. } => selector.as_deref(),
            _ => None,
        }
    }
}

/// Events sent from backend to frontend
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum BrowserEvent {
    CommandResult {
        command_id: String,
        success: bool,
        data: Option<String>,
        error: Option<String>,
    },
    NavigationComplete {
        url: String,
    },
    LoadingStateChanged {
        loading: bool,
    },
    ConsentRequired {
        allowed_domains: Vec<String>,
    },
    Error {
        message: String,
    },
}

// =============================================================================
// Browser Session Manager
// =============================================================================

/// Manages the global browser WebSocket connection and state
pub struct BrowserSessionManager {
    /// WebSocket sender (if connected)
    ws_sender: Arc<RwLock<Option<mpsc::UnboundedSender<BrowserEvent>>>>,

    /// Command queue for when browser is offline
    command_queue: Arc<RwLock<VecDeque<BrowserCommand>>>,

    /// Current browser state
    current_url: Arc<RwLock<String>>,
    is_loading: Arc<RwLock<bool>>,

    /// Security: allowed domains for navigation
    allowed_domains: Arc<RwLock<HashSet<String>>>,

    /// Security: user has consented to browser automation
    user_consented: Arc<RwLock<bool>>,
}

impl Default for BrowserSessionManager {
    fn default() -> Self {
        Self::new()
    }
}

impl BrowserSessionManager {
    pub fn new() -> Self {
        // Initialize with default allowed domains
        let mut allowed_domains = HashSet::new();
        allowed_domains.insert("*.github.com".to_string());
        allowed_domains.insert("*.stackoverflow.com".to_string());
        allowed_domains.insert("*.wikipedia.org".to_string());
        allowed_domains.insert("localhost".to_string());
        allowed_domains.insert("127.0.0.1".to_string());

        Self {
            ws_sender: Arc::new(RwLock::new(None)),
            command_queue: Arc::new(RwLock::new(VecDeque::new())),
            current_url: Arc::new(RwLock::new("https://google.com".to_string())),
            is_loading: Arc::new(RwLock::new(false)),
            allowed_domains: Arc::new(RwLock::new(allowed_domains)),
            user_consented: Arc::new(RwLock::new(false)),
        }
    }

    /// Set the WebSocket sender when a client connects
    pub async fn set_sender(&self, sender: mpsc::UnboundedSender<BrowserEvent>) {
        let mut ws_sender = self.ws_sender.write().await;
        *ws_sender = Some(sender);
        info!("[BrowserSession] WebSocket sender set");
    }

    /// Clear the WebSocket sender when client disconnects
    pub async fn clear_sender(&self) {
        let mut ws_sender = self.ws_sender.write().await;
        *ws_sender = None;
        info!("[BrowserSession] WebSocket sender cleared");
    }

    /// Send an event to the connected frontend
    pub async fn send_event(&self, event: BrowserEvent) -> Result<(), String> {
        let sender = self.ws_sender.read().await;
        if let Some(sender) = sender.as_ref() {
            sender
                .send(event)
                .map_err(|e| format!("Failed to send event: {}", e))?;
            Ok(())
        } else {
            Err("No WebSocket connection".to_string())
        }
    }

    /// Queue a command when WebSocket is disconnected
    pub async fn queue_command(&self, command: BrowserCommand) {
        let mut queue = self.command_queue.write().await;
        queue.push_back(command);
        info!("[BrowserSession] Command queued (queue size: {})", queue.len());
    }

    /// Process queued commands when WebSocket reconnects
    pub async fn process_queued_commands(&self) -> Vec<BrowserCommand> {
        let mut queue = self.command_queue.write().await;
        let commands: Vec<BrowserCommand> = queue.drain(..).collect();
        if !commands.is_empty() {
            info!("[BrowserSession] Processing {} queued commands", commands.len());
        }
        commands
    }

    /// Update current URL
    pub async fn set_current_url(&self, url: String) {
        let mut current_url = self.current_url.write().await;
        *current_url = url;
    }

    /// Get current URL
    pub async fn get_current_url(&self) -> String {
        self.current_url.read().await.clone()
    }

    /// Update loading state
    pub async fn set_loading(&self, loading: bool) {
        let mut is_loading = self.is_loading.write().await;
        *is_loading = loading;
    }

    /// Check if URL is allowed
    pub async fn is_url_allowed(&self, url: &str) -> bool {
        // Parse URL to get domain
        let parsed_url = match url::Url::parse(url) {
            Ok(u) => u,
            Err(_) => return false,
        };

        let host = match parsed_url.host_str() {
            Some(h) => h,
            None => return false,
        };

        let allowed_domains = self.allowed_domains.read().await;

        // Check against patterns
        for pattern in allowed_domains.iter() {
            if matches_domain_pattern(host, pattern) {
                return true;
            }
        }

        false
    }

    /// Add domain to allowlist
    pub async fn add_allowed_domain(&self, domain: String) {
        let mut allowed_domains = self.allowed_domains.write().await;
        allowed_domains.insert(domain);
    }

    /// Get allowed domains
    pub async fn get_allowed_domains(&self) -> Vec<String> {
        let allowed_domains = self.allowed_domains.read().await;
        allowed_domains.iter().cloned().collect()
    }

    /// Set user consent
    pub async fn set_consent(&self, consented: bool) {
        let mut user_consented = self.user_consented.write().await;
        *user_consented = consented;
    }

    /// Check if user has consented
    pub async fn has_consent(&self) -> bool {
        *self.user_consented.read().await
    }
}

/// Helper function to match domain patterns (supports wildcards)
fn matches_domain_pattern(host: &str, pattern: &str) -> bool {
    if pattern == host {
        return true;
    }

    // Support wildcard patterns like "*.github.com"
    if pattern.starts_with("*.") {
        let suffix = &pattern[2..];
        return host.ends_with(suffix) || host == suffix;
    }

    false
}

// =============================================================================
// WebSocket Handler
// =============================================================================

/// WebSocket endpoint: GET /ws/browser
pub async fn websocket_handler(
    ws: WebSocketUpgrade,
    State(state): State<Arc<AppState>>,
) -> impl IntoResponse {
    info!("[Browser] WebSocket connection requested");
    ws.on_upgrade(move |socket| handle_websocket(socket, state))
}

/// Handle WebSocket connection
async fn handle_websocket(socket: WebSocket, state: Arc<AppState>) {
    info!("[Browser] WebSocket connection established");

    let (mut sender, mut receiver) = socket.split();
    let (tx, mut rx) = mpsc::unbounded_channel::<BrowserEvent>();

    // Register the sender with the session manager
    state.browser_manager.set_sender(tx.clone()).await;

    // Process any queued commands
    let queued_commands = state.browser_manager.process_queued_commands().await;
    for command in queued_commands {
        if let Ok(json) = serde_json::to_string(&command) {
            if let Err(e) = sender.send(Message::Text(json.into())).await {
                error!("[Browser] Failed to send queued command: {}", e);
            }
        }
    }

    // Task to receive events from backend and send to frontend
    let send_task = tokio::spawn(async move {
        while let Some(event) = rx.recv().await {
            match serde_json::to_string(&event) {
                Ok(json) => {
                    if let Err(e) = sender.send(Message::Text(json.into())).await {
                        error!("[Browser] Failed to send event to frontend: {}", e);
                        break;
                    }
                }
                Err(e) => {
                    error!("[Browser] Failed to serialize event: {}", e);
                }
            }
        }
    });

    // Task to receive commands from frontend and process
    let recv_task = {
        let state = state.clone();
        tokio::spawn(async move {
            while let Some(msg) = receiver.next().await {
                match msg {
                    Ok(Message::Text(text)) => {
                        match serde_json::from_str::<BrowserCommand>(&text) {
                            Ok(command) => {
                                handle_browser_command(command, &state).await;
                            }
                            Err(e) => {
                                error!("[Browser] Failed to parse command: {}", e);
                            }
                        }
                    }
                    Ok(Message::Close(_)) => {
                        info!("[Browser] WebSocket close message received");
                        break;
                    }
                    Ok(Message::Ping(_)) => {
                        // Pings are automatically handled by axum
                    }
                    Err(e) => {
                        error!("[Browser] WebSocket error: {}", e);
                        break;
                    }
                    _ => {}
                }
            }
        })
    };

    // Wait for either task to complete
    tokio::select! {
        _ = send_task => {
            info!("[Browser] Send task completed");
        }
        _ = recv_task => {
            info!("[Browser] Receive task completed");
        }
    }

    // Cleanup
    state.browser_manager.clear_sender().await;
    info!("[Browser] WebSocket connection closed");
}

/// Handle incoming browser command
async fn handle_browser_command(command: BrowserCommand, state: &AppState) {
    let command_id = command.command_id().to_string();
    let command_type = command.type_name();

    // Audit logging
    info!(
        target: "browser_audit",
        command_type = %command_type,
        command_id = %command_id,
        url = ?command.url(),
        selector = ?command.selector(),
        timestamp = %chrono::Utc::now(),
        "Browser command received"
    );

    // Security checks for navigation
    if let BrowserCommand::Navigate { ref url, .. } = command {
        // Check URL allowlist
        if !state.browser_manager.is_url_allowed(url).await {
            warn!(
                "[Browser] URL blocked by allowlist: {} (command_id: {})",
                url, command_id
            );

            let _ = state
                .browser_manager
                .send_event(BrowserEvent::CommandResult {
                    command_id: command_id.clone(),
                    success: false,
                    data: None,
                    error: Some(format!("URL '{}' not in allowlist", url)),
                })
                .await;

            // Send consent required event with allowed domains
            let allowed_domains = state.browser_manager.get_allowed_domains().await;
            let _ = state
                .browser_manager
                .send_event(BrowserEvent::ConsentRequired { allowed_domains })
                .await;

            return;
        }

        // Check user consent
        if !state.browser_manager.has_consent().await {
            warn!(
                "[Browser] User consent required (command_id: {})",
                command_id
            );

            let allowed_domains = state.browser_manager.get_allowed_domains().await;
            let _ = state
                .browser_manager
                .send_event(BrowserEvent::ConsentRequired { allowed_domains })
                .await;

            // Queue the command for later execution
            state.browser_manager.queue_command(command).await;
            return;
        }
    }

    // Forward command to frontend (the frontend will handle it and send results back)
    info!(
        "[Browser] Command processed: {} (command_id: {})",
        command_type, command_id
    );

    // Note: In a full implementation, we would wait for the result from the Electron IPC
    // and then send a CommandResult event. For now, we just log the command.
}

// =============================================================================
// Route Configuration
// =============================================================================

pub fn routes(state: Arc<AppState>) -> Router {
    Router::new()
        .route("/ws/browser", get(websocket_handler))
        .with_state(state)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_domain_pattern_matching() {
        assert!(matches_domain_pattern("github.com", "github.com"));
        assert!(matches_domain_pattern("api.github.com", "*.github.com"));
        assert!(matches_domain_pattern("github.com", "*.github.com"));
        assert!(!matches_domain_pattern("example.com", "*.github.com"));
        assert!(matches_domain_pattern("localhost", "localhost"));
    }

    #[test]
    fn test_command_id_extraction() {
        let cmd = BrowserCommand::Navigate {
            url: "https://example.com".to_string(),
            command_id: "test-123".to_string(),
        };
        assert_eq!(cmd.command_id(), "test-123");
        assert_eq!(cmd.type_name(), "navigate");
        assert_eq!(cmd.url(), Some("https://example.com"));
    }
}
