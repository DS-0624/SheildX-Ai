import pytest
from app.services.route_engine import RouteEngine, haversine_distance

def test_haversine_distance():
    # Distance between two known points (approx 1.11 km for 0.01 deg lat)
    dist = haversine_distance(12.9716, 77.5946, 12.9816, 77.5946)
    assert 1100 <= dist <= 1120

def test_route_engine_normal_progress():
    engine = RouteEngine(deviation_threshold_m=150.0, accuracy_threshold_m=50.0)
    planned = [(12.9716, 77.5946), (12.9816, 77.5946)]
    
    # Point directly on route
    res = engine.evaluate_location_point("j_1", 12.9750, 77.5946, accuracy=10.0, planned_points=planned)
    assert res["is_deviating"] is False
    assert res["consecutive_deviations"] == 0

def test_route_engine_small_gps_noise():
    engine = RouteEngine(deviation_threshold_m=150.0, accuracy_threshold_m=50.0)
    planned = [(12.9716, 77.5946), (12.9816, 77.5946)]
    
    # Small shift of 20 meters (well within 150m tolerance)
    res = engine.evaluate_location_point("j_2", 12.9750, 77.5948, accuracy=15.0, planned_points=planned)
    assert res["is_deviating"] is False

def test_route_engine_sustained_deviation():
    engine = RouteEngine(deviation_threshold_m=150.0, accuracy_threshold_m=50.0)
    planned = [(12.9716, 77.5946), (12.9816, 77.5946)]
    
    # Large deviation of 500 meters off route
    # First point: consecutive_deviations = 1 (needs 2 consecutive to trigger deviation flag)
    res1 = engine.evaluate_location_point("j_3", 12.9750, 77.6000, accuracy=10.0, planned_points=planned)
    assert res1["is_deviating"] is False
    assert res1["consecutive_deviations"] == 1
    
    # Second consecutive point off route -> triggers deviation!
    res2 = engine.evaluate_location_point("j_3", 12.9755, 77.6005, accuracy=10.0, planned_points=planned)
    assert res2["is_deviating"] is True
    assert res2["consecutive_deviations"] == 2
