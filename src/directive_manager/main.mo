import Debug "mo:base/Debug";
import Time "mo:base/Time";
import Text "mo:base/Text";
import Array "mo:base/Array";
import HashMap "mo:base/HashMap";
import Option "mo:base/Option";
import Result "mo:base/Result";
import Iter "mo:base/Iter";

// ==================== TYPES ====================

public type DirectiveType = {
    #DNR;
    #OrganDonation;  
    #DataConsent;
    #General;
};

public type PatientDirective = {
    id: Text;
    patient_id: Text;
    patient_name: Text;
    directive_type: DirectiveType;
    directive_text: Text;
    conditions: [Text];
    organs_consented: [Text];
    data_sharing_consent: ?DataConsent;
    verified: Bool;
    signature_hash: ?Text;
    created_at: Int;
    expires_at: ?Int;
};

public type DataConsent = {
    research_allowed: Bool;
    anonymization_required: Bool;
    institutions: [Text];
    retention_years: Nat;
};

public type DirectiveInput = {
    patient_id: Text;
    patient_name: Text;
    directive_text: Text;
};

public type NLPResult = {
    dnr_detected: Bool;
    conditions: [Text];
    organ_donation: [Text];
    data_consent: ?DataConsent;
    confidence: Float;
};

public type ComplianceCheck = {
    hipaa_compliant: Bool;
    gdpr_applicable: Bool;
    retention_period: Nat;
    phi_redacted: Bool;
};

// ==================== ACTOR ====================

actor DirectiveManager {
    
    private stable var directive_entries: [(Text, PatientDirective)] = [];
    private var directives = HashMap.HashMap<Text, PatientDirective>(10, Text.equal, Text.hash);
    
    private stable var compliance_entries: [(Text, ComplianceCheck)] = [];
    private var compliance_store = HashMap.HashMap<Text, ComplianceCheck>(10, Text.equal, Text.hash);

    // Restore state after upgrade
    system func preupgrade() {
        directive_entries := Iter.toArray(directives.entries());
        compliance_entries := Iter.toArray(compliance_store.entries());
    };

    system func postupgrade() {
        directives := HashMap.fromIter<Text, PatientDirective>(
            directive_entries.vals(), directive_entries.size(), Text.equal, Text.hash
        );
        compliance_store := HashMap.fromIter<Text, ComplianceCheck>(
            compliance_entries.vals(), compliance_entries.size(), Text.equal, Text.hash
        );
        directive_entries := [];
        compliance_entries := [];
    };

    // ==================== HIPAA COMPLIANCE MODULE ====================

    public func gdpr_check(patient_nationality: Text): async Bool {
        // GDPR Special Cases - 5 year retention for EU patients
        if (patient_nationality == "EU") {
            // Set retention timer and return true
            true
        } else {
            false
        }
    };

    public func hipaa_compliance_check(directive: PatientDirective): async ComplianceCheck {
        let phi_items = [
            "name", "ssn", "dob", "address", "phone", "email", 
            "medical_record_number", "account_number", "certificate_number",
            "vehicle_id", "device_id", "web_url", "ip_address", "biometric_id", 
            "photo", "fingerprint", "voice_print", "retina_scan", "signature"
        ];

        // Check if directive text contains PHI
        let contains_phi = Array.find<Text>(phi_items, func(phi_item) {
            Text.contains(directive.directive_text, #text phi_item)
        });

        {
            hipaa_compliant = Option.isNull(contains_phi);
            gdpr_applicable = false; // Set based on patient location
            retention_period = 50; // 50 years for deceased patient data
            phi_redacted = Option.isNull(contains_phi);
        }
    };

    // ==================== NLP PROCESSING ====================

    public func process_directive_nlp(input: DirectiveInput): async Result.Result<PatientDirective, Text> {
        // Simulate Llama3.1:8b processing
        let nlp_result = await simulate_llm_processing(input.directive_text);
        
        if (nlp_result.confidence < 0.7) {
            return #err("Low confidence NLP extraction. Manual review required.");
        };

        let directive_type = if (nlp_result.dnr_detected) { #DNR } else { #General };
        
        let directive_id = input.patient_id # "_" # Int.toText(Time.now());
        
        let directive: PatientDirective = {
            id = directive_id;
            patient_id = input.patient_id;
            patient_name = input.patient_name;
            directive_type = directive_type;
            directive_text = input.directive_text;
            conditions = nlp_result.conditions;
            organs_consented = nlp_result.organ_donation;
            data_sharing_consent = nlp_result.data_consent;
            verified = nlp_result.confidence > 0.8;
            signature_hash = ?"sim_hash_" # directive_id;
            created_at = Time.now();
            expires_at = null;
        };

        // HIPAA compliance check
        let compliance = await hipaa_compliance_check(directive);
        
        if (not compliance.hipaa_compliant) {
            return #err("Directive contains PHI and violates HIPAA compliance.");
        };

        // Store directive and compliance record
        directives.put(directive.patient_id, directive);
        compliance_store.put(directive.patient_id, compliance);

        #ok(directive)
    };

    private func simulate_llm_processing(text: Text): async NLPResult {
        // Simulated NLP processing (in production, calls LLM canister)
        let lower_text = Text.map(text, func(c: Char): Char {
            if (c >= 'A' and c <= 'Z') {
                Char.fromNat32(Char.toNat32(c) + 32)
            } else { c }
        });

        let dnr_detected = Text.contains(lower_text, #text "do not resuscitate") or 
                          Text.contains(lower_text, #text "dnr");
        
        let conditions = if (Text.contains(lower_text, #text "less than") and Text.contains(lower_text, #text "%")) {
            ["<5% recovery probability"]
        } else { [] };

        let organ_donation = if (Text.contains(lower_text, #text "kidney")) {
            ["kidney"]
        } else if (Text.contains(lower_text, #text "heart")) {
            ["heart"] 
        } else { [] };

        let data_consent = if (Text.contains(lower_text, #text "research") and Text.contains(lower_text, #text "anonymized")) {
            ?{
                research_allowed = true;
                anonymization_required = true;
                institutions = ["ALL_RESEARCH"];
                retention_years = 50;
            }
        } else { null };

        let confidence = if (dnr_detected) { 0.9 }
                        else if (organ_donation.size() > 0) { 0.8 }
                        else { 0.6 };

        {
            dnr_detected = dnr_detected;
            conditions = conditions;
            organ_donation = organ_donation;
            data_consent = data_consent;
            confidence = confidence;
        }
    };

    // ==================== DIRECTIVE MANAGEMENT ====================

    public query func get_patient_directive(patient_id: Text): async ?PatientDirective {
        directives.get(patient_id)
    };

    public query func get_all_directives(): async [PatientDirective] {
        Iter.toArray(directives.vals())
    };

    public func update_directive(patient_id: Text, updated_directive: PatientDirective): async Bool {
        switch (directives.get(patient_id)) {
            case (null) { false };
            case (?existing) {
                directives.put(patient_id, updated_directive);
                true
            };
        }
    };

    public func delete_directive(patient_id: Text): async Bool {
        switch (directives.remove(patient_id)) {
            case (null) { false };
            case (?removed) { true };
        }
    };

    // ==================== AUTONOMOUS EXECUTION ====================

    public func execute_death_directives(patient_id: Text): async [Text] {
        switch (directives.get(patient_id)) {
            case (null) { ["No directives found for patient"] };
            case (?directive) {
                var actions: [Text] = [];

                // 1. Finalize DNR compliance
                switch (directive.directive_type) {
                    case (#DNR) {
                        actions := Array.append(actions, ["DNR directive enforced - no further invasive measures"]);
                    };
                    case (_) {};
                };

                // 2. Execute organ donation
                if (directive.organs_consented.size() > 0) {
                    let organ_text = "Organ referral initiated: " # Text.join(", ", directive.organs_consented.vals());
                    actions := Array.append(actions, [organ_text]);
                };

                // 3. Data sharing consent
                switch (directive.data_sharing_consent) {
                    case (?consent) {
                        if (consent.research_allowed) {
                            actions := Array.append(actions, ["Data prepared for research sharing (anonymized)"]);
                        };
                    };
                    case (null) {};
                };

                actions
            };
        }
    };

    // ==================== COMPLIANCE QUERIES ====================

    public query func get_compliance_status(patient_id: Text): async ?ComplianceCheck {
        compliance_store.get(patient_id)
    };

    public func retention_check(): async Nat {
        // Auto-wipe protocol for expired directives
        let current_time = Time.now();
        let fifty_years_ns = 50 * 365 * 24 * 60 * 60 * 1_000_000_000; // 50 years in nanoseconds
        
        var expired_count = 0;
        
        for ((patient_id, directive) in directives.entries()) {
            if (current_time > directive.created_at + fifty_years_ns) {
                ignore directives.remove(patient_id);
                ignore compliance_store.remove(patient_id);
                expired_count += 1;
            };
        };
        
        expired_count
    };

    // ==================== SYSTEM INFO ====================

    public query func get_directive_count(): async Nat {
        directives.size()
    };

    public query func get_system_info(): async Text {
        "EchoLedger Directive Manager v1.0 - HIPAA Compliant - " # Nat.toText(directives.size()) # " directives stored"
    };
}