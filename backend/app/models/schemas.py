from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone

class UserRole:
    USER = "USER"
    CHILD = "CHILD"
    PARENT = "PARENT"
    GUARDIAN = "GUARDIAN"
    ADMIN = "ADMIN"

class EventState:
    SAFE = "SAFE"
    JOURNEY_ACTIVE = "JOURNEY_ACTIVE"
    PRIVATE_CHECK = "PRIVATE_CHECK"
    ALERT = "ALERT"
    LIVE_RESPONSE = "LIVE_RESPONSE"
    RESOLVED = "RESOLVED"

class TriggerReason:
    VOICE_EMERGENCY = "VOICE_EMERGENCY"
    MANUAL_SOS = "MANUAL_SOS"
    USER_PRESSED_NO = "USER_PRESSED_NO"
    ROUTE_DEVIATION_TIMEOUT = "ROUTE_DEVIATION_TIMEOUT"
    MISSED_ARRIVAL = "MISSED_ARRIVAL"
    MISSED_CHECK_IN = "MISSED_CHECK_IN"
    FALL_IMPACT = "FALL_IMPACT"
    WATCH_DISCONNECTED = "WATCH_DISCONNECTED"

# --- Emergency Contact Schema (Supports 4 Emails) ---
class EmergencyContactCreate(BaseModel):
    name: str
    phone: str
    email: EmailStr
    priority: int = 1
    whatsapp_enabled: bool = True

class EmergencyContact(EmergencyContactCreate):
    id: str
    owner_uid: str
    verified: bool = True
    created_at: str

class UserRegistration(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    phone: str
    gender: Optional[str] = "unspecified"
    role: str = UserRole.USER
    # 4 Emergency Emails explicitly required
    emergency_email_1: EmailStr
    emergency_email_2: Optional[EmailStr] = None
    emergency_email_3: Optional[EmailStr] = None
    emergency_email_4: Optional[EmailStr] = None
    guardian_phone: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserProfile(BaseModel):
    uid: str
    email: EmailStr
    full_name: str
    phone: str
    gender: Optional[str] = None
    role: str
    emergency_emails: List[str] = []
    created_at: str
    privacy_settings: Dict[str, Any] = Field(default_factory=lambda: {
        "emergency_only_location": False,
        "journey_only_location": True,
        "voice_enabled": True,
        "audio_recording_enabled": False
    })

# --- Voice Code Schema ---
class VoiceCodeConfig(BaseModel):
    emergency_phrase: str = "Blue Jasmine"
    checkin_phrase: Optional[str] = "Safe Check"
    enabled: bool = True
    confidence_threshold: float = 0.75
    language: str = "en-US"

# --- Journey Schema ---
class LocationPoint(BaseModel):
    latitude: float
    longitude: float
    address: Optional[str] = None
    timestamp: Optional[str] = None

class JourneyCreate(BaseModel):
    start_location: LocationPoint
    destination: LocationPoint
    destination_name: str
    expected_arrival_time: str
    planned_route_polyline: Optional[str] = None
    notified_contacts: List[str] = []

class Journey(JourneyCreate):
    id: str
    owner_uid: str
    status: str  # ACTIVE, COMPLETED, CANCELLED, ESCALATED
    started_at: str
    ended_at: Optional[str] = None
    eta_minutes: int = 30
    distance_km: float = 5.0
    current_route_status: str = "NORMAL"  # NORMAL, DEVIATING, MISSED_ETA

# --- Safety Check / Signal Schema ---
class SafetySignal(BaseModel):
    journey_id: str
    signal_type: str  # ROUTE_DEVIATION, MISSED_ARRIVAL, FALL, VOICE_CHECKIN, WATCH_DISCONNECT
    latitude: float
    longitude: float
    accuracy: float = 10.0
    timestamp: str
    metadata: Dict[str, Any] = Field(default_factory=dict)

class CheckResponse(BaseModel):
    event_id: Optional[str] = None
    journey_id: str
    check_index: int  # 1, 2, or 3
    is_safe: bool     # True = YES, False = NO

# --- Emergency Event & Timeline ---
class LocationUpdate(BaseModel):
    latitude: float
    longitude: float
    accuracy: float = 5.0
    source: str = "PHONE_GPS"  # PHONE_GPS, WATCH_GPS, LTE_WATCH
    timestamp: str
    battery_level: int = 100
    network_state: str = "4G/5G"

class TimelineItem(BaseModel):
    id: str
    event_type: str
    message: str
    timestamp: str
    actor: str  # USER, SYSTEM, GUARDIAN

class EmergencyEvent(BaseModel):
    id: str
    owner_uid: str
    user_name: str
    user_phone: str
    journey_id: Optional[str] = None
    state: str = EventState.ALERT
    trigger: str  # VOICE_EMERGENCY, MANUAL_SOS, USER_PRESSED_NO, ROUTE_DEVIATION_TIMEOUT
    reason: str
    risk_score: float = 0.95
    created_at: str
    updated_at: str
    current_location: LocationPoint
    battery_level: int = 85
    network_state: str = "CONNECTED"
    emergency_emails_notified: List[str] = []
    whatsapp_notified: bool = False
    acknowledged_by: Optional[str] = None
    acknowledged_at: Optional[str] = None
    resolved_by: Optional[str] = None
    resolved_at: Optional[str] = None
    timeline: List[TimelineItem] = []

# --- Guardian Relationship ---
class GuardianInvitation(BaseModel):
    invitation_code: str
    child_uid: str
    child_name: str
    created_at: str
    expires_at: str

class RelationshipLink(BaseModel):
    relationship_id: str
    parent_uid: str
    parent_name: str
    child_uid: str
    child_name: str
    status: str = "ACTIVE"  # PENDING, ACTIVE, REVOKED
    created_at: str
