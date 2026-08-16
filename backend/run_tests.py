import sys
import unittest
import asyncio
from app.services.route_engine import RouteEngine, haversine_distance
from app.services.escalation_engine import EscalationEngine
from app.models.schemas import LocationPoint, TriggerReason, EventState
from app.services.email_service import email_service

class TestRouteEngine(unittest.TestCase):
    def test_haversine(self):
        dist = haversine_distance(12.9716, 77.5946, 12.9816, 77.5946)
        self.assertTrue(1100 <= dist <= 1120)

    def test_normal_progress(self):
        engine = RouteEngine(deviation_threshold_m=150.0, accuracy_threshold_m=50.0)
        planned = [(12.9716, 77.5946), (12.9816, 77.5946)]
        res = engine.evaluate_location_point("j_1", 12.9750, 77.5946, accuracy=10.0, planned_points=planned)
        self.assertFalse(res["is_deviating"])

    def test_sustained_deviation(self):
        engine = RouteEngine(deviation_threshold_m=150.0, accuracy_threshold_m=50.0)
        planned = [(12.9716, 77.5946), (12.9816, 77.5946)]
        res1 = engine.evaluate_location_point("j_3", 12.9750, 77.6000, accuracy=10.0, planned_points=planned)
        self.assertFalse(res1["is_deviating"])
        res2 = engine.evaluate_location_point("j_3", 12.9755, 77.6005, accuracy=10.0, planned_points=planned)
        self.assertTrue(res2["is_deviating"])

class TestEscalationEngine(unittest.TestCase):
    def test_voice_emergency(self):
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
        self.assertEqual(event.state, EventState.ALERT)
        self.assertEqual(len(event.emergency_emails_notified), 4)

class TestEmergencyServices(unittest.TestCase):
    def test_email_four_contacts(self):
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
            "current_location": {"latitude": 12.9716, "longitude": 77.5946},
            "battery_level": 92
        }
        res = email_service.send_emergency_email(emergency_contacts, event_data)
        self.assertEqual(res["status"], "COMPLETED")
        self.assertEqual(res["total_sent"], 4)

if __name__ == "__main__":
    unittest.main()
