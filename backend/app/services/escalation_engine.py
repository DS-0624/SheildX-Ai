import asyncio
import logging
from datetime import datetime, timezone
from typing import Dict, Any, Optional
from app.models.schemas import EventState, TriggerReason, EmergencyEvent, LocationPoint, TimelineItem
from app.core.config import settings

logger = logging.getLogger("sheildx.escalation")

class EscalationEngine:
    def __init__(self):
        # In-memory track of active safety checks per journey/user
        # active_checks[journey_id] = { "check_index": 1, "created_at": timestamp, "timer_task": asyncio.Task }
        self.active_checks: Dict[str, Dict[str, Any]] = {}
        self.active_emergencies: Dict[str, Dict[str, Any]] = {}

    def trigger_immediate_emergency(self, owner_uid: str, user_name: str, user_phone: str,
                                   trigger_reason: str, reason_detail: str,
                                   current_location: LocationPoint,
                                   journey_id: Optional[str] = None,
                                   emergency_emails: list[str] = None) -> EmergencyEvent:
        """
        Immediately escalates to emergency ALERT state (bypassing 3x30s checks).
        Triggered by: Personal Voice Emergency Phrase, Manual SOS, or User selecting 'NO'.
        """
        event_id = f"evt_{int(datetime.now(timezone.utc).timestamp())}_{owner_uid[:6]}"
        now_str = datetime.now(timezone.utc).isoformat()
        
        timeline = [
            TimelineItem(
                id=f"tl_1",
                event_type="EMERGENCY_TRIGGERED",
                message=f"Emergency triggered: {reason_detail}",
                timestamp=now_str,
                actor="USER" if trigger_reason in [TriggerReason.VOICE_EMERGENCY, TriggerReason.MANUAL_SOS, TriggerReason.USER_PRESSED_NO] else "SYSTEM"
            )
        ]
        
        event = EmergencyEvent(
            id=event_id,
            owner_uid=owner_uid,
            user_name=user_name,
            user_phone=user_phone,
            journey_id=journey_id,
            state=EventState.ALERT,
            trigger=trigger_reason,
            reason=reason_detail,
            risk_score=0.98,
            created_at=now_str,
            updated_at=now_str,
            current_location=current_location,
            battery_level=85,
            network_state="4G/5G",
            emergency_emails_notified=emergency_emails or [],
            whatsapp_notified=False,
            timeline=timeline
        )
        
        self.active_emergencies[event_id] = event.model_dump()
        
        # Cancel any pending safety check timers for this journey
        if journey_id and journey_id in self.active_checks:
            timer_task = self.active_checks[journey_id].get("timer_task")
            if timer_task and not timer_task.done():
                timer_task.cancel()
            del self.active_checks[journey_id]
            
        logger.info(f"IMMEDIATE EMERGENCY CREATED: {event_id} for user {user_name} ({trigger_reason})")
        return event

    def start_private_safety_check(self, journey_id: str, owner_uid: str, user_name: str, user_phone: str,
                                   reason: str, current_location: LocationPoint,
                                   emergency_emails: list[str],
                                   on_auto_escalate_callback=None) -> Dict[str, Any]:
        """
        Initiates Check #1 (30s countdown).
        If check is already active, returns current check state without creating duplicate checks.
        """
        if journey_id in self.active_checks:
            return {
                "journey_id": journey_id,
                "check_index": self.active_checks[journey_id]["check_index"],
                "status": "CHECK_ALREADY_IN_PROGRESS",
                "remaining_seconds": 30
            }
            
        now_str = datetime.now(timezone.utc).isoformat()
        
        check_state = {
            "journey_id": journey_id,
            "owner_uid": owner_uid,
            "user_name": user_name,
            "user_phone": user_phone,
            "reason": reason,
            "current_location": current_location,
            "emergency_emails": emergency_emails,
            "check_index": 1,
            "created_at": now_str,
            "status": "WAITING_USER_RESPONSE",
            "on_auto_escalate": on_auto_escalate_callback
        }
        
        # Schedule the automatic escalation timer loop
        task = asyncio.create_task(self._check_timer_loop(journey_id))
        check_state["timer_task"] = task
        
        self.active_checks[journey_id] = check_state
        logger.info(f"Private Safety Check #1 initiated for journey {journey_id}")
        
        return {
            "journey_id": journey_id,
            "check_index": 1,
            "status": "PRIVATE_CHECK_ACTIVE",
            "interval_seconds": settings.SAFETY_CHECK_INTERVAL_SECONDS,
            "max_checks": settings.SAFETY_CHECK_MAX_COUNT
        }

    async def handle_user_check_response(self, journey_id: str, is_safe: bool) -> Dict[str, Any]:
        """
        Handles explicit user response to 'Are you safe?'.
        - YES (is_safe=True): cancels check & returns to JOURNEY_ACTIVE.
        - NO (is_safe=False): immediately triggers EMERGENCY ALERT.
        """
        check_state = self.active_checks.get(journey_id)
        if not check_state:
            return {"status": "NO_ACTIVE_CHECK", "message": "No active safety check found for this journey"}
            
        # Cancel background timer task
        timer_task = check_state.get("timer_task")
        if timer_task and not timer_task.done():
            timer_task.cancel()
            
        if is_safe:
            # User confirmed safety
            del self.active_checks[journey_id]
            logger.info(f"User confirmed SAFE for journey {journey_id}. Resetting check.")
            return {
                "status": "RESOLVED_SAFE",
                "message": "User confirmed safety. Journey continues.",
                "event": None
            }
        else:
            # User selected NO -> Immediate Escalation
            del self.active_checks[journey_id]
            emergency_event = self.trigger_immediate_emergency(
                owner_uid=check_state["owner_uid"],
                user_name=check_state["user_name"],
                user_phone=check_state["user_phone"],
                trigger_reason=TriggerReason.USER_PRESSED_NO,
                reason_detail=f"User manually requested emergency help during check #{check_state['check_index']}",
                current_location=check_state["current_location"],
                journey_id=journey_id,
                emergency_emails=check_state["emergency_emails"]
            )
            return {
                "status": "EMERGENCY_ESCALATED",
                "message": "User requested emergency assistance. Escalated to ALERT state.",
                "event": emergency_event
            }

    async def _check_timer_loop(self, journey_id: str):
        """
        Runs the 3-stage 30-second countdown loop.
        Check #1 -> wait 30s -> Check #2 -> wait 30s -> Check #3 -> wait 30s -> Auto Emergency.
        """
        try:
            for check_idx in range(1, settings.SAFETY_CHECK_MAX_COUNT + 1):
                await asyncio.sleep(settings.SAFETY_CHECK_INTERVAL_SECONDS)
                
                check_state = self.active_checks.get(journey_id)
                if not check_state:
                    return  # Check was resolved or cancelled
                    
                if check_idx < settings.SAFETY_CHECK_MAX_COUNT:
                    next_idx = check_idx + 1
                    check_state["check_index"] = next_idx
                    logger.info(f"No response to check #{check_idx} for journey {journey_id}. Escalating to check #{next_idx}.")
                else:
                    # 3rd check timed out -> AUTOMATIC ESCALATION TO EMERGENCY
                    logger.warning(f"Check #3 timed out with NO RESPONSE for journey {journey_id}. AUTOMATIC ESCALATION!")
                    del self.active_checks[journey_id]
                    
                    emergency_event = self.trigger_immediate_emergency(
                        owner_uid=check_state["owner_uid"],
                        user_name=check_state["user_name"],
                        user_phone=check_state["user_phone"],
                        trigger_reason=TriggerReason.ROUTE_DEVIATION_TIMEOUT,
                        reason_detail=f"Automatic emergency: No response to 3 consecutive safety checks ({settings.SAFETY_CHECK_MAX_COUNT * settings.SAFETY_CHECK_INTERVAL_SECONDS}s total)",
                        current_location=check_state["current_location"],
                        journey_id=journey_id,
                        emergency_emails=check_state["emergency_emails"]
                    )
                    
                    callback = check_state.get("on_auto_escalate")
                    if callback:
                        if asyncio.iscoroutinefunction(callback):
                            await callback(emergency_event)
                        else:
                            callback(emergency_event)
                    return
        except asyncio.CancelledError:
            logger.info(f"Check timer loop cancelled for journey {journey_id}")

escalation_engine = EscalationEngine()
