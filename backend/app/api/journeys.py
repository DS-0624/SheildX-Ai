from fastapi import APIRouter, HTTPException, Depends, status
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone, timedelta
from app.models.schemas import JourneyCreate, Journey, LocationPoint
from app.core.security import get_current_user
from app.core.firebase import get_db
from app.services.route_engine import route_engine, haversine_distance
from app.services.escalation_engine import escalation_engine

router = APIRouter(prefix="/journeys", tags=["Journey Management"])

@router.post("/calculate-eta")
def calculate_suggested_eta(start: LocationPoint, destination: LocationPoint):
    """
    Calculates estimated travel time & distance between start location and destination.
    """
    dist_m = haversine_distance(start.latitude, start.longitude, destination.latitude, destination.longitude)
    dist_km = round(dist_m / 1000.0, 2)
    # Estimate speed at ~25 km/h urban commute average
    est_minutes = max(5, int((dist_km / 25.0) * 60))
    
    now = datetime.now(timezone.utc)
    suggested_arrival = (now + timedelta(minutes=est_minutes)).isoformat()
    
    return {
        "distance_km": dist_km,
        "estimated_minutes": est_minutes,
        "suggested_arrival_time": suggested_arrival
    }

@router.post("/start", response_model=dict)
def start_journey(payload: JourneyCreate, current_user: dict = Depends(get_current_user)):
    """
    Starts a new safety journey.
    Sets start, destination, ETA, route, and notifies registered emergency contacts.
    """
    uid = current_user.get("sub", current_user.get("uid"))
    db = get_db()
    
    journey_id = f"jrn_{int(datetime.now(timezone.utc).timestamp())}_{uid[:6]}"
    now_str = datetime.now(timezone.utc).isoformat()
    
    dist_m = haversine_distance(
        payload.start_location.latitude, payload.start_location.longitude,
        payload.destination.latitude, payload.destination.longitude
    )
    dist_km = round(dist_m / 1000.0, 2)
    est_minutes = max(5, int((dist_km / 25.0) * 60))
    
    # Generate sample linear polyline route points between start and destination for route matching
    planned_points = [
        (payload.start_location.latitude, payload.start_location.longitude),
        (
            (payload.start_location.latitude + payload.destination.latitude) / 2.0,
            (payload.start_location.longitude + payload.destination.longitude) / 2.0
        ),
        (payload.destination.latitude, payload.destination.longitude)
    ]
    
    # Fetch user emergency contacts
    user_doc = db.collection("users").document(uid).get()
    emergency_emails = user_doc.to_dict().get("emergency_emails", []) if user_doc.exists else []
    
    journey_data = {
        "id": journey_id,
        "owner_uid": uid,
        "user_name": current_user.get("name", "SafeCircle User"),
        "start_location": payload.start_location.model_dump(),
        "destination": payload.destination.model_dump(),
        "destination_name": payload.destination_name,
        "expected_arrival_time": payload.expected_arrival_time,
        "planned_points": planned_points,
        "status": "ACTIVE",
        "started_at": now_str,
        "ended_at": None,
        "eta_minutes": est_minutes,
        "distance_km": dist_km,
        "current_route_status": "NORMAL",
        "emergency_emails": emergency_emails
    }
    
    db.collection("journeys").document(journey_id).set(journey_data)
    db.collection("users").document(uid).update({"active_journey_id": journey_id})
    
    return {
        "message": "Journey started successfully",
        "journey": journey_data
    }

@router.post("/{journey_id}/location-update")
def process_location_update(
    journey_id: str,
    location: LocationPoint,
    accuracy: float = 10.0,
    current_user: dict = Depends(get_current_user)
):
    """
    Evaluates real-time location update against active journey route.
    If sustained deviation is detected, triggers Private Safety Check #1 (Are you safe?).
    """
    uid = current_user.get("sub", current_user.get("uid"))
    db = get_db()
    
    jdoc = db.collection("journeys").document(journey_id).get()
    if not jdoc.exists:
        raise HTTPException(status_code=404, detail="Active journey not found")
        
    jdata = jdoc.to_dict()
    planned_points = jdata.get("planned_points", [])
    
    # Check route engine evaluation
    eval_res = route_engine.evaluate_location_point(
        journey_id=journey_id,
        current_lat=location.latitude,
        current_lon=location.longitude,
        accuracy=accuracy,
        planned_points=planned_points
    )
    
    check_info = None
    if eval_res["is_deviating"]:
        # Initiate Private Safety Check #1 (30s timer)
        user_name = current_user.get("name", jdata.get("user_name", "SafeCircle User"))
        user_phone = jdata.get("user_phone", "Unspecified")
        emergency_emails = jdata.get("emergency_emails", [])
        
        check_info = escalation_engine.start_private_safety_check(
            journey_id=journey_id,
            owner_uid=uid,
            user_name=user_name,
            user_phone=user_phone,
            reason=eval_res["reason"],
            current_location=location,
            emergency_emails=emergency_emails
        )
        db.collection("journeys").document(journey_id).update({"current_route_status": "DEVIATING"})
        
    return {
        "journey_id": journey_id,
        "route_evaluation": eval_res,
        "private_check": check_info
    }

@router.post("/{journey_id}/end")
def end_journey(journey_id: str, current_user: dict = Depends(get_current_user)):
    """
    Ends active journey ("ARRIVED SAFELY").
    Stops route monitoring and clears active journey state.
    """
    uid = current_user.get("sub", current_user.get("uid"))
    db = get_db()
    now_str = datetime.now(timezone.utc).isoformat()
    
    db.collection("journeys").document(journey_id).update({
        "status": "COMPLETED",
        "ended_at": now_str,
        "current_route_status": "ARRIVED_SAFELY"
    })
    db.collection("users").document(uid).update({"active_journey_id": None})
    
    # Clean up route engine state
    if journey_id in route_engine.journey_states:
        del route_engine.journey_states[journey_id]
        
    return {
        "message": "Journey completed successfully. Arrived safely!",
        "journey_id": journey_id,
        "ended_at": now_str
    }
