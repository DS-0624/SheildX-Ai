import React, { useEffect, useRef, useState } from 'react';

/**
 * RealMap Component — Renders real interactive OpenStreetMap tiles via Leaflet
 * Supports:
 * - Real map panning, zooming, tile loading
 * - Start marker (Green), Destination marker (Red), Current Location marker (Blue/Amber)
 * - Click on map to set Destination / Start pin (like Rapido, Uber, Google Maps)
 * - Turn-by-turn road polyline path rendering (OSRM)
 * - Advanced Map Themes: Dark, HD Satellite, OpenStreet Standard, Light Day Mode
 * - 1-Click Fullscreen Maximize Map Mode
 */
export default function RealMap({
  startPos = { lat: 28.6139, lng: 77.2090, label: 'Start Point' },
  destPos = { lat: 28.6270, lng: 77.3720, label: 'Destination' },
  currentPos = { lat: 28.6200, lng: 77.2900, label: 'Current Location' },
  routePoints = [],
  isDeviating = false,
  accuracyMeters = 10,
  height = '320px',
  interactive = true,
  onLocationFound = null,
  onMapClick = null,
  tapMode = null, // 'START' | 'DESTINATION' | null
  onToggleMaximize = null
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const tileLayerRef = useRef(null);
  const markersRef = useRef([]);
  const polylineRef = useRef(null);
  const deviationLineRef = useRef(null);
  const circleRef = useRef(null);

  const [mapStyle, setMapStyle] = useState('DARK'); // 'DARK' | 'SATELLITE' | 'STREET' | 'LIGHT'
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Map Tile Providers
  const tileProviders = {
    DARK: {
      url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
      attribution: '&copy; CARTO & OpenStreetMap',
      maxNativeZoom: 19,
      maxZoom: 20,
      label: '🌙 Dark'
    },
    SATELLITE: {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      attribution: 'Tiles &copy; Esri &mdash; HD Satellite Photography',
      maxNativeZoom: 18,
      maxZoom: 20,
      label: '🛰️ Satellite'
    },
    STREET: {
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: '&copy; OpenStreetMap contributors',
      maxNativeZoom: 19,
      maxZoom: 20,
      label: '🗺️ Street'
    },
    LIGHT: {
      url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
      attribution: '&copy; CARTO & OpenStreetMap',
      maxNativeZoom: 19,
      maxZoom: 20,
      label: '☀️ Day Light'
    }
  };

  // Initialize and Update Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (typeof window.L === 'undefined') return;

    const L = window.L;

    // Initialize Leaflet map if not created yet
    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [currentPos.lat || startPos.lat, currentPos.lng || startPos.lng],
        zoom: 14,
        maxZoom: 20,
        zoomControl: interactive,
        dragging: interactive,
        touchZoom: interactive,
        scrollWheelZoom: interactive,
        zoomAnimation: true,
        fadeAnimation: true,
        markerZoomAnimation: true,
        wheelPxPerZoomLevel: 60
      });

      const initialProvider = tileProviders[mapStyle] || tileProviders.DARK;
      const tileLayer = L.tileLayer(initialProvider.url, {
        attribution: initialProvider.attribution,
        maxNativeZoom: initialProvider.maxNativeZoom,
        maxZoom: initialProvider.maxZoom,
        subdomains: 'abcd'
      }).addTo(map);

      tileLayerRef.current = tileLayer;
      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;

    // Update Tile Layer if Style Changed
    if (tileLayerRef.current) {
      const provider = tileProviders[mapStyle] || tileProviders.DARK;
      tileLayerRef.current.options.maxNativeZoom = provider.maxNativeZoom;
      tileLayerRef.current.setUrl(provider.url);
    }

    // Clear existing markers & lines
    markersRef.current.forEach(m => map.removeLayer(m));
    markersRef.current = [];
    if (polylineRef.current) map.removeLayer(polylineRef.current);
    if (deviationLineRef.current) map.removeLayer(deviationLineRef.current);
    if (circleRef.current) map.removeLayer(circleRef.current);

    // Custom SVG Icon Generators
    const createCustomIcon = (color, label) => {
      return L.divIcon({
        className: 'custom-leaflet-marker',
        html: `
          <div style="
            background: ${color};
            width: 20px;
            height: 20px;
            border-radius: 50%;
            border: 3px solid #ffffff;
            box-shadow: 0 0 12px ${color};
            display: flex;
            align-items: center;
            justify-content: center;
          "></div>
          <div style="
            background: rgba(13, 20, 36, 0.95);
            color: #ffffff;
            font-size: 10px;
            font-weight: 700;
            padding: 2px 6px;
            border-radius: 4px;
            border: 1px solid #23314e;
            white-space: nowrap;
            margin-top: 4px;
            box-shadow: 0 2px 6px rgba(0,0,0,0.5);
          ">${label}</div>
        `,
        iconSize: [20, 40],
        iconAnchor: [10, 10]
      });
    };

    // Add Start Marker (Green)
    if (startPos && startPos.lat) {
      const startMarker = L.marker([startPos.lat, startPos.lng], {
        icon: createCustomIcon('#10b981', startPos.label || 'Start')
      }).addTo(map);
      markersRef.current.push(startMarker);
    }

    // Add Destination Marker (Red)
    if (destPos && destPos.lat) {
      const destMarker = L.marker([destPos.lat, destPos.lng], {
        icon: createCustomIcon('#ef4444', destPos.label || 'Destination')
      }).addTo(map);
      markersRef.current.push(destMarker);
    }

    // Add Current User Location Marker (Blue or Amber if deviating)
    if (currentPos && currentPos.lat) {
      const userColor = isDeviating ? '#f59e0b' : '#3b82f6';
      const userLabel = isDeviating ? '⚠️ Off-Route (145m)' : '📍 Live Location';

      const currentMarker = L.marker([currentPos.lat, currentPos.lng], {
        icon: createCustomIcon(userColor, userLabel)
      }).addTo(map);
      markersRef.current.push(currentMarker);

      // Add GPS Accuracy Circle
      const accuracyCircle = L.circle([currentPos.lat, currentPos.lng], {
        radius: Math.max(accuracyMeters, 20),
        color: userColor,
        fillColor: userColor,
        fillOpacity: 0.15,
        stroke: true,
        weight: 1.5
      }).addTo(map);
      circleRef.current = accuracyCircle;
    }

    // Draw Main Real Road Route Polyline (Uber / Rapido / Google Maps style)
    if (routePoints && routePoints.length > 1) {
      const latLngs = routePoints.map(p => [p.lat, p.lng]);
      
      const isSat = mapStyle === 'SATELLITE' || mapStyle === 'STREET';
      const glowColor = isSat ? '#f43f5e' : '#0284c7';
      const lineColor = isSat ? '#ff0055' : '#38bdf8';

      // Outer glow line (Uber/Google Maps navigation style)
      const polylineGlow = L.polyline(latLngs, {
        color: glowColor,
        weight: 9,
        opacity: 0.45,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(map);

      // Inner crisp solid road line
      const polyline = L.polyline(latLngs, {
        color: lineColor,
        weight: 5,
        opacity: 1.0,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(map);

      polylineRef.current = polyline;
      markersRef.current.push(polylineGlow);

      // Draw deviation indicator line if deviating
      if (isDeviating && currentPos && routePoints.length > 0) {
        const nearestPoint = routePoints[Math.floor(routePoints.length / 2)];
        const devLine = L.polyline([[currentPos.lat, currentPos.lng], [nearestPoint.lat, nearestPoint.lng]], {
          color: '#ef4444',
          weight: 4,
          dashArray: '4, 4'
        }).addTo(map);
        deviationLineRef.current = devLine;
      }

      // Auto-fit map bounds to show full route
      const allBounds = L.latLngBounds(latLngs);
      if (currentPos) allBounds.extend([currentPos.lat, currentPos.lng]);
      map.fitBounds(allBounds, { padding: [40, 40] });
    } else if (currentPos) {
      map.setView([currentPos.lat, currentPos.lng], 14);
    }

  }, [startPos, destPos, currentPos, routePoints, isDeviating, accuracyMeters, interactive, mapStyle]);

  // Handle Fullscreen Invalidate Size
  useEffect(() => {
    if (mapInstanceRef.current) {
      setTimeout(() => {
        mapInstanceRef.current.invalidateSize();
      }, 150);
    }
  }, [isFullscreen]);

  // Handle Map Clicks to Set Pin (Uber/Rapido style)
  useEffect(() => {
    if (!mapInstanceRef.current || !onMapClick) return;
    const map = mapInstanceRef.current;

    const handleMapClick = (e) => {
      onMapClick({
        lat: Number(e.latlng.lat.toFixed(4)),
        lng: Number(e.latlng.lng.toFixed(4))
      });
    };

    map.on('click', handleMapClick);
    return () => {
      map.off('click', handleMapClick);
    };
  }, [onMapClick]);

  // Handle Real Browser Live GPS Request
  const handleRequestLiveGPS = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const liveLat = pos.coords.latitude;
          const liveLng = pos.coords.longitude;
          const acc = pos.coords.accuracy;
          if (onLocationFound) {
            onLocationFound({ lat: liveLat, lng: liveLng, accuracy: acc });
          }
          if (mapInstanceRef.current) {
            mapInstanceRef.current.setView([liveLat, liveLng], 15);
          }
        },
        (err) => {
          console.warn('Browser geolocation access error:', err.message);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  };

  // Add Escape key listener to exit fullscreen mode easily
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  const containerStyle = isFullscreen
    ? {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 99000000,
        backgroundColor: '#090d16',
        borderRadius: 0,
        isolation: 'isolate'
      }
    : {
        position: 'relative',
        zIndex: 1,
        isolation: 'isolate',
        width: '100%',
        height: height,
        borderRadius: '12px',
        overflow: 'hidden',
        border: '1px solid #23314e'
      };

  return (
    <div style={containerStyle}>
      <div ref={mapContainerRef} style={{ width: '100%', height: '100%', borderRadius: isFullscreen ? 0 : '12px' }} />

      {/* Top Map Control Bar (Mobile & Desktop Responsive) */}
      <div style={{
        position: 'absolute',
        top: '10px',
        left: '10px',
        right: '10px',
        zIndex: 10000000,
        display: 'flex',
        justify: 'space-between',
        alignItems: 'center',
        gap: '6px',
        pointerEvents: 'none'
      }}>
        {/* Fullscreen Maximize / Exit Button */}
        <button
          onClick={() => {
            if (onToggleMaximize) {
              onToggleMaximize();
            } else {
              setIsFullscreen(!isFullscreen);
            }
          }}
          title={isFullscreen ? 'Exit Fullscreen Map View (or press ESC key)' : 'Maximize Map View (View Entire Route)'}
          style={{
            pointerEvents: 'auto',
            background: isFullscreen ? '#ef4444' : 'rgba(13, 20, 36, 0.95)',
            color: '#ffffff',
            border: isFullscreen ? '2px solid #ffffff' : '1px solid #3b82f6',
            borderRadius: '8px',
            padding: isFullscreen ? '8px 14px' : '6px 10px',
            fontSize: '11px',
            fontWeight: '900',
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(0,0,0,0.8)',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            whiteSpace: 'nowrap'
          }}
        >
          {isFullscreen ? '✕ EXIT' : '⛶ MAXIMIZE'}
        </button>

        {/* Map Layer Theme Pills */}
        <div style={{
          pointerEvents: 'auto',
          display: 'flex',
          gap: '2px',
          background: 'rgba(13, 20, 36, 0.95)',
          backdropFilter: 'blur(8px)',
          padding: '3px',
          borderRadius: '8px',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          boxShadow: '0 4px 14px rgba(0,0,0,0.8)',
          maxWidth: 'calc(100% - 100px)',
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch'
        }}>
          {Object.keys(tileProviders).map((key) => (
            <button
              key={key}
              onClick={() => setMapStyle(key)}
              style={{
                background: mapStyle === key ? '#3b82f6' : 'transparent',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                padding: '4px 8px',
                fontSize: '10px',
                fontWeight: mapStyle === key ? 'bold' : 'normal',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              {tileProviders[key].label}
            </button>
          ))}
        </div>
      </div>

      {/* Tap Mode Banner Hint */}
      {tapMode && (
        <div style={{
          position: 'absolute',
          top: '54px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 1000,
          background: tapMode === 'START' ? 'rgba(16, 185, 129, 0.95)' : 'rgba(239, 68, 68, 0.95)',
          color: '#ffffff',
          padding: '6px 16px',
          borderRadius: '20px',
          fontSize: '12px',
          fontWeight: 'bold',
          boxShadow: '0 4px 14px rgba(0,0,0,0.5)',
          pointerEvents: 'none'
        }}>
          👇 Tap anywhere on map to set {tapMode === 'START' ? 'START' : 'DESTINATION'} pin!
        </div>
      )}
      
      {/* Real Live GPS Locate Me Button */}
      {interactive && (
        <button
          onClick={handleRequestLiveGPS}
          title="Locate my actual GPS device position"
          style={{
            position: 'absolute',
            bottom: '12px',
            right: '12px',
            zIndex: 1000,
            background: '#131b2e',
            color: '#3b82f6',
            border: '1px solid #23314e',
            borderRadius: '8px',
            padding: '8px 12px',
            fontSize: '11px',
            fontWeight: 'bold',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          🎯 Use My Device GPS
        </button>
      )}
    </div>
  );
}
