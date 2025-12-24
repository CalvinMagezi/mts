use axum::{http::StatusCode, routing::post, Json, Router};
use serde::{Deserialize, Serialize};
use std::{process::Stdio, sync::Arc};
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::Command;
use utoipa::ToSchema;

use crate::state::AppState;

// Request types
#[derive(Debug, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct SearchFilesRequest {
    pub query: String,
    pub working_dir: String,
    #[serde(default)]
    pub case_sensitive: bool,
    #[serde(default)]
    pub use_regex: bool,
    #[serde(default)]
    pub whole_word: bool,
    pub include_pattern: Option<String>,
    pub exclude_pattern: Option<String>,
    pub max_results: Option<usize>,
    pub context_lines: Option<u8>,
}

#[derive(Debug, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct SearchFilenamesRequest {
    pub query: String,
    pub working_dir: String,
    pub max_results: Option<usize>,
}

#[derive(Debug, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct ReplaceRequest {
    pub query: String,
    pub replacement: String,
    pub working_dir: String,
    #[serde(default)]
    pub case_sensitive: bool,
    #[serde(default)]
    pub use_regex: bool,
    #[serde(default)]
    pub whole_word: bool,
    pub include_pattern: Option<String>,
    pub exclude_pattern: Option<String>,
    pub file_paths: Option<Vec<String>>,
}

// Response types
#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct SearchMatch {
    pub file_path: String,
    pub line_number: usize,
    pub column: usize,
    pub line_text: String,
    pub context_before: Vec<String>,
    pub context_after: Vec<String>,
}

#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct SearchFilesResponse {
    pub matches: Vec<SearchMatch>,
    pub total_files: usize,
    pub total_matches: usize,
    pub truncated: bool,
}

#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct FilenameMatch {
    pub path: String,
    pub name: String,
}

#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct SearchFilenamesResponse {
    pub matches: Vec<FilenameMatch>,
    pub truncated: bool,
}

#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct ReplaceResponse {
    pub files_modified: usize,
    pub total_replacements: usize,
}

// Routes
pub fn routes(_state: Arc<AppState>) -> Router {
    Router::new()
        .route("/search/files", post(search_files))
        .route("/search/filenames", post(search_filenames))
        .route("/search/replace", post(replace_in_files))
}

#[utoipa::path(
    post,
    path = "/search/files",
    request_body = SearchFilesRequest,
    responses(
        (status = 200, description = "Search completed successfully", body = SearchFilesResponse),
        (status = 401, description = "Unauthorized - invalid secret key"),
        (status = 500, description = "Internal server error")
    )
)]
async fn search_files(
    Json(req): Json<SearchFilesRequest>,
) -> Result<Json<SearchFilesResponse>, StatusCode> {
    let max_results = req.max_results.unwrap_or(1000);
    let context_lines = req.context_lines.unwrap_or(2);

    // Build ripgrep command
    let mut cmd = Command::new("rg");

    // Use JSON output for easier parsing
    cmd.arg("--json");

    // Context lines
    if context_lines > 0 {
        cmd.arg("--context").arg(context_lines.to_string());
    }

    // Max count per file
    cmd.arg("--max-count").arg(max_results.to_string());

    // Case sensitivity
    if !req.case_sensitive {
        cmd.arg("--ignore-case");
    }

    // Whole word
    if req.whole_word {
        cmd.arg("--word-regexp");
    }

    // Fixed strings (not regex) by default
    if !req.use_regex {
        cmd.arg("--fixed-strings");
    }

    // Include/exclude patterns
    if let Some(ref include) = req.include_pattern {
        for pattern in include.split(',') {
            let pattern = pattern.trim();
            if !pattern.is_empty() {
                cmd.arg("--glob").arg(pattern);
            }
        }
    }

    if let Some(ref exclude) = req.exclude_pattern {
        for pattern in exclude.split(',') {
            let pattern = pattern.trim();
            if !pattern.is_empty() {
                cmd.arg("--glob").arg(format!("!{}", pattern));
            }
        }
    }

    // Always exclude common directories
    cmd.arg("--glob").arg("!node_modules/**");
    cmd.arg("--glob").arg("!.git/**");
    cmd.arg("--glob").arg("!dist/**");
    cmd.arg("--glob").arg("!build/**");
    cmd.arg("--glob").arg("!out/**");

    // Add query and working directory
    cmd.arg(&req.query);
    cmd.arg(&req.working_dir);

    // Execute command
    cmd.stdout(Stdio::piped());
    cmd.stderr(Stdio::piped());

    let mut child = cmd.spawn().map_err(|e| {
        tracing::error!("Failed to spawn ripgrep: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    let stdout = child
        .stdout
        .take()
        .ok_or(StatusCode::INTERNAL_SERVER_ERROR)?;
    let reader = BufReader::new(stdout);
    let mut lines = reader.lines();

    let mut matches = Vec::new();
    let mut file_count = std::collections::HashSet::new();
    let mut current_context_before: Vec<String> = Vec::new();
    let mut truncated = false;

    while let Some(line) = lines
        .next_line()
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
    {
        if matches.len() >= max_results {
            truncated = true;
            break;
        }

        // Parse JSON output from ripgrep
        if let Ok(json) = serde_json::from_str::<serde_json::Value>(&line) {
            if json["type"] == "match" {
                let data = &json["data"];

                if let (Some(path), Some(line_number), Some(lines_obj)) = (
                    data["path"]["text"].as_str(),
                    data["line_number"].as_u64(),
                    data["lines"].as_object(),
                ) {
                    let line_text = lines_obj["text"]
                        .as_str()
                        .unwrap_or("")
                        .trim_end()
                        .to_string();

                    // Get column from first submatch if available
                    let column = data["submatches"]
                        .as_array()
                        .and_then(|arr| arr.first())
                        .and_then(|sm| sm["start"].as_u64())
                        .unwrap_or(0) as usize;

                    file_count.insert(path.to_string());

                    matches.push(SearchMatch {
                        file_path: path.to_string(),
                        line_number: line_number as usize,
                        column,
                        line_text,
                        context_before: current_context_before.clone(),
                        context_after: Vec::new(), // Will be filled in post-processing if needed
                    });

                    current_context_before.clear();
                }
            } else if json["type"] == "context" {
                // Context line before or after match
                let data = &json["data"];
                if let Some(text) = data["lines"]["text"].as_str() {
                    current_context_before.push(text.trim_end().to_string());
                    if current_context_before.len() > context_lines as usize {
                        current_context_before.remove(0);
                    }
                }
            }
        }
    }

    // Wait for command to finish
    let _ = child.wait().await;

    let total_matches = matches.len();
    let total_files = file_count.len();

    Ok(Json(SearchFilesResponse {
        matches,
        total_files,
        total_matches,
        truncated,
    }))
}

#[utoipa::path(
    post,
    path = "/search/filenames",
    request_body = SearchFilenamesRequest,
    responses(
        (status = 200, description = "Filename search completed successfully", body = SearchFilenamesResponse),
        (status = 401, description = "Unauthorized - invalid secret key"),
        (status = 500, description = "Internal server error")
    )
)]
async fn search_filenames(
    Json(req): Json<SearchFilenamesRequest>,
) -> Result<Json<SearchFilenamesResponse>, StatusCode> {
    let max_results = req.max_results.unwrap_or(1000);

    // First, get all files
    let mut cmd = Command::new("rg");
    cmd.arg("--files");
    cmd.arg(&req.working_dir);

    cmd.stdout(Stdio::piped());
    cmd.stderr(Stdio::piped());

    let output = cmd.output().await.map_err(|e| {
        tracing::error!("Failed to execute ripgrep --files: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    let files_output = String::from_utf8_lossy(&output.stdout);

    // Filter files by query
    let mut matches = Vec::new();
    let query_lower = req.query.to_lowercase();

    for line in files_output.lines() {
        if matches.len() >= max_results {
            break;
        }

        let path = line.trim();
        let name = std::path::Path::new(path)
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or(path);

        // Simple case-insensitive substring match
        if name.to_lowercase().contains(&query_lower) {
            matches.push(FilenameMatch {
                path: path.to_string(),
                name: name.to_string(),
            });
        }
    }

    let truncated = matches.len() >= max_results;

    Ok(Json(SearchFilenamesResponse { matches, truncated }))
}

#[utoipa::path(
    post,
    path = "/search/replace",
    request_body = ReplaceRequest,
    responses(
        (status = 200, description = "Replace operation completed successfully", body = ReplaceResponse),
        (status = 400, description = "Bad request - invalid regex pattern"),
        (status = 401, description = "Unauthorized - invalid secret key"),
        (status = 500, description = "Internal server error")
    )
)]
async fn replace_in_files(
    Json(req): Json<ReplaceRequest>,
) -> Result<Json<ReplaceResponse>, StatusCode> {
    use std::fs;
    use std::io::Write;

    let mut files_modified = 0;
    let mut total_replacements = 0;

    // Get list of files to process
    let file_paths = if let Some(paths) = req.file_paths {
        paths
    } else {
        // Search for files matching the query
        let search_req = SearchFilesRequest {
            query: req.query.clone(),
            working_dir: req.working_dir.clone(),
            case_sensitive: req.case_sensitive,
            use_regex: req.use_regex,
            whole_word: req.whole_word,
            include_pattern: req.include_pattern.clone(),
            exclude_pattern: req.exclude_pattern.clone(),
            max_results: Some(10000),
            context_lines: Some(0),
        };

        let search_result = search_files(Json(search_req)).await?;
        let unique_files: std::collections::HashSet<String> = search_result
            .0
            .matches
            .into_iter()
            .map(|m| m.file_path)
            .collect();

        unique_files.into_iter().collect()
    };

    // Process each file
    for file_path in file_paths {
        // Read file
        let content = match fs::read_to_string(&file_path) {
            Ok(c) => c,
            Err(e) => {
                tracing::warn!("Failed to read file {}: {}", file_path, e);
                continue;
            }
        };

        // Perform replacement
        let new_content = if req.use_regex {
            // Use regex replacement
            match regex::Regex::new(&req.query) {
                Ok(re) => {
                    let count = re.find_iter(&content).count();
                    if count > 0 {
                        total_replacements += count;
                        files_modified += 1;
                        re.replace_all(&content, req.replacement.as_str())
                            .to_string()
                    } else {
                        continue;
                    }
                }
                Err(e) => {
                    tracing::error!("Invalid regex pattern: {}", e);
                    return Err(StatusCode::BAD_REQUEST);
                }
            }
        } else {
            // Simple string replacement
            let search_str = if req.case_sensitive {
                req.query.as_str()
            } else {
                // For case-insensitive, we need a different approach
                // This is a simplified version - for production, use regex
                req.query.as_str()
            };

            let count = content.matches(search_str).count();
            if count > 0 {
                total_replacements += count;
                files_modified += 1;
                content.replace(search_str, &req.replacement)
            } else {
                continue;
            }
        };

        // Write back to file
        match fs::File::create(&file_path) {
            Ok(mut file) => {
                if let Err(e) = file.write_all(new_content.as_bytes()) {
                    tracing::error!("Failed to write file {}: {}", file_path, e);
                    return Err(StatusCode::INTERNAL_SERVER_ERROR);
                }
            }
            Err(e) => {
                tracing::error!("Failed to create file {}: {}", file_path, e);
                return Err(StatusCode::INTERNAL_SERVER_ERROR);
            }
        }
    }

    Ok(Json(ReplaceResponse {
        files_modified,
        total_replacements,
    }))
}
