use std::collections::HashMap;
use std::sync::atomic::{AtomicI64, AtomicU8, Ordering};
use std::sync::Arc;
use std::time::{SystemTime, UNIX_EPOCH};
use tokio::sync::{broadcast, RwLock};
use tokio_util::sync::CancellationToken;

use crate::routes::reply::MessageEvent;

/// Status of a background task
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
#[repr(u8)]
pub enum TaskStatus {
    Running = 0,
    Completed = 1,
    Error = 2,
    Cancelled = 3,
}

impl From<u8> for TaskStatus {
    fn from(value: u8) -> Self {
        match value {
            0 => TaskStatus::Running,
            1 => TaskStatus::Completed,
            2 => TaskStatus::Error,
            3 => TaskStatus::Cancelled,
            _ => TaskStatus::Running,
        }
    }
}

/// Handle to a running background task
struct TaskHandle {
    cancel_token: CancellationToken,
    status: AtomicU8,
    last_activity: AtomicI64,
    broadcaster: broadcast::Sender<MessageEvent>,
}

impl TaskHandle {
    fn new(cancel_token: CancellationToken) -> Self {
        let (broadcaster, _) = broadcast::channel(100);
        Self {
            cancel_token,
            status: AtomicU8::new(TaskStatus::Running as u8),
            last_activity: AtomicI64::new(current_timestamp()),
            broadcaster,
        }
    }

    fn update_activity(&self) {
        self.last_activity
            .store(current_timestamp(), Ordering::SeqCst);
    }

    fn set_status(&self, status: TaskStatus) {
        self.status.store(status as u8, Ordering::SeqCst);
    }

    fn get_status(&self) -> TaskStatus {
        self.status.load(Ordering::SeqCst).into()
    }
}

fn current_timestamp() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as i64
}

/// Response for task status queries
#[derive(Debug, Clone, serde::Serialize, utoipa::ToSchema)]
pub struct TaskStatusResponse {
    pub session_id: String,
    pub status: String,
    pub last_activity_ms: i64,
    pub has_subscribers: bool,
}

/// Manages background agent tasks that continue running when clients disconnect
pub struct BackgroundTaskManager {
    tasks: RwLock<HashMap<String, Arc<TaskHandle>>>,
}

impl Default for BackgroundTaskManager {
    fn default() -> Self {
        Self::new()
    }
}

impl BackgroundTaskManager {
    pub fn new() -> Self {
        Self {
            tasks: RwLock::new(HashMap::new()),
        }
    }

    /// Register a new background task for a session
    /// Returns a sender for broadcasting events to subscribers
    pub async fn register_task(
        &self,
        session_id: String,
        cancel_token: CancellationToken,
    ) -> broadcast::Sender<MessageEvent> {
        let handle = Arc::new(TaskHandle::new(cancel_token));
        let broadcaster = handle.broadcaster.clone();

        let mut tasks = self.tasks.write().await;
        // Cancel any existing task for this session
        if let Some(old_handle) = tasks.remove(&session_id) {
            old_handle.cancel_token.cancel();
        }
        tasks.insert(session_id, handle);

        broadcaster
    }

    /// Subscribe to updates from a running task
    /// Returns None if no task is running for this session
    pub async fn subscribe(&self, session_id: &str) -> Option<broadcast::Receiver<MessageEvent>> {
        let tasks = self.tasks.read().await;
        tasks.get(session_id).map(|handle| {
            handle.update_activity();
            handle.broadcaster.subscribe()
        })
    }

    /// Get the status of a task
    pub async fn get_status(&self, session_id: &str) -> Option<TaskStatusResponse> {
        let tasks = self.tasks.read().await;
        tasks.get(session_id).map(|handle| TaskStatusResponse {
            session_id: session_id.to_string(),
            status: format!("{:?}", handle.get_status()),
            last_activity_ms: handle.last_activity.load(Ordering::SeqCst),
            has_subscribers: handle.broadcaster.receiver_count() > 0,
        })
    }

    /// Check if a task is running for a session
    pub async fn is_running(&self, session_id: &str) -> bool {
        let tasks = self.tasks.read().await;
        tasks
            .get(session_id)
            .is_some_and(|h| h.get_status() == TaskStatus::Running)
    }

    /// Mark a task as completed
    pub async fn mark_completed(&self, session_id: &str) {
        let tasks = self.tasks.read().await;
        if let Some(handle) = tasks.get(session_id) {
            handle.set_status(TaskStatus::Completed);
            handle.update_activity();
        }
    }

    /// Mark a task as errored
    pub async fn mark_error(&self, session_id: &str) {
        let tasks = self.tasks.read().await;
        if let Some(handle) = tasks.get(session_id) {
            handle.set_status(TaskStatus::Error);
            handle.update_activity();
        }
    }

    /// Cancel a running task
    pub async fn cancel_task(&self, session_id: &str) -> bool {
        let tasks = self.tasks.read().await;
        if let Some(handle) = tasks.get(session_id) {
            handle.cancel_token.cancel();
            handle.set_status(TaskStatus::Cancelled);
            true
        } else {
            false
        }
    }

    /// Update activity timestamp for a task
    pub async fn update_activity(&self, session_id: &str) {
        let tasks = self.tasks.read().await;
        if let Some(handle) = tasks.get(session_id) {
            handle.update_activity();
        }
    }

    /// Remove a completed/cancelled task from tracking
    /// Should be called after task finishes and all subscribers have disconnected
    pub async fn cleanup_task(&self, session_id: &str) {
        let mut tasks = self.tasks.write().await;
        if let Some(handle) = tasks.get(session_id) {
            // Only cleanup if task is not running and has no subscribers
            if handle.get_status() != TaskStatus::Running
                && handle.broadcaster.receiver_count() == 0
            {
                tasks.remove(session_id);
            }
        }
    }

    /// Get all running sessions
    pub async fn running_sessions(&self) -> Vec<String> {
        let tasks = self.tasks.read().await;
        tasks
            .iter()
            .filter(|(_, h)| h.get_status() == TaskStatus::Running)
            .map(|(id, _)| id.clone())
            .collect()
    }
}
