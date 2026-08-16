from fastapi import APIRouter, HTTPException, Depends, status, BackgroundTasks
from typing import Dict, Any, Optional
from datetime import datetime, timezone
from app.models.schemas import LocationPoint, TriggerReason, CheckResponse
from app.core.security import get_current_user, require_role
from app.core.firebase import get_db
from app.services.escalation_engine import escalation_engine
from app.services.notification_service import notification_service

router = APIRouter(prefix="/emergency", tags=["Emergency Operations"])

@router.post("/trigger-voice")
async def trigger_voice_emergency(
    phrase_detected: str,
    location: LocationPoint,
    journey_id: Optional[str] = None,
    background_tasks: BackgroundTasks = BackgroundTasks(),
    current_user: dict = Depends(get_current_user)
):
    """
    Triggered when the configured Personal Emergency Voice Code (e.g. 'Blue Jasmine') is detected.
    Immediately creates Emergency Event and dispatches FCM Push, 4 Emergency Emails, and WhatsApp notifications.
    """
    uid = current_user.get("sub", current_user.get("uid"))
    db = get_db()
    
    user_doc = db.collection("users").document(uid).get()
    user_data = user_doc.to_dict() if user_doc.exists else {}
    
    emergency_emails = user_data.get("emergency_emails", [])
    user_name = user_data.get("full_name", current_user.get("name", "SafeCircle User"))
    user_phone = user_data.get("phone", "Unspecified")
    
    event = escalation_engine.trigger_immediate_emergency(
        owner_uid=uid,
        user_name=user_name,
        user_phone=user_phone,
        trigger_reason=TriggerReason.VOICE_EMERGENCY,
        reason_detail=f"Personal emergency voice code detected: '{phrase_detected}'",
        current_location=location,
        journey_id=journey_id,
        emergency_emails=emergency_emails
    )
    
    event_dict = event.model_dump()
    db.collection("emergency_events").document(event.id).set(event_dict)
    
    # Dispatch multi-channel notifications in background
    background_tasks.add_task(
        notification_service.dispatch_emergency_notifications,
        event_data=event_dict,
        emergency_emails=emergency_emails,
        whatsapp_phone=user_phone
    )
    
    return {
        "message": "Emergency event successfully triggered by voice phrase!",
        "event": event_dict
    }

@router.post("/trigger-sos")
async def trigger_manual_sos(
    location: LocationPoint,
    journey_id: Optional[str] = None,
    background_tasks: BackgroundTasks = BackgroundTasks(),
    current_user: dict = Depends(get_current_user)
):
    """
    Triggered via Wear OS Tap-Tap-Long Hold gesture or mobile SOS button.
    Immediately escalates to emergency ALERT state.
    """
    uid = current_user.get("sub", current_user.get("uid"))
    db = get_db()
    
    user_doc = db.collection("users").document(uid).get()
    user_data = user_doc.to_dict() if user_doc.exists else {}
    
    emergency_emails = user_data.get("emergency_emails", [])
    user_name = user_data.get("full_name", current_user.get("name", "SafeCircle User"))
    user_phone = user_data.get("phone", "Unspecified")
    
    event = escalation_engine.trigger_immediate_emergency(
        owner_uid=uid,
        user_name=user_name,
        user_phone=user_phone,
        trigger_reason=TriggerReason.MANUAL_SOS,
        reason_detail="Manual watch/phone emergency gesture activated",
        current_location=location,
        journey_id=journey_id,
        emergency_emails=emergency_emails
    )
    
    event_dict = event.model_dump()
    db.collection("emergency_events").document(event.id).set(event_dict)
    
    background_tasks.add_task(
        notification_service.dispatch_emergency_notifications,
        event_data=event_dict,
        emergency_emails=emergency_emails,
        whatsapp_phone=user_phone
    )
    
    return {
        "message": "Manual SOS emergency triggered",
        "event": event_dict
    }

@router.post("/check-response")
async def respond_to_safety_check(
    payload: CheckResponse,
    background_tasks: BackgroundTasks = BackgroundTasks(),
    current_user: dict = Depends(get_current_user)
):
    """
    Processes user click on 'Are you safe?' UI on watch or mobile.
    - is_safe = True -> Confirms safety & resets check.
    - is_safe = False -> Immediate emergency escalation + 4 Emergency Emails + WhatsApp.
    """
    res = await escalation_engine.handle_user_check_response(
        journey_id=payload.journey_id,
        is_safe=payload.is_safe
    )
    
    if res.get("status") == "EMERGENCY_ESCALATED" and res.get("event"):
        event = res["event"]
        event_dict = event.model_dump()
        db = get_db()
        db.collection("emergency_events").document(event.id).set(event_dict)
        
        user_doc = db.collection("users").document(event.owner_uid).get()
        emergency_emails = user_doc.to_dict().get("emergency_emails", []) if user_doc.exists else []
        
        background_tasks.add_task(
            notification_service.dispatch_emergency_notifications,
            event_data=event_dict,
            emergency_emails=emergency_emails
        )
        
    return res

@router.post("/{event_id}/acknowledge")
def acknowledge_emergency(event_id: str, current_user: dict = Depends(get_current_user)):
    """
    Called by authorized Parent/Guardian to acknowledge the active emergency alert.
    """
    db = get_db()
    edoc = db.collection("emergency_events").document(event_id).get()
    if not edoc.exists:
        raise HTTPException(status_code=404, detail="Emergency event not found")
        
    now_str = datetime.now(timezone.utc).isoformat()
    guardian_name = current_user.get("name", "Guardian")
    
    update_data = {
        "acknowledged_by": guardian_name,
        "acknowledged_at": now_str,
        "state": "LIVE_RESPONSE",
        "updated_at": now_str
    }
    
    db.collection("emergency_events").document(event_id).update(update_data)
    return {"message": f"Emergency acknowledged by {guardian_name}", "event_id": event_id}

@router.post("/{event_id}/resolve")
def resolve_emergency(event_id: str, current_user: dict = Depends(get_current_user)):
    """
    Resolves the emergency event. Stops live emergency tracking.
    """
    db = get_db()
    edoc = db.collection("emergency_events").document(event_id).get()
    if not edoc.exists:
        raise HTTPException(status_code=404, detail="Emergency event not found")
        
    now_str = datetime.now(timezone.utc).isoformat()
    resolver_name = current_user.get("name", "Authorized User")
    
    update_data = {
        "resolved_by": resolver_name,
        "resolved_at": now_str,
        "state": "RESOLVED",
        "updated_at": now_str
    }
    
    db.collection("emergency_events").document(event_id).update(update_data)
    return {"message": f"Emergency resolved by {resolver_name}", "event_id": event_id}
