import httpx
import logging
from typing import Dict, Any, Optional
from app.core.config import settings

logger = logging.getLogger("sheildx.whatsapp")

class WhatsAppService:
    def __init__(self):
        self.api_token = settings.WHATSAPP_API_TOKEN
        self.phone_number_id = settings.WHATSAPP_PHONE_NUMBER_ID

    async def send_emergency_whatsapp(self, recipient_phone: str, event_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Sends an emergency notification via WhatsApp Business / Cloud API when configured.
        """
        user_name = event_data.get("user_name", "SafeCircle User")
        reason = event_data.get("reason", "Emergency Alert")
        created_at = event_data.get("created_at", "Just now")
        loc = event_data.get("current_location", {})
        lat = loc.get("latitude", 0.0)
        lon = loc.get("longitude", 0.0)
        maps_link = f"https://maps.google.com/?q={lat},{lon}"
        live_track_url = f"https://sheildx.ai/live/{event_data.get('id', 'demo')}"
        battery = event_data.get("battery_level", "Unknown")

        message_text = (
            f"🚨 *SafeCircle Emergency Alert*\n\n"
            f"*Name:* {user_name}\n"
            f"*Reason:* {reason}\n"
            f"*Time:* {created_at}\n"
            f"*Location:* {maps_link}\n"
            f"*Battery:* {battery}%\n"
            f"*Status:* ALERT / Live Tracking\n\n"
            f"🔗 *Live Tracking Link:* {live_track_url}\n\n"
            f"Please respond or contact local authorities immediately."
        )

        if not self.api_token or not self.phone_number_id:
            logger.info(f"[SIMULATED WHATSAPP] Message prepared for {recipient_phone}: {message_text[:80]}...")
            return {
                "status": "SIMULATED",
                "recipient": recipient_phone,
                "message_preview": message_text
            }

        url = f"https://graph.facebook.com/v18.0/{self.phone_number_id}/messages"
        headers = {
            "Authorization": f"Bearer {self.api_token}",
            "Content-Type": "application/json"
        }
        payload = {
            "messaging_product": "whatsapp",
            "to": recipient_phone.replace("+", "").replace("-", "").replace(" ", ""),
            "type": "text",
            "text": {"body": message_text}
        }

        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(url, headers=headers, json=payload, timeout=10.0)
                if response.status_code in [200, 201]:
                    logger.info(f"WhatsApp emergency notification sent to {recipient_phone}")
                    return {"status": "DELIVERED", "recipient": recipient_phone, "response": response.json()}
                else:
                    logger.error(f"WhatsApp API error: {response.status_code} - {response.text}")
                    return {"status": "FAILED", "error": response.text}
        except Exception as e:
            logger.error(f"WhatsApp notification exception: {str(e)}")
            return {"status": "ERROR", "error": str(e)}

whatsapp_service = WhatsAppService()
