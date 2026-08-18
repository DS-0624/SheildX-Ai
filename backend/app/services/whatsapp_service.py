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

        # 1. Try Twilio Gateway (Automated Cloud WhatsApp & SMS)
        if settings.TWILIO_ACCOUNT_SID and settings.TWILIO_AUTH_TOKEN:
            try:
                twilio_url = f"https://api.twilio.com/2010-04-01/Accounts/{settings.TWILIO_ACCOUNT_SID}/Messages.json"
                auth = (settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
                clean_num = recipient_phone.replace("+", "").replace("-", "").replace(" ", "")
                if not clean_num.startswith("+"):
                    clean_num = f"+{clean_num}"

                # Send via Twilio Sandbox WhatsApp Channel (+14155238886)
                wa_from = "whatsapp:+14155238886"
                wa_data = {
                    "From": wa_from,
                    "To": f"whatsapp:{clean_num}",
                    "Body": message_text
                }
                # Send via Twilio SMS Channel (+17372508034)
                sms_data = {
                    "From": settings.TWILIO_PHONE_NUMBER,
                    "To": clean_num,
                    "Body": message_text
                }
                async with httpx.AsyncClient() as client:
                    res_wa = await client.post(twilio_url, auth=auth, data=wa_data, timeout=10.0)
                    res_sms = await client.post(twilio_url, auth=auth, data=sms_data, timeout=10.0)
                    logger.info(f"Twilio Cloud Emergency Dispatch: WA Status {res_wa.status_code}, SMS Status {res_sms.status_code}")
                    return {
                        "status": "DELIVERED",
                        "gateway": "TWILIO",
                        "recipient": recipient_phone,
                        "wa_status": res_wa.status_code,
                        "sms_status": res_sms.status_code
                    }
            except Exception as e:
                logger.error(f"Twilio emergency dispatch error: {e}")

        # 2. Try Meta WhatsApp Cloud API
        if self.api_token and self.phone_number_id:
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
                        logger.info(f"WhatsApp Meta Cloud notification sent to {recipient_phone}")
                        return {"status": "DELIVERED", "recipient": recipient_phone, "response": response.json()}
            except Exception as e:
                logger.error(f"Meta WhatsApp error: {e}")

        return {
            "status": "SIMULATED",
            "recipient": recipient_phone,
            "message_preview": message_text
        }

    async def send_otp_sms_and_whatsapp(self, recipient_phone: str, otp_code: str, user_name: str) -> Dict[str, Any]:
        """
        Sends an automated verification OTP via Twilio WhatsApp & SMS, Fast2SMS, or Meta WhatsApp Cloud API.
        """
        clean_phone = recipient_phone.replace("+", "").replace("-", "").replace(" ", "")
        
        # 1. Try Twilio Gateway (Automated Cloud WhatsApp & SMS)
        if settings.TWILIO_ACCOUNT_SID and settings.TWILIO_AUTH_TOKEN:
            try:
                twilio_url = f"https://api.twilio.com/2010-04-01/Accounts/{settings.TWILIO_ACCOUNT_SID}/Messages.json"
                auth = (settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
                target_phone = f"+{clean_phone}" if not clean_phone.startswith("+") else clean_phone
                otp_msg = f"🔒 ShieldX AI Verification Code\n\nHello {user_name},\nYour 6-digit verification code is: {otp_code}\n\nValid for 5 minutes. Do not share this code with anyone."
                
                # Send via Twilio Sandbox WhatsApp Channel (+14155238886)
                wa_data = {
                    "From": "whatsapp:+14155238886",
                    "To": f"whatsapp:{target_phone}",
                    "Body": otp_msg
                }
                # Send via SMS Channel
                sms_data = {
                    "From": settings.TWILIO_PHONE_NUMBER,
                    "To": target_phone,
                    "Body": otp_msg
                }
                async with httpx.AsyncClient() as client:
                    res_wa = await client.post(twilio_url, auth=auth, data=wa_data, timeout=10.0)
                    res_sms = await client.post(twilio_url, auth=auth, data=sms_data, timeout=10.0)
                    logger.info(f"Twilio OTP Dispatch to {recipient_phone}: WA {res_wa.status_code}, SMS {res_sms.status_code}")
                    if res_wa.status_code in [200, 201] or res_sms.status_code in [200, 201]:
                        return {"status": "DELIVERED", "gateway": "TWILIO"}
            except Exception as e:
                logger.error(f"Twilio OTP error: {e}")

        # 3. Native WhatsApp App Link Fallback
        import urllib.parse
        wa_text = urllib.parse.quote(f"🔒 ShieldX AI Verification Code\n\nHello {user_name},\nYour 6-digit verification code is: {otp_code}\n\nValid for 5 minutes.")
        native_wa_url = f"whatsapp://send?phone={clean_phone}&text={wa_text}"
        
        return {
            "status": "NATIVE_DEEP_LINK",
            "otp_code": otp_code,
            "whatsapp_url": native_wa_url
        }

whatsapp_service = WhatsAppService()
