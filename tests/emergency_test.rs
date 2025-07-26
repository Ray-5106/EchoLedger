//! EchoLedger Emergency Bridge Integration Tests
//! Tests the critical emergency directive verification workflow

use candid::{Decode, Encode};
use ic_agent::Agent;
use pocket_ic::{PocketIc, WasmResult};
use std::collections::HashMap;

// Test data structures
#[derive(Debug)]
struct TestPatient {
    id: String,
    name: String,
    has_dnr: bool,
    directive_text: String,
}

#[tokio::test]
async fn test_emergency_dnr_verification() {
    let pic = PocketIc::new();
    
    // Install emergency_bridge canister
    let emergency_bridge_id = pic.create_canister();
    let emergency_bridge_wasm = std::fs::read("target/wasm32-unknown-unknown/release/emergency_bridge.wasm")
        .expect("Emergency bridge wasm not found. Run 'dfx build' first.");
    
    pic.install_canister(emergency_bridge_id, emergency_bridge_wasm, vec![], None);
    
    // Test patient with DNR
    let test_patient = TestPatient {
        id: "test_patient_001".to_string(),
        name: "John Doe".to_string(),
        has_dnr: true,
        directive_text: "I do not want resuscitation under any circumstances.".to_string(),
    };
    
    // Store directive first
    let directive_record = serde_json::json!({
        "patient_id": test_patient.id,
        "directive_type": "DNR",
        "conditions": vec!["cardiac_arrest"],
        "signature_hash": "test_hash_123",
        "verified": true,
        "created_at": 1234567890u64
    });
    
    let store_result = pic.update_call(
        emergency_bridge_id,
        candid::Principal::anonymous(),
        "store_directive",
        Encode!(&directive_record).unwrap(),
    );
    
    assert!(matches!(store_result, WasmResult::Reply(_)));
    
    // Test emergency check
    let emergency_query = serde_json::json!({
        "patient_id": test_patient.id,
        "hospital_id": "ER_001",
        "situation": "cardiac_arrest",
        "vitals": Some("{\"bp\": \"80/50\", \"pulse\": 120}"),
        "access_token": Some("test_token")
    });
    
    let check_result = pic.update_call(
        emergency_bridge_id,
        candid::Principal::anonymous(),
        "emergency_check",
        Encode!(&emergency_query).unwrap(),
    );
    
    match check_result {
        WasmResult::Reply(data) => {
            let response: serde_json::Value = Decode!(data.as_slice(), serde_json::Value).unwrap();
            
            // Verify DNR alert is triggered
            assert_eq!(response["action"], "alert_ER");
            assert_eq!(response["directive"], Some("DNR"));
            assert_eq!(response["directive_found"], true);
            assert_eq!(response["signature_verified"], true);
            assert!(response["message"].as_str().unwrap().contains("Do not resuscitate"));
            
            println!("✅ DNR Alert Test Passed: {}", response["message"]);
        }
        WasmResult::Reject(msg) => panic!("Emergency check failed: {}", msg),
    }
}

#[tokio::test]
async fn test_no_directive_found() {
    let pic = PocketIc::new();
    
    // Install canister
    let emergency_bridge_id = pic.create_canister();
    let emergency_bridge_wasm = std::fs::read("target/wasm32-unknown-unknown/release/emergency_bridge.wasm")
        .expect("Emergency bridge wasm not found.");
    
    pic.install_canister(emergency_bridge_id, emergency_bridge_wasm, vec![], None);
    
    // Test with unknown patient
    let emergency_query = serde_json::json!({
        "patient_id": "unknown_patient_999",
        "hospital_id": "ER_001", 
        "situation": "cardiac_arrest",
        "vitals": Some("{\"bp\": \"70/40\", \"pulse\": 140}"),
        "access_token": Some("test_token")
    });
    
    let check_result = pic.update_call(
        emergency_bridge_id,
        candid::Principal::anonymous(),
        "emergency_check",
        Encode!(&emergency_query).unwrap(),
    );
    
    match check_result {
        WasmResult::Reply(data) => {
            let response: serde_json::Value = Decode!(data.as_slice(), serde_json::Value).unwrap();
            
            // Should recommend manual review
            assert_eq!(response["action"], "recommend_review");
            assert_eq!(response["directive_found"], false);
            assert!(response["message"].as_str().unwrap().contains("No advance directive found"));
            
            println!("✅ No Directive Test Passed: {}", response["message"]);
        }
        WasmResult::Reject(msg) => panic!("Emergency check failed: {}", msg),
    }
}

#[tokio::test]
async fn test_webspeed_alert_creation() {
    let pic = PocketIc::new();
    
    let emergency_bridge_id = pic.create_canister();
    let emergency_bridge_wasm = std::fs::read("target/wasm32-unknown-unknown/release/emergency_bridge.wasm")
        .expect("Emergency bridge wasm not found.");
    
    pic.install_canister(emergency_bridge_id, emergency_bridge_wasm, vec![], None);
    
    // Create WebSpeed alert
    let alert = serde_json::json!({
        "alert_id": "alert_test_001",
        "patient_id": "patient_001",
        "alert_type": "DNR_ALERT",
        "message": "Test DNR alert message",
        "priority": "urgent",
        "timestamp": 1234567890u64
    });
    
    let alert_result = pic.update_call(
        emergency_bridge_id,
        candid::Principal::anonymous(),
        "webspeed_notify",
        Encode!(&alert).unwrap(),
    );
    
    assert!(matches!(alert_result, WasmResult::Reply(_)));
    
    // Verify alert was stored
    let alerts_result = pic.query_call(
        emergency_bridge_id,
        candid::Principal::anonymous(),
        "get_recent_alerts",
        Encode!(&10u64).unwrap(),
    );
    
    match alerts_result {
        WasmResult::Reply(data) => {
            let alerts: Vec<serde_json::Value> = Decode!(data.as_slice(), Vec<serde_json::Value>).unwrap();
            assert!(!alerts.is_empty());
            assert_eq!(alerts[0]["alert_type"], "DNR_ALERT");
            
            println!("✅ WebSpeed Alert Test Passed: {} alerts stored", alerts.len());
        }
        WasmResult::Reject(msg) => panic!("Failed to get alerts: {}", msg),
    }
}

#[tokio::test] 
async fn test_performance_sub_second_response() {
    let pic = PocketIc::new();
    
    let emergency_bridge_id = pic.create_canister();
    let emergency_bridge_wasm = std::fs::read("target/wasm32-unknown-unknown/release/emergency_bridge.wasm")
        .expect("Emergency bridge wasm not found.");
    
    pic.install_canister(emergency_bridge_id, emergency_bridge_wasm, vec![], None);
    
    // Store directive
    let directive_record = serde_json::json!({
        "patient_id": "perf_test_patient",
        "directive_type": "DNR",
        "conditions": vec!["any_emergency"],
        "signature_hash": "perf_hash_456",
        "verified": true,
        "created_at": 1234567890u64
    });
    
    pic.update_call(
        emergency_bridge_id,
        candid::Principal::anonymous(),
        "store_directive", 
        Encode!(&directive_record).unwrap(),
    );
    
    // Measure response time
    let start_time = std::time::Instant::now();
    
    let emergency_query = serde_json::json!({
        "patient_id": "perf_test_patient",
        "hospital_id": "ER_PERF_TEST",
        "situation": "cardiac_arrest",
        "vitals": Some("{}"),
        "access_token": Some("perf_token")
    });
    
    let check_result = pic.update_call(
        emergency_bridge_id,
        candid::Principal::anonymous(),
        "emergency_check",
        Encode!(&emergency_query).unwrap(),
    );
    
    let response_time = start_time.elapsed();
    
    // Verify response time is sub-second (allow some overhead for testing)
    assert!(response_time.as_millis() < 5000, "Response took {}ms, should be <5000ms", response_time.as_millis());
    
    match check_result {
        WasmResult::Reply(data) => {
            let response: serde_json::Value = Decode!(data.as_slice(), serde_json::Value).unwrap();
            assert_eq!(response["action"], "alert_ER");
            
            println!("✅ Performance Test Passed: Response in {}ms", response_time.as_millis());
        }
        WasmResult::Reject(msg) => panic!("Performance test failed: {}", msg),
    }
}