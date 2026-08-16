from fastapi import APIRouter, HTTPException, Depends
from app.models.schemas import VoiceCodeConfig
from app.core.security import get_current_user
from app.core.firebase import get_db

router = APIRouter(prefix="/voice-codes", tags=["Personal Emergency Voice Code"])

@router.get("/config")
def get_voice_code_config(current_user: dict = Depends(get_current_user)):
    """Returns the configured personal emergency phrase and settings for current user"""
    uid = current_user.get("sub", current_user.get("uid"))
    db = get_db()
    doc = db.collection("voice_codes").document(uid).get()
    if doc.exists:
        return doc.to_dict()
    return VoiceCodeConfig().model_dump()

@router.put("/config")
def update_voice_code_config(config: VoiceCodeConfig, current_user: dict = Depends(get_current_user)):
    """
    Updates user's personal emergency phrase (e.g. 'Blue Jasmine') and check-in phrase.
    """
    uid = current_user.get("sub", current_user.get("uid"))
    db = get_db()
    
    data = config.model_dump()
    data["owner_uid"] = uid
    
    db.collection("voice_codes").document(uid).set(data)
    
    return {
        "message": "Personal emergency voice code updated successfully",
        "config": data
    }
