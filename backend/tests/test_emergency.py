import pytest
from app.services.email_service import email_service
from app.services.whatsapp_service import whatsapp_service

def test_email_service_four_contacts():
    emergency_contacts = [
        "parent1@sheildx.ai",
        "parent2@sheildx.ai",
        "guardian3@sheildx.ai",
        "friend4@sheildx.ai"
    ]
    
    event_data = {
        "id": "evt_test_1001",
        "user_name": "Dave",
        "reason": "Personal Emergency Voice Phrase 'Blue Jasmine' Detected",
        "created_at": "2026-08-16T15:55:00Z",
        "current_location": {"latitude": 12.9716, "longitude": 77.5946, "address": "College Gate, Main Road"},
        "battery_level": 92,
        "network_state": "5G"
    }
    
    res = email_service.send_emergency_email(emergency_contacts, event_data)
    assert res["status"] == "COMPLETED"
    assert res["total_sent"] == 4
    assert len(res["sent_to"]) == 4
