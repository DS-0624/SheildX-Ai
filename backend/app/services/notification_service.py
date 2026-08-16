import logging
from typing import Dict, Any, List
from app.services.email_service import email_service
from app.services.whatsapp_service import whatsapp_service
from app.services.fcm_service import fcm_service

logger = logging.getLogger("sheildx.notification")

class NotificationService:
    async def dispatch_emergency_notifications(
        self,
        event_data: Dict[str, Any],
        emergency_emails: List[str],
        guardian_fcm_tokens: List[str] = None,
        whatsapp_phone: str = None
    ) -> Dict[str, Any]:
        """
        Orchestrates multi-channel emergency notification dispatch:
        1. Primary: Guardian FCM Push Notification
        2. Secondary: Email Emergency Alerts (sent to all 4 registered emergency contacts)
        3. Secondary: WhatsApp Emergency Notification (when API is configured)
        
        Fault-tolerant: A failure in one channel does not cancel the others.
        """
        results = {}
        
        # 1. FCM Push to Guardian App
        try:
            fcm_res = fcm_service.send_guardian_emergency_push(guardian_fcm_tokens or [], event_data)
            results["fcm"] = fcm_res
        except Exception as e:
            logger.error(f"Notification Service FCM error: {str(e)}")
            results["fcm"] = {"status": "ERROR", "error": str(e)}
            
        # 2. Email Emergency Notification (4 Emergency Emails)
        try:
            email_res = email_service.send_emergency_email(emergency_emails, event_data)
            results["email"] = email_res
        except Exception as e:
            logger.error(f"Notification Service Email error: {str(e)}")
            results["email"] = {"status": "ERROR", "error": str(e)}
            
        # 3. WhatsApp Emergency Notification
        try:
            if whatsapp_phone:
                wa_res = await whatsapp_service.send_emergency_whatsapp(whatsapp_phone, event_data)
                results["whatsapp"] = wa_res
            else:
                results["whatsapp"] = {"status": "SKIPPED", "reason": "No phone number provided"}
        except Exception as e:
            logger.error(f"Notification Service WhatsApp error: {str(e)}")
            results["whatsapp"] = {"status": "ERROR", "error": str(e)}
            
        logger.info(f"Multi-channel Emergency Notification Dispatch completed for event {event_data.get('id')}")
        return results

notification_service = NotificationService()
