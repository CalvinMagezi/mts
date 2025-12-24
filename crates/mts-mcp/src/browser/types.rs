use rmcp::schemars::JsonSchema;
use serde::{Deserialize, Serialize};

/// Parameters for the browser_navigate tool
#[derive(Debug, Serialize, Deserialize, JsonSchema)]
pub struct NavigateParams {
    /// The URL to navigate to (must be http:// or https://)
    pub url: String,
}

/// Parameters for the browser_interaction tool
#[derive(Debug, Serialize, Deserialize, JsonSchema)]
pub struct InteractionParams {
    /// Action type: 'click', 'type', or 'scroll'
    pub action: String,

    /// CSS selector for the target element
    pub selector: String,

    /// Value to type (required for 'type' action)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub value: Option<String>,
}

/// Parameters for the browser_scrape tool
#[derive(Debug, Serialize, Deserialize, JsonSchema)]
pub struct ScrapeParams {
    /// CSS selector to extract (optional, defaults to body)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub selector: Option<String>,

    /// Output format: 'text', 'html', or 'markdown' (default: 'text')
    #[serde(default = "default_format")]
    pub format: String,
}

fn default_format() -> String {
    "text".to_string()
}
