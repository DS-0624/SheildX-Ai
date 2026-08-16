import logging
from typing import Dict, Any, List
from firebase_admin import messaging
from app.core.config import settings

logger = logging.getLogger("sheildx.fcm")

class FCMService:
    def send_guardian_emergency_push(self, fcm_tokens: List[str], event_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Sends high-priority push notification to Guardian Android App via Firebase Cloud Messaging.
        """
        if not fcm_tokens:
            return {"status": "NO_TOKENS", "sent_count": 0}
            
        user_name = event_data.get("user_name", "User")
        reason = event_data.get("reason", "Emergency Alert")
        event_id = event_data.get("id", "")
        
        notification = messaging.Notification(
            title=f"🚨 EMERGENCY ALERT: {user_name}",
            body=f"{user_name} needs immediate help! Reason: {reason}"
        )
        
        data_payload = {
            "event_id": str(event_id),
            "user_name": str(user_name),
            "trigger_reason": str(event_data.get("trigger", "")),
            "click_action": "OPEN_EMERGENCY_LIVE_VIEW"
        }
        
        success_count = 0
        failure_count = 0
        
        for token in fcm_tokens:
            try:
                message = messaging.Message(
                    notification=notification,
                    data=data_payload,
                    token=token,
                    android=messaging.AndroidConfig(
                        priority="high",
                        notification=messaging.AndroidNotification(
                            channel_id="sheildx_emergency_channel",
                            priority="max",
                            sound="emergency_alarm"
                        )
                    )
                )
                messaging.send(message)
                success_count += 1
            except Exception as e:
                logger.error(f"FCM Push failed for token {token[:10]}...: {str(e)}")
                failure_count += 1
                
        logger.info(f"FCM Push results: {success_count} sent, {failure_count} failed")
        return {"status": "COMPLETED", "sent_count": success_count, "failed_count": failure_count}

fcm_service = FCMService()
