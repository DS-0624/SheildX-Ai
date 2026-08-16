from fastapi import APIRouter, HTTPException, Depends, status
from typing import List, Dict, Any
from app.core.security import get_current_user
from app.core.firebase import get_db

router = APIRouter(prefix="/users", tags=["Users & Emergency Contacts"])

@router.get("/profile")
def get_user_profile(current_user: dict = Depends(get_current_user)):
    db = get_db()
    uid = current_user.get("sub", current_user.get("uid"))
    doc = db.collection("users").document(uid).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="User profile not found")
    data = doc.to_dict()
    data.pop("password_hash", None)
    return data

@router.put("/emergency-emails")
def update_emergency_emails(emails: List[str], current_user: dict = Depends(get_current_user)):
    """
    Updates the emergency contacts emails (supports up to 4 emergency emails).
    Validates email format and ensures max 4 entries.
    """
    if len(emails) > 4:
        raise HTTPException(status_code=400, detail="Maximum 4 emergency emails allowed.")
        
    cleaned_emails = [e.strip() for e in emails if e and "@" in e]
    if not cleaned_emails:
        raise HTTPException(status_code=400, detail="At least one valid emergency email is required.")
        
    uid = current_user.get("sub", current_user.get("uid"))
    db = get_db()
    db.collection("users").document(uid).update({"emergency_emails": cleaned_emails})
    
    return {
        "message": "Emergency contact emails updated successfully",
        "emergency_emails": cleaned_emails
    }

@router.put("/privacy-settings")
def update_privacy_settings(settings: Dict[str, Any], current_user: dict = Depends(get_current_user)):
    uid = current_user.get("sub", current_user.get("uid"))
    db = get_db()
    db.collection("users").document(uid).update({"privacy_settings": settings})
    return {"message": "Privacy settings updated", "privacy_settings": settings}
