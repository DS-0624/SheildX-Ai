import pytest
import asyncio
from app.services.escalation_engine import EscalationEngine
from app.models.schemas import LocationPoint, TriggerReason, EventState

@pytest.mark.asyncio
async def test_immediate_voice_emergency():
    engine = EscalationEngine()
    loc = LocationPoint(latitude=12.9716, longitude=77.5946)
    
    event = engine.trigger_immediate_emergency(
        owner_uid="user_123",
        user_name="Alice",
        user_phone="+1234567890",
        trigger_reason=TriggerReason.VOICE_EMERGENCY,
        reason_detail="Personal phrase 'Blue Jasmine' detected",
        current_location=loc,
        emergency_emails=["em1@test.com", "em2@test.com", "em3@test.com", "em4@test.com"]
    )
    
    assert event.state == EventState.ALERT
    assert event.trigger == TriggerReason.VOICE_EMERGENCY
    assert len(event.emergency_emails_notified) == 4

@pytest.mark.asyncio
async def test_user_pressed_yes_safe():
    engine = EscalationEngine()
    loc = LocationPoint(latitude=12.9716, longitude=77.5946)
    
    # Start private check
    res_start = engine.start_private_safety_check(
        journey_id="j_10",
        owner_uid="user_456",
        user_name="Bob",
        user_phone="+9876543210",
        reason="Route deviation",
        current_location=loc,
        emergency_emails=["em1@test.com"]
    )
    assert res_start["check_index"] == 1
    
    # User responds YES (is_safe=True)
    res_response = await engine.handle_user_check_response("j_10", is_safe=True)
    assert res_response["status"] == "RESOLVED_SAFE"
    assert "j_10" not in engine.active_checks

@pytest.mark.asyncio
async def test_user_pressed_no_emergency():
    engine = EscalationEngine()
    loc = LocationPoint(latitude=12.9716, longitude=77.5946)
    
    engine.start_private_safety_check(
        journey_id="j_11",
        owner_uid="user_789",
        user_name="Charlie",
        user_phone="+1122334455",
        reason="Route deviation",
        current_location=loc,
        emergency_emails=["em1@test.com"]
    )
    
    # User responds NO (is_safe=False)
    res_response = await engine.handle_user_check_response("j_11", is_safe=False)
    assert res_response["status"] == "EMERGENCY_ESCALATED"
    assert res_response["event"].state == EventState.ALERT
    assert res_response["event"].trigger == TriggerReason.USER_PRESSED_NO
