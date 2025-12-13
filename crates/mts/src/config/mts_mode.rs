use std::str::FromStr;

use serde::{Deserialize, Serialize};

#[derive(Copy, Clone, Debug, Eq, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum MtsMode {
    Auto,
    Approve,
    SmartApprove,
    Chat,
}

impl FromStr for MtsMode {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "auto" => Ok(MtsMode::Auto),
            "approve" => Ok(MtsMode::Approve),
            "smart_approve" => Ok(MtsMode::SmartApprove),
            "chat" => Ok(MtsMode::Chat),
            _ => Err(format!("invalid mode: {}", s)),
        }
    }
}
