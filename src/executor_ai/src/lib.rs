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
pub struct OrganMatch {
    pub donor_id: String,
    pub recipient_id: String,
    pub organ_type: String,
    pub match_score: f64,
    pub blood_type_compatible: bool,
    pub tissue_match: f64,
    pub distance_km: f64,
    pub urgency_score: f64,
}

#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct OrganReferral {
    pub id: String,
    pub patient_id: String,
    pub organs: Vec<String>,
    pub destination: String,
    pub priority: String,
    pub match_probability: Option<f64>,
    pub transport_deadline: u64,
    pub created_at: u64,
}

#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct DataReleaseRequest {
    pub request_id: String,
    pub patient_id: String,
    pub researcher_id: String,
    pub institution: String,
    pub data_types: Vec<String>,
    pub anonymization_level: String,
    pub consent_verified: bool,
    pub approved: bool,
}

#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct ExecutionResult {
    pub patient_id: String,
    pub actions_completed: Vec<String>,
    pub organ_referrals_created: u32,
    pub data_releases_prepared: u32,
    pub total_execution_time_ms: u64,
}

// ==================== STORAGE ====================

thread_local! {
    static MEMORY_MANAGER: RefCell<MemoryManager<DefaultMemoryImpl>> = 
        RefCell::new(MemoryManager::init(DefaultMemoryImpl::default()));

    static ORGAN_REFERRALS: RefCell<StableBTreeMap<String, OrganReferral, Memory>> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(0)))
        )
    );

    static DATA_RELEASES: RefCell<StableBTreeMap<String, DataReleaseRequest, Memory>> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(1)))
        )
    );

    static ORGAN_MATCHES: RefCell<StableBTreeMap<String, OrganMatch, Memory>> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(2)))
        )
    );
}

// ==================== ORGAN DONATION COORDINATION ====================

#[update]
async fn coordinate_organ_donation(patient_id: String, organs: Vec<String>) -> OrganReferral {
    let current_time = time();
    let referral_id = format!("ref_{}_{}", patient_id, current_time);
    
    // Calculate match probability using AI prediction
    let match_probability = calculate_match_probability(&organs).await;
    
    // Determine transport deadline (organs have limited viability)
    let transport_deadline = current_time + get_organ_viability_window(&organs);
    
    let referral = OrganReferral {
        id: referral_id.clone(),
        patient_id: patient_id.clone(),
        organs: organs.clone(),
        destination: "OPO_Region5".to_string(), // Determined by location/availability
        priority: if match_probability > 0.8 { "urgent".to_string() } else { "high".to_string() },
        match_probability: Some(match_probability),
        transport_deadline,
        created_at: current_time,
    };
    
    ORGAN_REFERRALS.with(|store| {
        store.borrow_mut().insert(referral_id.clone(), referral.clone());
    });
    
    // In production: Notify OPO via external API call
    // notify_opo(&referral).await;
    
    referral
}

async fn calculate_match_probability(organs: &Vec<String>) -> f64 {
    // AI-powered match prediction (simulated)
    // In production: Call LLM canister or external matching service
    
    let mut total_probability = 0.0;
    
    for organ in organs {
        let organ_probability = match organ.as_str() {
            "heart" => 0.75, // Hearts are harder to match
            "kidney" => 0.90, // Kidneys have higher success rates
            "liver" => 0.82,
            "lungs" => 0.68,
            "corneas" => 0.95, // Very high success rate
            _ => 0.70,
        };
        total_probability += organ_probability;
    }
    
    total_probability / organs.len() as f64
}

fn get_organ_viability_window(organs: &Vec<String>) -> u64 {
    // Return the shortest viability window among all organs (in nanoseconds)
    let mut shortest_window = u64::MAX;
    
    for organ in organs {
        let window_hours = match organ.as_str() {
            "heart" => 4,      // 4 hours
            "liver" => 12,     // 12 hours  
            "kidney" => 36,    // 36 hours
            "lungs" => 6,      // 6 hours
            "corneas" => 168,  // 7 days
            _ => 12,           // Default 12 hours
        };
        
        let window_ns = (window_hours * 60 * 60 * 1_000_000_000) as u64;
        if window_ns < shortest_window {
            shortest_window = window_ns;
        }
    }
    
    shortest_window
}

// ==================== DATA SHARING & RESEARCH ====================

#[update]
async fn process_data_release_request(
    patient_id: String,
    researcher_id: String,
    institution: String,
    data_types: Vec<String>
) -> DataReleaseRequest {
    let current_time = time();
    let request_id = format!("data_{}_{}", patient_id, current_time);
    
    // Check patient consent (would call directive_manager canister)
    let consent_verified = verify_data_consent(&patient_id, &institution).await;
    
    let request = DataReleaseRequest {
        request_id: request_id.clone(),
        patient_id,
        researcher_id,
        institution,
        data_types,
        anonymization_level: "PHI_REDACTED".to_string(),
        consent_verified,
        approved: consent_verified, // Auto-approve if consent is verified
    };
    
    DATA_RELEASES.with(|store| {
        store.borrow_mut().insert(request_id, request.clone());
    });
    
    request
}

async fn verify_data_consent(patient_id: &str, institution: &str) -> bool {
    // In production: Call directive_manager canister to check consent
    // let directive_manager = Principal::from_text("directive-manager-id").unwrap();
    // let result: (Option<PatientDirective>,) = ic_cdk::call(
    //     directive_manager, 
    //     "get_patient_directive", 
    //     (patient_id,)
    // ).await.unwrap();
    
    // For simulation: return true for certain institutions
    institution == "ALL_RESEARCH" || institution.contains("CANCER")
}

// ==================== AUTONOMOUS EXECUTION ====================

#[update]
async fn execute_death_directives_ai(patient_id: String) -> ExecutionResult {
    let start_time = time();
    let mut actions_completed = Vec::new();
    let mut organ_referrals_created = 0;
    let mut data_releases_prepared = 0;
    
    // Step 1: Get patient directives (would call directive_manager)
    // For simulation, assume we have organ donation and data consent
    
    // Step 2: Coordinate organ donation
    let organs = vec!["heart".to_string(), "kidney".to_string()]; // Simulated
    if !organs.is_empty() {
        let referral = coordinate_organ_donation(patient_id.clone(), organs).await;
        actions_completed.push(format!("Organ referral created: {}", referral.id));
        organ_referrals_created += 1;
    }
    
    // Step 3: Prepare data for research
    let data_request = process_data_release_request(
        patient_id.clone(),
        "research_ai".to_string(),
        "ALL_CANCER_RESEARCH".to_string(),
        vec!["tumor_biomarkers".to_string(), "treatment_history".to_string()]
    ).await;
    
    if data_request.approved {
        actions_completed.push(format!("Data release prepared: {}", data_request.request_id));
        data_releases_prepared += 1;
    }
    
    // Step 4: Generate predictive insights
    let insights = generate_predictive_insights(&patient_id).await;
    actions_completed.push(format!("Predictive insights generated: {}", insights));
    
    let end_time = time();
    
    ExecutionResult {
        patient_id,
        actions_completed,
        organ_referrals_created,
        data_releases_prepared,
        total_execution_time_ms: (end_time - start_time) / 1_000_000, // Convert to milliseconds
    }
}

async fn generate_predictive_insights(patient_id: &str) -> String {
    // AI-powered insights for improving donation success rates
    // In production: Use LLM canister for analysis
    format!("Patient {} organ viability: 87% | Recommended transport window: 6 hours", patient_id)
}

// ==================== QUERY FUNCTIONS ====================

#[query]
fn get_organ_referrals(limit: usize) -> Vec<OrganReferral> {
    ORGAN_REFERRALS.with(|store| {
        let mut referrals: Vec<_> = store.borrow()
            .iter()
            .map(|(_, referral)| referral)
            .collect();
        
        referrals.sort_by(|a, b| b.created_at.cmp(&a.created_at));
        referrals.into_iter().take(limit).collect()
    })
}

#[query]
fn get_data_releases(limit: usize) -> Vec<DataReleaseRequest> {
    DATA_RELEASES.with(|store| {
        let mut releases: Vec<_> = store.borrow()
            .iter()
            .map(|(_, release)| release)
            .collect();
        
        releases.sort_by_key(|r| r.request_id.clone());
        releases.into_iter().take(limit).collect()
    })
}

#[query]
fn get_organ_matches(organ_type: String) -> Vec<OrganMatch> {
    ORGAN_MATCHES.with(|store| {
        store.borrow()
            .iter()
            .filter_map(|(_, organ_match)| {
                if organ_match.organ_type == organ_type {
                    Some(organ_match)
                } else {
                    None
                }
            })
            .collect()
    })
}

// ==================== SYSTEM FUNCTIONS ====================

#[init]
fn init() {
    ic_cdk::println!("Executor AI canister initialized");
}

#[pre_upgrade]
fn pre_upgrade() {
    // Data preserved in stable storage
}

#[post_upgrade]
fn post_upgrade() {
    ic_cdk::println!("Executor AI canister upgraded");
}

// Export Candid interface
ic_cdk::export_candid!();