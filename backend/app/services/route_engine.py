import math
from typing import List, Tuple, Dict, Any
from app.core.config import settings

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate the great circle distance in meters between two points 
    on the earth specified in decimal degrees.
    """
    R = 6371000.0  # Radius of earth in meters
    dLat = math.radians(lat2 - lat1)
    dLon = math.radians(lon2 - lon1)
    a = (math.sin(dLat / 2) * math.sin(dLat / 2) +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dLon / 2) * math.sin(dLon / 2))
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    distance = R * c
    return distance

def point_to_segment_distance(px: float, py: float, ax: float, ay: float, bx: float, by: float) -> float:
    """
    Distance from point P to line segment AB in meters approximation.
    """
    # For small geographic distances, treat lat/lon as approximate Cartesian plane with lat scaling
    lat_scale = math.cos(math.radians((ay + by) / 2.0))
    px_m = px * 111000.0 * lat_scale
    py_m = py * 111000.0
    ax_m = ax * 111000.0 * lat_scale
    ay_m = ay * 111000.0
    bx_m = bx * 111000.0 * lat_scale
    by_m = by * 111000.0
    
    ab_x = bx_m - ax_m
    ab_y = by_m - ay_m
    ap_x = px_m - ax_m
    ap_y = py_m - ay_m
    
    ab_len_sq = ab_x * ab_x + ab_y * ab_y
    if ab_len_sq == 0:
        return math.sqrt(ap_x * ap_x + ap_y * ap_y)
        
    t = (ap_x * ab_x + ap_y * ab_y) / ab_len_sq
    t = max(0.0, min(1.0, t))
    
    proj_x = ax_m + t * ab_x
    proj_y = ay_m + t * ab_y
    
    dx = px_m - proj_x
    dy = py_m - proj_y
    return math.sqrt(dx * dx + dy * dy)

class RouteEngine:
    def __init__(self, deviation_threshold_m: float = None, accuracy_threshold_m: float = None):
        self.deviation_threshold_m = deviation_threshold_m or settings.ROUTE_DEVIATION_TOLERANCE_METERS
        self.accuracy_threshold_m = accuracy_threshold_m or settings.GPS_ACCURACY_THRESHOLD_METERS
        self.journey_states: Dict[str, Dict[str, Any]] = {}
        
    def calculate_distance_to_route(self, current_lat: float, current_lon: float, 
                                   planned_points: List[Tuple[float, float]]) -> float:
        """
        Calculates minimum distance in meters from current position to planned route.
        """
        if not planned_points:
            return 0.0
        if len(planned_points) == 1:
            return haversine_distance(current_lat, current_lon, planned_points[0][0], planned_points[0][1])
            
        min_dist = float('inf')
        for i in range(len(planned_points) - 1):
            ax, ay = planned_points[i][1], planned_points[i][0]
            bx, by = planned_points[i+1][1], planned_points[i+1][0]
            dist = point_to_segment_distance(current_lon, current_lat, ax, ay, bx, by)
            if dist < min_dist:
                min_dist = dist
        return min_dist

    def evaluate_location_point(self, journey_id: str, current_lat: float, current_lon: float,
                                accuracy: float, planned_points: List[Tuple[float, float]]) -> Dict[str, Any]:
        """
        Evaluates a new location point for route deviation.
        Applies GPS accuracy filter, noise reduction, and consecutive counter.
        """
        # Filter out noisy GPS readings
        if accuracy > self.accuracy_threshold_m:
            return {
                "is_deviating": False,
                "reason": "GPS accuracy too low, reading ignored",
                "distance_to_route_m": 0.0,
                "consecutive_deviations": 0
            }
            
        distance = self.calculate_distance_to_route(current_lat, current_lon, planned_points)
        
        state = self.journey_states.get(journey_id, {"consecutive_deviations": 0, "last_check_status": "NORMAL"})
        
        if distance > self.deviation_threshold_m:
            state["consecutive_deviations"] += 1
        else:
            state["consecutive_deviations"] = 0
            state["last_check_status"] = "NORMAL"
            
        self.journey_states[journey_id] = state
        
        is_meaningful_deviation = state["consecutive_deviations"] >= settings.MIN_CONSECUTIVE_DEVIATIONS
        
        return {
            "is_deviating": is_meaningful_deviation,
            "distance_to_route_m": round(distance, 2),
            "consecutive_deviations": state["consecutive_deviations"],
            "reason": f"Sustained route deviation detected ({round(distance, 1)}m off route)" if is_meaningful_deviation else "Normal journey progress"
        }

route_engine = RouteEngine()
