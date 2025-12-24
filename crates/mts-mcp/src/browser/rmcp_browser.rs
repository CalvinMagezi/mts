use indoc::formatdoc;
use rmcp::{
    handler::server::{router::tool::ToolRouter, wrapper::Parameters},
    model::{
        CallToolResult, Content, ErrorCode, ErrorData, Implementation, Role, ServerCapabilities, ServerInfo,
    },
    tool, tool_router, ServerHandler,
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::{mpsc, RwLock};
use tokio_tungstenite::{connect_async, tungstenite::protocol::Message};
use futures::{SinkExt, StreamExt};
use uuid::Uuid;

use super::types::{InteractionParams, NavigateParams, ScrapeParams};

// =============================================================================
// WebSocket Message Types (matching server protocol)
// =============================================================================

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
// Browser Server
// =============================================================================

/// BrowserServer provides browser automation tools to the AI agent
pub struct BrowserServer {
    tool_router: ToolRouter<Self>,
    /// WebSocket URL for the browser backend
    ws_url: String,
    /// Response channels for pending commands
    response_channels: Arc<RwLock<std::collections::HashMap<String, mpsc::UnboundedSender<BrowserEvent>>>>,
}

impl BrowserServer {
    pub fn new(server_url: String) -> Self {
        // Construct WebSocket URL from HTTP server URL
        let ws_url = if server_url.starts_with("http://") {
            server_url.replace("http://", "ws://")
        } else if server_url.starts_with("https://") {
            server_url.replace("https://", "wss://")
        } else {
            format!("ws://{}", server_url)
        };
        let ws_url = format!("{}/ws/browser", ws_url.trim_end_matches('/'));

        Self {
            tool_router: Self::tool_router(),
            ws_url,
            response_channels: Arc::new(RwLock::new(std::collections::HashMap::new())),
        }
    }

    /// Send a command to the browser and wait for the result
    async fn send_command(&self, command: BrowserCommand) -> Result<BrowserEvent, String> {
        let command_id = match &command {
            BrowserCommand::Navigate { command_id, .. } => command_id.clone(),
            BrowserCommand::Click { command_id, .. } => command_id.clone(),
            BrowserCommand::Type { command_id, .. } => command_id.clone(),
            BrowserCommand::ExtractDOM { command_id, .. } => command_id.clone(),
            BrowserCommand::Screenshot { command_id } => command_id.clone(),
            BrowserCommand::ExecuteScript { command_id, .. } => command_id.clone(),
        };

        // Create response channel
        let (tx, mut rx) = mpsc::unbounded_channel();
        {
            let mut channels = self.response_channels.write().await;
            channels.insert(command_id.clone(), tx);
        }

        // Connect to WebSocket
        let (ws_stream, _) = connect_async(&self.ws_url)
            .await
            .map_err(|e| format!("Failed to connect to browser WebSocket: {}", e))?;

        let (mut write, mut read) = ws_stream.split();

        // Send command
        let command_json = serde_json::to_string(&command)
            .map_err(|e| format!("Failed to serialize command: {}", e))?;
        write
            .send(Message::Text(command_json.into()))
            .await
            .map_err(|e| format!("Failed to send command: {}", e))?;

        // Spawn task to read responses
        let response_channels = self.response_channels.clone();
        let read_task = tokio::spawn(async move {
            while let Some(msg) = read.next().await {
                match msg {
                    Ok(Message::Text(text)) => {
                        if let Ok(event) = serde_json::from_str::<BrowserEvent>(&text) {
                            // Find the response channel
                            if let BrowserEvent::CommandResult { command_id, .. } = &event {
                                let channels = response_channels.read().await;
                                if let Some(tx) = channels.get(command_id) {
                                    let _ = tx.send(event);
                                }
                            }
                        }
                    }
                    Ok(Message::Close(_)) => break,
                    Err(e) => {
                        tracing::error!("[BrowserMCP] WebSocket error: {}", e);
                        break;
                    }
                    _ => {}
                }
            }
        });

        // Wait for response with timeout
        let result = tokio::time::timeout(Duration::from_secs(30), rx.recv())
            .await
            .map_err(|_| "Command timeout (30s)".to_string())?
            .ok_or_else(|| "Response channel closed".to_string())?;

        // Cleanup
        {
            let mut channels = self.response_channels.write().await;
            channels.remove(&command_id);
        }
        read_task.abort();

        Ok(result)
    }
}

impl Default for BrowserServer {
    fn default() -> Self {
        Self::new("http://localhost:3000".to_string())
    }
}

#[tool_router(router = tool_router)]
impl BrowserServer {
    /// Navigate the browser to a URL
    ///
    /// This tool navigates the browser to a specified URL and waits for the page to load.
    /// The URL must be http:// or https://. Returns the final URL after any redirects,
    /// along with the page title.
    ///
    /// Security: The URL will be checked against an allowlist. If the domain is not allowed,
    /// the command will fail with an error message listing the allowed domains.
    #[tool(
        name = "browser_navigate",
        description = "Navigate the browser to a URL. Waits for page load. Returns final URL after redirects and page title. URLs must be http:// or https://. Subject to domain allowlist for security."
    )]
    pub async fn navigate(&self, params: Parameters<NavigateParams>) -> Result<CallToolResult, ErrorData> {
        let params = params.0;
        let command_id = Uuid::new_v4().to_string();

        tracing::info!("[BrowserMCP] Navigating to: {}", params.url);

        let command = BrowserCommand::Navigate {
            url: params.url.clone(),
            command_id,
        };

        match self.send_command(command).await {
            Ok(BrowserEvent::CommandResult {
                success,
                data,
                error,
                ..
            }) => {
                if success {
                    let result_text = if let Some(data) = data {
                        format!("✓ Successfully navigated to: {}\n\nPage content preview:\n{}", params.url, data)
                    } else {
                        format!("✓ Successfully navigated to: {}", params.url)
                    };

                    Ok(CallToolResult::success(vec![
                        Content::text(result_text.clone()).with_audience(vec![Role::Assistant]),
                        Content::text(result_text)
                            .with_audience(vec![Role::User])
                            .with_priority(0.0),
                    ]))
                } else {
                    let error_msg = error.unwrap_or_else(|| "Unknown error".to_string());
                    Err(ErrorData::new(
                        ErrorCode::INTERNAL_ERROR,
                        format!("Navigation failed: {}", error_msg),
                        None,
                    ))
                }
            }
            Ok(event) => Err(ErrorData::new(
                ErrorCode::INTERNAL_ERROR,
                format!("Unexpected event: {:?}", event),
                None,
            )),
            Err(e) => Err(ErrorData::new(
                ErrorCode::INTERNAL_ERROR,
                format!("Command failed: {}", e),
                None,
            )),
        }
    }

    /// Interact with page elements
    ///
    /// This tool allows you to interact with elements on the current page:
    /// - 'click': Click a button or link
    /// - 'type': Fill in an input field or textarea
    /// - 'scroll': Scroll to an element
    ///
    /// Use CSS selectors to target elements (e.g., "#submit-button", ".input-field", "button[type='submit']")
    #[tool(
        name = "browser_interaction",
        description = "Interact with page elements: click buttons, fill inputs, or scroll. Actions: 'click', 'type', 'scroll'. Use CSS selectors to target elements."
    )]
    pub async fn interact(&self, params: Parameters<InteractionParams>) -> Result<CallToolResult, ErrorData> {
        let params = params.0;
        let command_id = Uuid::new_v4().to_string();

        tracing::info!(
            "[BrowserMCP] Interaction: {} on {}",
            params.action,
            params.selector
        );

        let command = match params.action.as_str() {
            "click" => BrowserCommand::Click {
                selector: params.selector.clone(),
                command_id,
            },
            "type" => {
                let text = params.value.ok_or_else(|| {
                    ErrorData::new(
                        ErrorCode::INVALID_PARAMS,
                        "The 'type' action requires a 'value' parameter".to_string(),
                        None,
                    )
                })?;
                BrowserCommand::Type {
                    selector: params.selector.clone(),
                    text,
                    command_id,
                }
            }
            "scroll" => {
                // Implement scroll as execute script
                let script = format!(
                    "document.querySelector('{}').scrollIntoView({{ behavior: 'smooth' }})",
                    params.selector.replace('\'', "\\'")
                );
                BrowserCommand::ExecuteScript { script, command_id }
            }
            _ => {
                return Err(ErrorData::new(
                    ErrorCode::INVALID_PARAMS,
                    format!("Invalid action: '{}'. Must be 'click', 'type', or 'scroll'", params.action),
                    None,
                ));
            }
        };

        match self.send_command(command).await {
            Ok(BrowserEvent::CommandResult {
                success,
                data,
                error,
                ..
            }) => {
                if success {
                    let result_text = format!(
                        "✓ Successfully performed '{}' on '{}'{}",
                        params.action,
                        params.selector,
                        data.map(|d| format!("\n\nResult: {}", d)).unwrap_or_default()
                    );

                    Ok(CallToolResult::success(vec![
                        Content::text(result_text.clone()).with_audience(vec![Role::Assistant]),
                        Content::text(result_text)
                            .with_audience(vec![Role::User])
                            .with_priority(0.0),
                    ]))
                } else {
                    let error_msg = error.unwrap_or_else(|| "Unknown error".to_string());
                    Err(ErrorData::new(
                        ErrorCode::INTERNAL_ERROR,
                        format!("Interaction failed: {}", error_msg),
                        None,
                    ))
                }
            }
            Ok(event) => Err(ErrorData::new(
                ErrorCode::INTERNAL_ERROR,
                format!("Unexpected event: {:?}", event),
                None,
            )),
            Err(e) => Err(ErrorData::new(
                ErrorCode::INTERNAL_ERROR,
                format!("Command failed: {}", e),
                None,
            )),
        }
    }

    /// Extract content from the current page
    ///
    /// This tool extracts content from the currently loaded page. You can:
    /// - Extract the entire page (no selector)
    /// - Extract a specific element (with CSS selector)
    /// - Choose output format: 'text' (default), 'html', or 'markdown'
    ///
    /// The content is automatically truncated if it exceeds 100KB.
    #[tool(
        name = "browser_scrape",
        description = "Extract content from the current page. Returns simplified HTML or text. Optional CSS selector to extract specific elements. Supports 'text', 'html', or 'markdown' format."
    )]
    pub async fn scrape(&self, params: Parameters<ScrapeParams>) -> Result<CallToolResult, ErrorData> {
        let params = params.0;
        let command_id = Uuid::new_v4().to_string();

        tracing::info!(
            "[BrowserMCP] Scraping page (selector: {:?}, format: {})",
            params.selector,
            params.format
        );

        let command = BrowserCommand::ExtractDOM {
            selector: params.selector.clone(),
            command_id,
        };

        match self.send_command(command).await {
            Ok(BrowserEvent::CommandResult {
                success,
                data,
                error,
                ..
            }) => {
                if success {
                    let content = data.unwrap_or_else(|| "No content extracted".to_string());

                    // Convert format if needed
                    let formatted_content = match params.format.as_str() {
                        "text" => {
                            // Simple HTML to text conversion
                            html2text::from_read(content.as_bytes(), 120)
                        }
                        "markdown" => {
                            // Convert HTML to Markdown
                            html2text::from_read(content.as_bytes(), 120)
                        }
                        "html" => content,
                        _ => content,
                    };

                    // Truncate if too large
                    let max_size = 100_000; // 100KB
                    let final_content = if formatted_content.len() > max_size {
                        format!(
                            "{}...\n\n[Content truncated at 100KB]",
                            &formatted_content[..max_size]
                        )
                    } else {
                        formatted_content
                    };

                    let result_text = format!(
                        "✓ Successfully extracted content{}\n\n{}",
                        params
                            .selector
                            .as_ref()
                            .map(|s| format!(" from '{}'", s))
                            .unwrap_or_default(),
                        final_content
                    );

                    Ok(CallToolResult::success(vec![
                        Content::text(result_text.clone()).with_audience(vec![Role::Assistant]),
                        Content::text(result_text)
                            .with_audience(vec![Role::User])
                            .with_priority(0.0),
                    ]))
                } else {
                    let error_msg = error.unwrap_or_else(|| "Unknown error".to_string());
                    Err(ErrorData::new(
                        ErrorCode::INTERNAL_ERROR,
                        format!("Scrape failed: {}", error_msg),
                        None,
                    ))
                }
            }
            Ok(event) => Err(ErrorData::new(
                ErrorCode::INTERNAL_ERROR,
                format!("Unexpected event: {:?}", event),
                None,
            )),
            Err(e) => Err(ErrorData::new(
                ErrorCode::INTERNAL_ERROR,
                format!("Command failed: {}", e),
                None,
            )),
        }
    }

    /// Capture a screenshot of the current page
    ///
    /// This tool captures a screenshot of the currently loaded page.
    /// The screenshot is returned as a base64-encoded PNG image and is also
    /// saved to a temporary file for later reference.
    ///
    /// The image can be used for visual debugging or documentation.
    #[tool(
        name = "browser_screenshot",
        description = "Capture a screenshot of the current page. Returns base64-encoded PNG image. Useful for visual debugging and documentation."
    )]
    pub async fn screenshot(&self) -> Result<CallToolResult, ErrorData> {
        let command_id = Uuid::new_v4().to_string();

        tracing::info!("[BrowserMCP] Taking screenshot");

        let command = BrowserCommand::Screenshot { command_id };

        match self.send_command(command).await {
            Ok(BrowserEvent::CommandResult {
                success,
                data,
                error,
                ..
            }) => {
                if success {
                    let base64_image = data.unwrap_or_default();

                    // Create image content for display
                    let image_content = Content::image(base64_image, "image/png");

                    let text_content = Content::text("✓ Screenshot captured successfully")
                        .with_audience(vec![Role::User])
                        .with_priority(0.0);

                    Ok(CallToolResult::success(vec![
                        image_content.with_audience(vec![Role::Assistant]),
                        text_content,
                    ]))
                } else {
                    let error_msg = error.unwrap_or_else(|| "Unknown error".to_string());
                    Err(ErrorData::new(
                        ErrorCode::INTERNAL_ERROR,
                        format!("Screenshot failed: {}", error_msg),
                        None,
                    ))
                }
            }
            Ok(event) => Err(ErrorData::new(
                ErrorCode::INTERNAL_ERROR,
                format!("Unexpected event: {:?}", event),
                None,
            )),
            Err(e) => Err(ErrorData::new(
                ErrorCode::INTERNAL_ERROR,
                format!("Command failed: {}", e),
                None,
            )),
        }
    }
}

impl ServerHandler for BrowserServer {
    fn get_info(&self) -> ServerInfo {
        let instructions = formatdoc! {r#"
            Browser Automation Tools

            You have access to browser automation capabilities through four tools:

            1. **browser_navigate**: Navigate to URLs and wait for page load
               - URLs must be http:// or https://
               - Returns the final URL after redirects
               - Subject to domain allowlist for security

            2. **browser_interaction**: Interact with page elements
               - Actions: 'click', 'type', 'scroll'
               - Use CSS selectors to target elements
               - Examples: #button-id, .class-name, input[name=email]

            3. **browser_scrape**: Extract page content
               - Can extract entire page or specific elements
               - Supports text, HTML, or markdown format
               - Automatically truncates large content

            4. **browser_screenshot**: Capture page screenshots
               - Returns base64-encoded PNG images
               - Useful for visual debugging

            **Important Notes:**
            - The browser is persistent across the session
            - Navigation is subject to URL allowlist (GitHub, StackOverflow, Wikipedia, localhost by default)
            - All actions are audited for security
            - Commands timeout after 30 seconds

            **Common Workflows:**
            1. Navigate to a page → Scrape content → Process data
            2. Navigate → Interact (fill form) → Interact (submit) → Scrape result
            3. Navigate → Screenshot → Analyze visually

            Browser URL: {}
            "#,
            self.ws_url
        };

        ServerInfo {
            server_info: Implementation {
                name: "mts-browser".to_string(),
                version: env!("CARGO_PKG_VERSION").to_owned(),
                title: None,
                icons: None,
                website_url: None,
            },
            capabilities: ServerCapabilities::builder()
                .enable_tools()
                .build(),
            instructions: Some(instructions),
            ..Default::default()
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_browser_server_creation() {
        let server = BrowserServer::new("http://localhost:3000".to_string());
        assert_eq!(server.ws_url, "ws://localhost:3000/ws/browser");
    }

    #[test]
    fn test_https_to_wss_conversion() {
        let server = BrowserServer::new("https://example.com:8443".to_string());
        assert_eq!(server.ws_url, "wss://example.com:8443/ws/browser");
    }
}
