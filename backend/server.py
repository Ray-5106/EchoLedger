from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime
import asyncio
import json

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI(title="GhostChart AI - Health Directive Executor", version="1.0.0")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# ==================== MODELS ====================

class PatientDirective(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    patient_id: str
    patient_name: str
    directive_type: str  # "DNR", "organ_donation", "data_consent"
    directive_text: str
    conditions: Optional[List[str]] = []
    organs_consented: Optional[List[str]] = []
    data_sharing_consent: Optional[Dict[str, Any]] = {}
    verified: bool = False
    signature_hash: Optional[str] = None  # Simulates blockchain verification
    created_at: datetime = Field(default_factory=datetime.utcnow)
    expires_at: Optional[datetime] = None

class EmergencyAlert(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    patient_id: str
    alert_type: str  # "DNR_ALERT", "ORGAN_REFERRAL", "DATA_RELEASE"
    message: str
    directive_verified: bool
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    hospital_staff_notified: bool = False

class ERQuery(BaseModel):
    patient_id: str
    hospital_id: str
    vitals: Optional[Dict[str, Any]] = {}
    situation: str  # "cardiac_arrest", "respiratory_failure", etc.

class DirectiveCreate(BaseModel):
    patient_id: str
    patient_name: str
    directive_text: str
    
class OrganReferral(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    patient_id: str
    organs: List[str]
    destination: str
    priority: str
    match_probability: Optional[float] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)

# ==================== AI SIMULATION ====================

def simulate_nlp_processing(directive_text: str) -> Dict[str, Any]:
    """Simulates Llama3.1:8b NLP processing of advance directives"""
    
    # Simple keyword-based extraction (in real ICP, this would be LLM canister)
    extracted_info = {
        "dnr_detected": False,
        "conditions": [],
        "organ_donation": [],
        "data_consent": {},
        "confidence": 0.0
    }
    
    text_lower = directive_text.lower()
    
    # DNR Detection
    dnr_keywords = ["do not resuscitate", "dnr", "no resuscitation", "comfort care only"]
    if any(keyword in text_lower for keyword in dnr_keywords):
        extracted_info["dnr_detected"] = True
        extracted_info["confidence"] += 0.3
        
        # Extract conditions
        if "less than" in text_lower and "%" in text_lower:
            extracted_info["conditions"].append("<5% recovery probability")
        if "terminal" in text_lower:
            extracted_info["conditions"].append("terminal diagnosis")
            
    # Organ Donation Detection
    organ_keywords = {
        "heart": ["heart", "cardiac"],
        "kidney": ["kidney", "renal"],
        "liver": ["liver", "hepatic"],
        "corneas": ["corneas", "eyes"],
        "lungs": ["lungs", "pulmonary"],
        "pancreas": ["pancreas"]
    }
    
    for organ, keywords in organ_keywords.items():
        if any(keyword in text_lower for keyword in keywords):
            if "donate" in text_lower or "donation" in text_lower:
                extracted_info["organ_donation"].append(organ)
                extracted_info["confidence"] += 0.2
                
    # Data Consent Detection
    if "research" in text_lower or "data" in text_lower:
        if "anonymized" in text_lower or "de-identified" in text_lower:
            extracted_info["data_consent"] = {
                "research_allowed": True,
                "anonymization_required": True,
                "institutions": ["ALL_RESEARCH"] if "cancer" in text_lower else ["APPROVED_ONLY"]
            }
            extracted_info["confidence"] += 0.2
    
    return extracted_info

def simulate_blockchain_verification(directive_id: str) -> bool:
    """Simulates Threshold ECDSA verification on ICP"""
    # In real implementation, this would use ICP's threshold ECDSA
    return True  # Always verify for demo

# ==================== API ENDPOINTS ====================

@api_router.get("/")
async def root():
    return {"message": "GhostChart AI - Autonomous Health Directive Executor", "status": "operational"}

@api_router.post("/emergency/check", response_model=Dict[str, Any])
async def emergency_directive_check(query: ERQuery):
    """EMERGENCY MODE: Real-time directive verification for ER staff"""
    
    try:
        # Step 1: Query blockchain-stored directives (simulated with MongoDB)
        directive = await db.patient_directives.find_one({"patient_id": query.patient_id})
        
        if not directive:
            return {
                "action": "recommend_review",
                "patient_id": query.patient_id,
                "message": "No advance directive found on-chain. Manual verification required.",
                "directive_found": False
            }
        
        # Step 2: Verify signature (simulated blockchain verification)
        signature_valid = simulate_blockchain_verification(directive["id"])
        
        if not signature_valid:
            return {
                "action": "recommend_review", 
                "patient_id": query.patient_id,
                "message": "Directive signature invalid. Manual verification required.",
                "directive_found": True,
                "signature_verified": False
            }
        
        # Step 3: Check for DNR in emergency situations
        if directive["directive_type"] == "DNR" or "dnr" in directive["directive_text"].lower():
            
            # Create emergency alert
            alert = EmergencyAlert(
                patient_id=query.patient_id,
                alert_type="DNR_ALERT",
                message=f"DNR directive verified on-chain. Do not resuscitate per patient's wishes.",
                directive_verified=True
            )
            
            await db.emergency_alerts.insert_one(alert.dict())
            
            return {
                "action": "alert_ER",
                "patient_id": query.patient_id,
                "directive": "DNR",
                "message": "DNR directive verified on-chain. Do not resuscitate per patient's wishes.",
                "directive_found": True,
                "signature_verified": True,
                "conditions": directive.get("conditions", []),
                "alert_id": alert.id
            }
        
        return {
            "action": "continue_treatment",
            "patient_id": query.patient_id,
            "message": "No DNR found. Continue standard emergency protocols.",
            "directive_found": True,
            "signature_verified": True
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Emergency verification failed: {str(e)}")

@api_router.post("/directives/process", response_model=Dict[str, Any])
async def process_directive_nlp(directive_data: DirectiveCreate):
    """NLP MODE: Process natural language advance directives"""
    
    try:
        # Step 1: AI Processing (simulated Llama3.1:8b via LLM canister)
        extracted_info = simulate_nlp_processing(directive_data.directive_text)
        
        # Step 2: Create structured directive
        directive_type = "DNR" if extracted_info["dnr_detected"] else "GENERAL"
        
        directive = PatientDirective(
            patient_id=directive_data.patient_id,
            patient_name=directive_data.patient_name,
            directive_type=directive_type,
            directive_text=directive_data.directive_text,
            conditions=extracted_info["conditions"],
            organs_consented=extracted_info["organ_donation"],
            data_sharing_consent=extracted_info["data_consent"],
            verified=extracted_info["confidence"] > 0.7,
            signature_hash=f"sim_hash_{uuid.uuid4().hex[:16]}"  # Simulated blockchain hash
        )
        
        # Step 3: Store in database (represents blockchain storage)
        await db.patient_directives.insert_one(directive.dict())
        
        return {
            "action": "DIRECTIVE_CREATED",
            "directive_id": directive.id,
            "patient_id": directive_data.patient_id,
            "elements": {
                "dnr_detected": extracted_info["dnr_detected"],
                "dnr_conditions": extracted_info["conditions"],
                "organ_donation": extracted_info["organ_donation"],
                "data_consent": extracted_info["data_consent"]
            },
            "confidence_score": extracted_info["confidence"],
            "verification_required": extracted_info["confidence"] < 0.7,
            "next_step": "THRESHOLD_SIGNING" if extracted_info["confidence"] > 0.7 else "MANUAL_REVIEW"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Directive processing failed: {str(e)}")

@api_router.post("/death/execute", response_model=Dict[str, Any])
async def execute_death_directives(patient_id: str):
    """AUTONOMOUS EXECUTION: Execute patient wishes upon death"""
    
    try:
        # Get all directives for patient
        directives = await db.patient_directives.find({"patient_id": patient_id}).to_list(100)
        
        if not directives:
            return {
                "action": "no_directives_found",
                "patient_id": patient_id,
                "message": "No directives found for deceased patient."
            }
        
        executed_actions = []
        
        for directive in directives:
            # 1. Finalize DNR compliance
            if directive["directive_type"] == "DNR":
                action = {
                    "action": "finalize_care",
                    "patient_id": patient_id,
                    "directive": "DNR",
                    "message": "DNR directive enforced. No further invasive measures."
                }
                executed_actions.append(action)
            
            # 2. Execute organ donation
            if directive.get("organs_consented"):
                referral = OrganReferral(
                    patient_id=patient_id,
                    organs=directive["organs_consented"],
                    destination="OPO_Region5",
                    priority="urgent",
                    match_probability=0.87  # Simulated match score
                )
                
                await db.organ_referrals.insert_one(referral.dict())
                
                action = {
                    "action": "refer_OPO",
                    "patient_id": patient_id,
                    "organs": directive["organs_consented"],
                    "consent_verified": True,
                    "referral_id": referral.id,
                    "destination": "OPO_Region5",
                    "priority": "urgent"
                }
                executed_actions.append(action)
            
            # 3. Handle data sharing consents  
            if directive.get("data_sharing_consent", {}).get("research_allowed"):
                action = {
                    "action": "prepare_data_release",
                    "patient_id": patient_id,
                    "data_types": ["medical_records"],
                    "consent_verified": True,
                    "anonymization_required": directive["data_sharing_consent"].get("anonymization_required", True)
                }
                executed_actions.append(action)
        
        return {
            "autonomous_execution_complete": True,
            "patient_id": patient_id,
            "actions_executed": executed_actions,
            "total_actions": len(executed_actions)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Death directive execution failed: {str(e)}")

@api_router.get("/patients/{patient_id}/directives", response_model=List[PatientDirective])
async def get_patient_directives(patient_id: str):
    """Get all directives for a patient"""
    directives = await db.patient_directives.find({"patient_id": patient_id}).to_list(100)
    return [PatientDirective(**directive) for directive in directives]

@api_router.get("/alerts/recent", response_model=List[EmergencyAlert])
async def get_recent_alerts():
    """Get recent emergency alerts for ER dashboard"""
    alerts = await db.emergency_alerts.find().sort("timestamp", -1).limit(50).to_list(50)
    return [EmergencyAlert(**alert) for alert in alerts]

@api_router.get("/organ-referrals/active", response_model=List[OrganReferral])
async def get_active_organ_referrals():
    """Get active organ referrals for coordination"""
    referrals = await db.organ_referrals.find().sort("timestamp", -1).limit(20).to_list(20)
    return [OrganReferral(**referral) for referral in referrals]

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()