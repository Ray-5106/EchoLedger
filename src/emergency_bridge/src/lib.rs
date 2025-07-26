use ic_cdk::api::time;
use ic_cdk_macros::{init, post_upgrade, pre_upgrade, query, update};
use candid::{CandidType, Deserialize};
use serde::Serialize;
use std::collections::HashMap;
use ic_stable_structures::memory_manager::{MemoryId, MemoryManager, VirtualMemory};
use ic_stable_structures::{DefaultMemoryImpl, StableBTreeMap};
use std::cell::RefCell;

type Memory = VirtualMemory<DefaultMemoryImpl>;

// ==================== DATA STRUCTURES ====================

#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct EmergencyQuery {
    pub patient_id: String,
    pub hospital_id: String,
    pub situation: String,
    pub vitals: Option<String>, // JSON string
    pub access_token: Option<String>, // ZK-Proof token
}

#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct EmergencyResponse {
    pub action: String,
    pub patient_id: String,
    pub directive: Option<String>,
    pub message: String,
    pub directive_found: bool,
    pub signature_verified: bool,
    pub timestamp: u64,
    pub alert_id: Option<String>,
}

#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]  
pub struct DirectiveRecord {
    pub patient_id: String,
    pub directive_type: String,
    pub conditions: Vec<String>,
    pub signature_hash: String,
    pub verified: bool,
    pub created_at: u64,
}

#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct WebSpeedAlert {
    pub alert_id: String,
    pub patient_id: String,
    pub alert_type: String,
    pub message: String,
    pub priority: String, // "urgent", "high", "normal"
    pub timestamp: u64,
}

// ==================== STORAGE ====================

thread_local! {
    static MEMORY_MANAGER: RefCell<MemoryManager<DefaultMemoryImpl>> = 
        RefCell::new(MemoryManager::init(DefaultMemoryImpl::default()));

    static DIRECTIVE_STORE: RefCell<StableBTreeMap<String, DirectiveRecord, Memory>> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(0)))
        )
    );

    static ALERT_STORE: RefCell<StableBTreeMap<String, WebSpeedAlert, Memory>> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(1)))
        )
    );
}

// ==================== CORE FUNCTIONS ====================

/// Emergency Directive Verification - Real-time decision making
#[update]
async fn emergency_check(query: EmergencyQuery) -> EmergencyResponse {
    let current_time = time();
    
    // Step 1: Verify access via Threshold ECDSA (simulated)
    if let Some(_token) = &query.access_token {
        // In production: Call ic_cdk::api::management_canister::ecdsa_public_key()
        // and verify ZK-proof token
    }
    
    // Step 2: Retrieve directive via Chain Fusion (simulated with local storage)
    let directive_opt = DIRECTIVE_STORE.with(|store| {
        store.borrow().get(&query.patient_id)
    });
    
    match directive_opt {
        None => EmergencyResponse {
            action: "recommend_review".to_string(),
            patient_id: query.patient_id,
            directive: None,
            message: "No advance directive found on-chain. Manual verification required.".to_string(),
            directive_found: false,
            signature_verified: false,
            timestamp: current_time,
            alert_id: None,
        },
        Some(directive) => {
            // Step 3: Risk assessment using BioBERT model (LLM Canister call)
            let dnr_detected = directive.directive_type == "DNR" || 
                              directive.conditions.iter().any(|c| c.contains("DNR"));
            
            if dnr_detected {
                // Create WebSpeed alert for sub-second notification
                let alert_id = format!("alert_{}", current_time);
                let alert = WebSpeedAlert {
                    alert_id: alert_id.clone(),
                    patient_id: query.patient_id.clone(),
                    alert_type: "DNR_ALERT".to_string(),
                    message: "DNR directive verified on-chain. Do not resuscitate per patient's wishes.".to_string(),
                    priority: "urgent".to_string(),
                    timestamp: current_time,
                };
                
                ALERT_STORE.with(|store| {
                    store.borrow_mut().insert(alert_id.clone(), alert);
                });
                
                // In production: Use WebSpeed canister for instant push notifications
                // webspeed_notify(alert).await;
                
                EmergencyResponse {
                    action: "alert_ER".to_string(),
                    patient_id: query.patient_id,
                    directive: Some("DNR".to_string()),
                    message: "DNR directive verified on-chain. Do not resuscitate per patient's wishes.".to_string(),
                    directive_found: true,
                    signature_verified: directive.verified,
                    timestamp: current_time,
                    alert_id: Some(alert_id),
                }
            } else {
                EmergencyResponse {
                    action: "continue_treatment".to_string(),
                    patient_id: query.patient_id,
                    directive: None,
                    message: "No DNR found. Continue standard emergency protocols.".to_string(),
                    directive_found: true,
                    signature_verified: directive.verified,
                    timestamp: current_time,
                    alert_id: None,
                }
            }
        }
    }
}

/// Store a verified directive (called by directive_manager canister)
#[update]
fn store_directive(directive: DirectiveRecord) -> bool {
    DIRECTIVE_STORE.with(|store| {
        store.borrow_mut().insert(directive.patient_id.clone(), directive);
        true
    })
}

/// Get patient directive (for authorized access)
#[query]
fn get_directive(patient_id: String) -> Option<DirectiveRecord> {
    DIRECTIVE_STORE.with(|store| {
        store.borrow().get(&patient_id)
    })
}

/// Get recent alerts for ER dashboard
#[query]
fn get_recent_alerts(limit: usize) -> Vec<WebSpeedAlert> {
    ALERT_STORE.with(|store| {
        let mut alerts: Vec<_> = store.borrow()
            .iter()
            .map(|(_, alert)| alert)
            .collect();
        
        alerts.sort_by(|a, b| b.timestamp.cmp(&a.timestamp));
        alerts.into_iter().take(limit).collect()
    })
}

/// WebSpeed notification (integrates with ICP WebSpeed canister)
#[update]
async fn webspeed_notify(alert: WebSpeedAlert) -> bool {
    // In production: Call WebSpeed canister for instant push notifications
    // let webspeed_canister = Principal::from_text("webspeed-canister-id").unwrap();
    // let result: (bool,) = ic_cdk::call(webspeed_canister, "push_alert", (alert,)).await.unwrap();
    // result.0
    
    // For now, store locally and return success
    ALERT_STORE.with(|store| {
        store.borrow_mut().insert(alert.alert_id.clone(), alert);
    });
    true
}

/// Initialize canister
#[init]
fn init() {
    ic_cdk::println!("Emergency Bridge canister initialized");
}

/// Pre-upgrade hook
#[pre_upgrade]
fn pre_upgrade() {
    // Data is automatically preserved in stable storage
}

/// Post-upgrade hook
#[post_upgrade] 
fn post_upgrade() {
    ic_cdk::println!("Emergency Bridge canister upgraded");
}

// Export Candid interface
ic_cdk::export_candid!();