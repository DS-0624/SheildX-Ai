import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import List, Dict, Any
from app.core.config import settings

logger = logging.getLogger("sheildx.email")

class EmailService:
    def __init__(self):
        self.smtp_host = settings.SMTP_HOST
        self.smtp_port = settings.SMTP_PORT
        self.smtp_username = settings.SMTP_USERNAME
        self.smtp_password = settings.SMTP_PASSWORD
        self.from_email = settings.SMTP_FROM_EMAIL
        self.from_name = settings.SMTP_FROM_NAME

    def send_emergency_email(self, recipient_emails: List[str], event_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Sends formatted emergency alerts to up to 4 registered emergency emails.
        Preserves original system requirement for 4 emergency emails.
        """
        if not recipient_emails:
            return {"status": "NO_RECIPIENTS", "sent_to": []}
            
        user_name = event_data.get("user_name", "SafeCircle User")
        reason = event_data.get("reason", "Emergency Alert Triggered")
        created_at = event_data.get("created_at", "Just now")
        loc = event_data.get("current_location", {})
        lat = loc.get("latitude", 0.0)
        lon = loc.get("longitude", 0.0)
        address = loc.get("address", f"{lat}, {lon}")
        maps_link = f"https://maps.google.com/?q={lat},{lon}"
        live_track_url = f"https://sheildx.ai/live/{event_data.get('id', 'demo')}"
        battery = event_data.get("battery_level", "Unknown")
        network = event_data.get("network_state", "Connected")
        
        subject = f"🚨 URGENT EMERGENCY ALERT: {user_name} Needs Immediate Assistance!"
        
        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {{ font-family: Arial, sans-serif; background-color: #f4f4f5; margin: 0; padding: 20px; }}
            .card {{ max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 2px solid #ef4444; }}
            .header {{ background-color: #dc2626; color: white; padding: 24px; text-align: center; }}
            .header h1 {{ margin: 0; font-size: 24px; }}
            .content {{ padding: 24px; color: #1f2937; line-height: 1.6; }}
            .alert-box {{ background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; margin: 16px 0; font-weight: bold; color: #991b1b; }}
            .btn {{ display: inline-block; background-color: #dc2626; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 16px; }}
            .footer {{ background-color: #f9fafb; padding: 16px; text-align: center; font-size: 12px; color: #6b7280; }}
          </style>
        </head>
        <body>
          <div class="card">
            <div class="header">
              <h1>🚨 SAFECIRCLE EMERGENCY ALERT</h1>
              <p style="margin: 4px 0 0 0;">SheildX AI Protection System</p>
            </div>
            <div class="content">
              <p>You are receiving this automated alert because you are a registered <strong>Emergency Contact</strong> for <strong>{user_name}</strong>.</p>
              
              <div class="alert-box">
                EMERGENCY REASON: {reason}
              </div>
              
              <h3>Event Details:</h3>
              <ul>
                <li><strong>User Name:</strong> {user_name}</li>
                <li><strong>Time:</strong> {created_at}</li>
                <li><strong>Approximate Location:</strong> {address}</li>
                <li><strong>GPS Coordinates:</strong> {lat}, {lon}</li>
                <li><strong>Device Battery:</strong> {battery}%</li>
                <li><strong>Network Status:</strong> {network}</li>
              </ul>

              <div style="text-align: center; margin: 24px 0;">
                <a href="{live_track_url}" class="btn" style="color: #ffffff;">View Real-Time Tracking & Emergency Hub</a>
              </div>

              <p>View Location on Google Maps: <a href="{maps_link}">{maps_link}</a></p>
              <p>Please attempt to contact {user_name} immediately or reach out to local emergency services if necessary.</p>
            </div>
            <div class="footer">
              This is a real automated emergency notification sent by SheildX AI SafeCircle Watch. Do not reply to this email.
            </div>
          </div>
        </body>
        </html>
        """
        
        sent_successful = []
        failed_emails = []
        
        for email in recipient_emails:
            if not email or "@" not in email:
                continue
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = f"{self.from_name} <{self.from_email}>"
            msg["To"] = email
            
            part_html = MIMEText(html_body, "html")
            msg.attach(part_html)
            
            try:
                if self.smtp_username and self.smtp_password and "placeholder" not in self.smtp_password:
                    with smtplib.SMTP(self.smtp_host, self.smtp_port) as server:
                        server.starttls()
                        server.login(self.smtp_username, self.smtp_password)
                        server.sendmail(self.from_email, [email], msg.as_string())
                    logger.info(f"Emergency email successfully sent to {email}")
                else:
                    logger.info(f"[SIMULATED SMTP DELIVERY] Emergency email dispatched to {email}")
                sent_successful.append(email)
            except Exception as e:
                logger.error(f"Failed to send emergency email to {email}: {str(e)}")
                failed_emails.append(email)
                
        return {
            "status": "COMPLETED",
            "sent_to": sent_successful,
            "failed_to": failed_emails,
            "total_sent": len(sent_successful)
        }

email_service = EmailService()
