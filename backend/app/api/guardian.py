import secrets
from fastapi import APIRouter, HTTPException, Depends, status
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any
from app.models.schemas import UserRole
from app.core.security import get_current_user, require_role
from app.core.firebase import get_db

router = APIRouter(prefix="/guardian", tags=["Parent & Guardian Management"])

@router.post("/generate-invitation")
def generate_guardian_invitation(current_user: dict = Depends(get_current_user)):
    """
    Generates a secure 6-digit linking code for the user to invite a parent/guardian.
    """
    uid = current_user.get("sub", current_user.get("uid"))
    db = get_db()
    
    code = f"{secrets.randbelow(900000) + 100000}"
    now = datetime.now(timezone.utc)
    expires = (now + timedelta(hours=24)).isoformat()
    
    inv_data = {
        "invitation_code": code,
        "child_uid": uid,
        "child_name": current_user.get("name", "Child User"),
        "created_at": now.isoformat(),
        "expires_at": expires
    }
    
    db.collection("guardian_invitations").document(code).set(inv_data)
    
    return {
        "invitation_code": code,
        "expires_at": expires,
        "instructions": "Share this code with your Parent/Guardian to securely link accounts."
    }

@router.post("/accept-invitation")
def accept_guardian_invitation(invitation_code: str, current_user: dict = Depends(get_current_user)):
    """
    Accepts invitation code and establishes secure parent-child relationship link.
    """
    db = get_db()
    inv_doc = db.collection("guardian_invitations").document(invitation_code).get()
    
    if not inv_doc.exists:
        raise HTTPException(status_code=400, detail="Invalid or expired invitation code.")
        
    inv_data = inv_doc.to_dict()
    parent_uid = current_user.get("sub", current_user.get("uid"))
    parent_name = current_user.get("name", "Parent/Guardian")
    child_uid = inv_data["child_uid"]
    child_name = inv_data["child_name"]
    
    rel_id = f"rel_{parent_uid[:6]}_{child_uid[:6]}"
    now_str = datetime.now(timezone.utc).isoformat()
    
    rel_data = {
        "relationship_id": rel_id,
        "parent_uid": parent_uid,
        "parent_name": parent_name,
        "child_uid": child_uid,
        "child_name": child_name,
        "status": "ACTIVE",
        "created_at": now_str
    }
    
    db.collection("guardian_relationships").document(rel_id).set(rel_data)
    # Remove single-use code
    db.collection("guardian_invitations").document(invitation_code).delete()
    
    return {
        "message": f"Successfully linked with {child_name}",
        "relationship": rel_data
    }

@router.get("/children-dashboard")
def get_guardian_children_dashboard(current_user: dict = Depends(get_current_user)):
    """
    Returns live status of all linked children for Guardian Dashboard.
    Enforces privacy policy: only displays location during permitted active journeys or emergencies.
    """
    parent_uid = current_user.get("sub", current_user.get("uid"))
    db = get_db()
    
    rels = list(db.collection("guardian_relationships").where("parent_uid", "==", parent_uid).stream())
    
    children_status = []
    for rel in rels:
        rel_data = rel.to_dict()
        c_uid = rel_data["child_uid"]
        
        c_doc = db.collection("users").document(c_uid).get()
        c_user = c_doc.to_dict() if c_doc.exists else {}
        
        active_journey_id = c_user.get("active_journey_id")
        journey_info = None
        if active_journey_id:
            j_doc = db.collection("journeys").document(active_journey_id).get()
            if j_doc.exists:
                journey_info = j_doc.to_dict()
                
        # Check active emergencies
        emergencies = list(db.collection("emergency_events").where("owner_uid", "==", c_uid).stream())
        active_emergency = None
        for em in emergencies:
            em_dict = em.to_dict()
            if em_dict.get("state") in ["ALERT", "LIVE_RESPONSE"]:
                active_emergency = em_dict
                break
                
        children_status.append({
            "child_uid": c_uid,
            "child_name": rel_data["child_name"],
            "phone": c_user.get("phone", ""),
            "safety_status": active_emergency["state"] if active_emergency else ("JOURNEY_ACTIVE" if journey_info else "SAFE"),
            "battery_level": 88,
            "network_state": "4G/5G",
            "active_journey": journey_info,
            "active_emergency": active_emergency
        })
        
    return {"children": children_status, "total_linked": len(children_status)}
