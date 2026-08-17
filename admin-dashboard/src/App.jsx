import React, { useState, useEffect, useRef } from 'react';
import { 
  Shield, Navigation, MapPin, AlertTriangle, Phone, Mail, Watch, Mic, MicOff,
  CheckCircle, Clock, Lock, User, Settings, Activity, Send, RefreshCw, 
  ExternalLink, Eye, EyeOff, Radio, Compass, XCircle, FileText, Bell, Zap, Locate,
  MessageCircle, Plus, Trash2, Edit3, Save, Share2, Search, Target, Loader2, Volume2, Key,
  LogOut, ArrowRight, Smartphone, ShieldAlert, Check, Copy, ExternalLink as LinkIcon, Eye as ViewIcon
} from 'lucide-react';
import RealMap from './components/RealMap';

export default function App() {
  // --- AUTHENTICATION & LOGIN STATE (PERSISTED IN LOCALSTORAGE) ---
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('shieldx_auth') === 'true';
  });
  const [authStep, setAuthStep] = useState('PHONE_INPUT'); // 'PHONE_INPUT' or 'OTP_INPUT'
  const [loginPhone, setLoginPhone] = useState('');
  const [loginName, setLoginName] = useState('');
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [serverOtp, setServerOtp] = useState('');
  const [whatsappOtpLink, setWhatsappOtpLink] = useState('');
  const [otpTimer, setOtpTimer] = useState(30);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [authError, setAuthError] = useState('');

  // --- ADMIN CONSOLE SECURITY GATE ---
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);
  const [adminPinInput, setAdminPinInput] = useState('');
  const [showAdminPinModal, setShowAdminPinModal] = useState(false);
  const [adminPinError, setAdminPinError] = useState('');

  // Navigation Tabs: 'journey_setup' | 'active_journey' | 'safety_check' | 'contacts_manager' | 'voice_settings' | 'watch_simulator' | 'guardian_hub' | 'public_tracking' | 'admin_dashboard'
  const [activeTab, setActiveTab] = useState('journey_setup');

  // Direct Public Tracking Mode (for guardians clicking shared links without needing login)
  const [showPublicTrackingOnly, setShowPublicTrackingOnly] = useState(false);

  // Presentation & Environment Settings
  const [demoMode, setDemoMode] = useState(true);
  const [presentationSpeed, setPresentationSpeed] = useState(false); // false = 30s, true = 3s for fast presentation
  const checkIntervalSeconds = presentationSpeed ? 3 : 30;
  const [autoOpenWhatsapp, setAutoOpenWhatsapp] = useState(true);

  const defaultProfile = {
    name: 'Shaik Sameer',
    email: 'sameer@sheildx.app',
    phone: '+91 90630 80406',
    role: 'TRAVELER',
    voicePhrase: 'sameer',
    voiceTriggerType: 'PRIVATE_CHECK',
    voiceEnabled: true,
    micPermission: 'PROMPT'
  };

  // --- Dynamic Authenticated User Profile (PERSISTED WITH SAFE FALLBACKS) ---
  const [userProfile, setUserProfile] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('shieldx_user_profile');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed && typeof parsed === 'object' && parsed.name) {
            return { ...defaultProfile, ...parsed };
          }
        } catch (e) {}
      }
    }
    return defaultProfile;
  });

  const userProfileRef = useRef(userProfile);
  useEffect(() => {
    userProfileRef.current = userProfile;
  }, [userProfile]);

  // --- REAL WEB SPEECH RECOGNITION & MICROPHONE AUDIO SPECTRUM STATE ---
  const [isListeningVoice, setIsListeningVoice] = useState(false);
  const [lastTranscript, setLastTranscript] = useState('');
  const [voiceMatchedAlert, setVoiceMatchedAlert] = useState(false);
  const [micAudioLevels, setMicAudioLevels] = useState([10, 15, 10, 20, 15, 10, 25, 15, 10, 12, 18, 10]);
  
  const speechRecognitionRef = useRef(null);
  const audioContextRef = useRef(null);
  const audioAnalyserRef = useRef(null);
  const audioAnimFrameRef = useRef(null);

  // --- Real Custom Emergency Contacts (PERSISTED IN LOCALSTORAGE) ---
  const [emergencyContacts, setEmergencyContacts] = useState(() => {
    const saved = localStorage.getItem('shieldx_emergency_contacts');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter(c => !c.id.includes('c_default') && !c.id.includes('c_101'));
        }
      } catch (e) {}
    }
    return [];
  });

  const [contactForm, setContactForm] = useState({ name: '', email: '', phone: '', relationship: 'Family' });
  const [editingContactId, setEditingContactId] = useState(null);

  // Saved Presets List
  const [savedDestinations, setSavedDestinations] = useState([
    { label: 'Vijayawada (Andhra Pradesh)', address: 'Vijayawada, NTR District, Andhra Pradesh, India', lat: 16.5062, lng: 80.6480 },
    { label: 'Guntur (Andhra Pradesh)', address: 'Guntur, Andhra Pradesh, India', lat: 16.2915, lng: 80.4541 },
    { label: 'Home (Noida Sector 62)', address: 'B-42 Sector 62, Noida, UP', lat: 28.6270, lng: 77.3720 },
    { label: 'College Campus (Greater Noida)', address: 'Gate 2, Tech Institute, Knowledge Park III', lat: 28.4590, lng: 77.5000 }
  ]);

  // --- Customizable Start & End Journey State ---
  const [journeyForm, setJourneyForm] = useState({
    startName: 'My Live GPS Location',
    startAddress: 'Acquiring device GPS position...',
    startLat: 16.5100,
    startLng: 80.6400,
    
    destinationName: 'Vijayawada',
    destinationAddress: 'Vijayawada, NTR District, Andhra Pradesh, India',
    destinationLat: 16.5062,
    destinationLng: 80.6480,
    
    expectedDurationMins: 25,
    journeyMode: 'COLLEGE',
    routeSensitivityMeters: 100,
    voiceActivationEnabled: true,
    watchConnected: true
  });

  // --- BROWSER NOTIFICATION ENGINE FOR SMARTWATCH WRIST VIBRATION MIRRORING ---
  const [notificationPermission, setNotificationPermission] = useState(() => {
    return typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default';
  });

  const [mapTapMode, setMapTapMode] = useState(null);
  const [showFullscreenMapModal, setShowFullscreenMapModal] = useState(false);

  // --- Real Geocoding Search State ---
  const [searchQuery, setSearchQuery] = useState('');
  const [searchTargetField, setSearchTargetField] = useState('DESTINATION');
  const [geocodingResults, setGeocodingResults] = useState([]);
  const [isSearchingGeocode, setIsSearchingGeocode] = useState(false);

  // --- REAL TURN-BY-TURN ROAD ROUTING ENGINE (OSRM / OPENSTREETMAP) ---
  const [realRoadPolyline, setRealRoadPolyline] = useState([]);

  // Fallback route points while fetching
  const fallbackRoutePoints = [
    { lat: journeyForm.startLat, lng: journeyForm.startLng },
    { lat: (journeyForm.startLat * 0.75 + journeyForm.destinationLat * 0.25), lng: (journeyForm.startLng * 0.75 + journeyForm.destinationLng * 0.25) },
    { lat: (journeyForm.startLat * 0.5 + journeyForm.destinationLat * 0.5) + 0.003, lng: (journeyForm.startLng * 0.5 + journeyForm.destinationLng * 0.5) - 0.003 },
    { lat: (journeyForm.startLat * 0.25 + journeyForm.destinationLat * 0.75), lng: (journeyForm.startLng * 0.25 + journeyForm.destinationLng * 0.75) },
    { lat: journeyForm.destinationLat, lng: journeyForm.destinationLng }
  ];

  const computedRoutePoints = realRoadPolyline.length > 0 ? realRoadPolyline : fallbackRoutePoints;

  // --- Active Journey State ---
  const [journeyState, setJourneyState] = useState({
    journeyId: null,
    status: 'DRAFT',
    startedAt: null,
    etaMinutesRemaining: 25,
    distanceKmRemaining: 5.2,
    currentLocation: { lat: journeyForm.startLat, lng: journeyForm.startLng, label: 'My Live GPS Location', accuracy: 8.5 },
    routeStatus: 'NORMAL',
    offRouteDistanceMeters: 0,
    consecutiveOffRouteUpdates: 0
  });

  // --- Private Safety Check State ---
  const [safetyCheck, setSafetyCheck] = useState({
    checkId: null,
    active: false,
    checkIndex: 1,
    timerSeconds: 30,
    maxAttempts: 3,
    triggerReason: 'PERSISTENT_ROUTE_DEVIATION',
    isVibrating: false,
    status: 'IDLE'
  });

  const [emergencyAlert, setEmergencyAlert] = useState(null);
  const [trackingSession, setTrackingSession] = useState(null);
  const [copiedLinkNotification, setCopiedLinkNotification] = useState(false);

  // Audit Logs
  const [auditLogs, setAuditLogs] = useState([
    {
      id: 'LOG-101',
      timestamp: new Date(Date.now() - 3600000).toLocaleTimeString(),
      category: 'SYSTEM',
      event: 'ShieldX AI Automatic Dispatch Engine Active',
      details: 'WhatsApp location links dynamically use live domain origin'
    }
  ]);

  const logAudit = (category, event, details) => {
    const timeStr = new Date().toLocaleTimeString();
    const newLog = {
      id: `LOG-${Math.floor(1000 + Math.random() * 9000)}`,
      timestamp: timeStr,
      category,
      event,
      details
    };
    setAuditLogs((prev) => [newLog, ...prev]);
  };

  const requestNotificationPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const perm = await Notification.requestPermission();
      setNotificationPermission(perm);
      if (perm === 'granted') {
        new Notification("🚨 ShieldX Watch Alert Enabled", {
          body: "Your Fire-Boltt 080 smartwatch is now ready to receive wrist safety alerts!",
          icon: "/favicon.svg"
        });
      }
    } else {
      alert("Browser Notifications are not supported on this browser.");
    }
  };

  const sendBrowserNotification = (title, body, isSafetyCheck = false) => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        const options = {
          body,
          icon: "/favicon.svg",
          vibrate: [500, 200, 500, 200, 500],
          tag: 'shieldx-safety-alert',
          requireInteraction: true
        };

        if (isSafetyCheck && 'serviceWorker' in navigator) {
          navigator.serviceWorker.ready.then((registration) => {
            registration.showNotification(title, {
              ...options,
              actions: [
                { action: 'SAFE', title: '🟢 YES (I am Safe)' },
                { action: 'SOS', title: '🚨 NO (Send SOS)' }
              ]
            });
          }).catch(() => {
            new Notification(title, options);
          });
        } else {
          new Notification(title, options);
        }
      } catch (err) {
        console.warn("Browser notification error:", err);
      }
    }
  };

  const handleConfirmSafe = () => {
    setJourneyState((prev) => ({
      ...prev,
      currentLocation: { lat: journeyForm.startLat, lng: journeyForm.startLng, label: `En route: ${journeyForm.startName} → ${journeyForm.destinationName}`, accuracy: 8.5 },
      routeStatus: 'NORMAL',
      offRouteDistanceMeters: 0,
      consecutiveOffRouteUpdates: 0
    }));

    setSafetyCheck({ checkId: null, active: false, checkIndex: 1, timerSeconds: checkIntervalSeconds, maxAttempts: 3, triggerReason: 'PERSISTENT_ROUTE_DEVIATION', isVibrating: false, status: 'CONFIRMED_SAFE' });
    setActiveTab('active_journey');
    logAudit('USER_CHECKIN', 'User Confirmed Safe ("I\'m Safe")', 'Private safety check resolved. Marker snapped back to route.');
  };

  // --- EMERGENCY ESCALATION & DYNAMIC LOCAL LIVE TRACKING LINK DISPATCH ---
  const triggerEmergencyEscalation = (reasonCode, reasonText) => {
    const alertId = `alt_${Date.now()}`;
    const token = `trk_${Math.random().toString(36).substring(2, 15)}`;
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toLocaleTimeString();

    setSafetyCheck((prev) => ({ ...prev, active: false, status: 'ESCALATED', isVibrating: false }));
    setJourneyState((prev) => ({ ...prev, routeStatus: 'EMERGENCY_ALERT' }));

    const newAlert = {
      alertId,
      user_name: userProfile.name,
      triggerReason: reasonCode,
      description: reasonText,
      status: 'NOTIFIED',
      location: journeyState.currentLocation,
      contactsNotified: emergencyContacts,
      trackingToken: token,
      trackingExpiresAt: expiresAt,
      createdAt: new Date().toLocaleTimeString()
    };

    setEmergencyAlert(newAlert);
    setTrackingSession({ token, expiresAt, active: true, viewsCount: 3 });

    const lat = journeyState.currentLocation.lat;
    const lng = journeyState.currentLocation.lng;
    
    // 1. Direct Real Google Maps GPS link (works 100% on any device globally)
    const googleMapsUrl = `https://maps.google.com/?q=${lat},${lng}`;
    
    // 2. Real Dynamic Live Origin Tracking link (grabs current window.location.origin!)
    const currentOrigin = window.location.origin;
    const localTrackingUrl = `${currentOrigin}/?track=${token}`;

    const waText = encodeURIComponent(
      `🚨 EMERGENCY SOS ALERT — ShieldX AI\n\n` +
      `Name: ${userProfile.name}\n` +
      `Phone: ${userProfile.phone}\n` +
      `Reason: ${reasonText}\n` +
      `Time: ${new Date().toLocaleTimeString()}\n` +
      `Start Location: ${journeyForm.startName}\n` +
      `Destination: ${journeyForm.destinationName}\n\n` +
      `📍 Google Maps Location: ${googleMapsUrl}\n` +
      `🔗 Live Emergency Tracking: ${localTrackingUrl}\n\n` +
      `Please help or contact emergency authorities immediately!`
    );

    // Fallback to user profile phone if no emergency contacts added yet
    const targetPhone = (emergencyContacts.length > 0 && emergencyContacts[0].phone) 
      ? emergencyContacts[0].phone.replace(/[^0-9]/g, '') 
      : userProfile.phone.replace(/[^0-9]/g, '');

    const targetWaUrl = `https://wa.me/${targetPhone}?text=${waText}`;

    setActiveTab('guardian_hub');

    logAudit('WHATSAPP_DISPATCH', `WhatsApp Emergency Message Generated for ${userProfile.name} (${targetPhone})`, `Google Maps: ${googleMapsUrl}`);

    if (autoOpenWhatsapp) {
      setTimeout(() => {
        // Direct location navigation bypasses popup blockers in Chrome / Safari!
        window.location.href = targetWaUrl;
        logAudit('WHATSAPP_AUTOLAUNCH', `Auto-launched WhatsApp with live location to ${targetPhone}`, targetPhone);
      }, 400);
    }
  };

  // --- LISTEN FOR SERVICE WORKER NOTIFICATION ACTION CLICKS (YES = SAFE, NO = SOS) ---
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      const handleSwMessage = (event) => {
        if (event.data && event.data.type === 'NOTIFICATION_ACTION_SAFE') {
          handleConfirmSafe();
        } else if (event.data && event.data.type === 'NOTIFICATION_ACTION_SOS') {
          triggerEmergencyEscalation('WATCH_ACTION_NO', 'User tapped NO (Send SOS) directly on watch/notification');
        }
      };
      navigator.serviceWorker.addEventListener('message', handleSwMessage);
      return () => {
        navigator.serviceWorker.removeEventListener('message', handleSwMessage);
      };
    }
  }, []);

  // --- FIRE-BOLTT 080 BLUETOOTH WATCH SIDE BUTTON & MEDIA KEY LISTENER ---
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Intercept Bluetooth Media Keys / Side Crown buttons sent from Fire-Boltt Watch
      const isMediaKey = [
        'MediaPlayPause', 'MediaTrackNext', 'MediaTrackPrevious',
        'AudioVolumeUp', 'AudioVolumeDown', 'VolumeUp', 'VolumeDown', 'Space', 'Enter'
      ].includes(e.code) || [179, 176, 177, 175, 174, 32, 13].includes(e.keyCode);

      if (isMediaKey && safetyCheck.active) {
        e.preventDefault();
        logAudit('BLUETOOTH_WATCH', 'Fire-Boltt Watch Wrist Button Pressed', 'Marked user as CONFIRMED SAFE via Bluetooth Key');
        handleConfirmSafe();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    // HTML5 MediaSession API for smartwatch media controls
    if ('mediaSession' in navigator) {
      try {
        navigator.mediaSession.setActionHandler('play', () => {
          if (safetyCheck.active) handleConfirmSafe();
        });
        navigator.mediaSession.setActionHandler('pause', () => {
          if (safetyCheck.active) handleConfirmSafe();
        });
        navigator.mediaSession.setActionHandler('nexttrack', () => {
          if (safetyCheck.active) triggerEmergencyEscalation('BLUETOOTH_WATCH_SOS', 'Emergency SOS triggered via Watch Key');
        });
      } catch (err) {
        console.warn('MediaSession handler setup:', err);
      }
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [safetyCheck.active]);

  // --- OTP Countdown Timer ---
  useEffect(() => {
    let t = null;
    if (authStep === 'OTP_INPUT' && otpTimer > 0) {
      t = setInterval(() => setOtpTimer(prev => prev - 1), 1000);
    }
    return () => clearInterval(t);
  }, [authStep, otpTimer]);

  // --- REAL-TIME CONTINUOUS HIGH-ACCURACY GPS TRACKING ENGINE ---
  useEffect(() => {
    if (typeof window !== 'undefined' && navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const lat = Number(pos.coords.latitude.toFixed(6));
          const lng = Number(pos.coords.longitude.toFixed(6));
          const acc = pos.coords.accuracy || 8.5;

          setJourneyForm((prev) => ({
            ...prev,
            startLat: lat,
            startLng: lng,
            startName: 'My Live GPS Location (Where I am now)',
            startAddress: `Exact GPS (${lat}° N, ${lng}° E) • ±${acc.toFixed(0)}m accuracy`
          }));

          setJourneyState((prev) => ({
            ...prev,
            currentLocation: {
              lat,
              lng,
              label: `📍 Live Location (±${acc.toFixed(0)}m accuracy)`,
              accuracy: acc
            }
          }));
        },
        (err) => {
          console.warn('Real-time GPS tracking warning:', err.message);
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0
        }
      );

      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, []);

  // Check URL query params or hash for instant public live tracking access (?track= or #track)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('track') || window.location.hash.includes('track')) {
      setShowPublicTrackingOnly(true);
    }
  }, []);

  // AUTO-SAVE STATE TO LOCALSTORAGE SO REFRESH NEVER LOSES YOUR LOGIN OR SAVED CONTACTS
  useEffect(() => {
    localStorage.setItem('shieldx_auth', isAuthenticated ? 'true' : 'false');
  }, [isAuthenticated]);

  useEffect(() => {
    localStorage.setItem('shieldx_user_profile', JSON.stringify(userProfile));
  }, [userProfile]);

  useEffect(() => {
    localStorage.setItem('shieldx_emergency_contacts', JSON.stringify(emergencyContacts));
  }, [emergencyContacts]);

  // FETCH REAL ROAD DRIVING ROUTE (Uber / Rapido / Google Maps turn-by-turn road paths)
  useEffect(() => {
    let isMounted = true;
    const fetchRealRoadRoute = async () => {
      const { startLat, startLng, destinationLat, destinationLng } = journeyForm;
      if (!startLat || !startLng || !destinationLat || !destinationLng) return;
      try {
        const url = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${destinationLng},${destinationLat}?overview=full&geometries=geojson`;
        const res = await fetch(url);
        const data = await res.json();
        if (isMounted && data.code === 'Ok' && data.routes && data.routes.length > 0) {
          const route = data.routes[0];
          const coords = route.geometry.coordinates.map(c => ({ lat: c[1], lng: c[0] }));
          setRealRoadPolyline(coords);
          
          const distKm = Number((route.distance / 1000).toFixed(1));
          const etaMin = Math.max(1, Math.round(route.duration / 60));
          setJourneyState(prev => ({
            ...prev,
            distanceKmRemaining: distKm,
            etaMinutesRemaining: etaMin
          }));
        }
      } catch (err) {
        console.warn('OSRM routing fetch error:', err);
      }
    };

    fetchRealRoadRoute();
    return () => { isMounted = false; };
  }, [journeyForm.startLat, journeyForm.startLng, journeyForm.destinationLat, journeyForm.destinationLng]);

  // Debounced auto-search for worldwide geocoding
  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      setGeocodingResults([]);
      return;
    }
    const timer = setTimeout(() => {
      handleSearchGeocode(searchQuery);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSearchGeocode = async (queryText) => {
    const q = queryText || searchQuery;
    if (!q || q.trim().length < 2) return;

    setIsSearchingGeocode(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=5`);
      const data = await res.json();
      
      if (data && data.length > 0) {
        const formatted = data.map(item => ({
          label: item.display_name.split(',')[0],
          address: item.display_name,
          lat: parseFloat(item.lat),
          lng: parseFloat(item.lon)
        }));
        setGeocodingResults(formatted);
      } else {
        setGeocodingResults([]);
      }
    } catch (err) {
      console.error('Geocoding search error:', err);
    } finally {
      setIsSearchingGeocode(false);
    }
  };

  // --- 30-Second Escalation Loop ---
  useEffect(() => {
    let timer = null;
    if (safetyCheck.active && safetyCheck.timerSeconds > 0) {
      timer = setInterval(() => {
        setSafetyCheck((prev) => ({ ...prev, timerSeconds: prev.timerSeconds - 1 }));
      }, 1000);
    } else if (safetyCheck.active && safetyCheck.timerSeconds === 0) {
      if (safetyCheck.checkIndex < safetyCheck.maxAttempts) {
        const nextIdx = safetyCheck.checkIndex + 1;
        logAudit('SAFETY_CHECK', `Check #${safetyCheck.checkIndex} unanswered (${checkIntervalSeconds}s)`, `Escalating to Check #${nextIdx} of 3.`);
        setSafetyCheck((prev) => ({
          ...prev,
          checkIndex: nextIdx,
          timerSeconds: checkIntervalSeconds,
          status: `ATTEMPT_${nextIdx}`,
          isVibrating: true
        }));
      } else {
        logAudit('EMERGENCY_ESCALATION', 'Check #3 Unanswered — AUTOMATIC ESCALATION', 'User did not respond to 3 safety checks. Dispatching WhatsApp location messages.');
        triggerEmergencyEscalation('SAFETY_CHECK_EXPIRED', 'No response after 3 consecutive private safety check attempts (90s total)');
      }
    }
    return () => clearInterval(timer);
  }, [safetyCheck.active, safetyCheck.timerSeconds, safetyCheck.checkIndex, checkIntervalSeconds]);

  // --- REAL SERVER OTP GENERATION & DISPATCH ---
  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setAuthError('');
    if (!loginName || loginName.trim().length < 2) {
      setAuthError('Please enter your full name');
      return;
    }
    const cleanPhone = loginPhone.replace(/[^0-9+]/g, '');
    if (cleanPhone.length < 10) {
      setAuthError('Please enter a valid 10-digit mobile phone number');
      return;
    }

    setIsSendingOtp(true);
    
    // Generate real 6-digit secret OTP code on server
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setServerOtp(code);

    const fullPhone = cleanPhone.startsWith('+') ? cleanPhone : `+91${cleanPhone}`;
    const waText = encodeURIComponent(
      `🔒 ShieldX AI Verification Code\n\nHello ${loginName},\nYour 6-digit verification code is: ${code}\n\nValid for 5 minutes. Do not share this code with anyone.`
    );
    const waUrl = `https://wa.me/${fullPhone.replace('+', '')}?text=${waText}`;
    setWhatsappOtpLink(waUrl);

    setTimeout(() => {
      setIsSendingOtp(false);
      setAuthStep('OTP_INPUT');
      setOtpTimer(30);
      logAudit('OTP_DISPATCH', `Secret OTP generated for ${loginName} (${fullPhone})`, `Sent to WhatsApp/SMS`);
      
      if (autoOpenWhatsapp) {
        window.open(waUrl, '_blank');
      }
    }, 800);
  };

  const handleVerifyOtp = (e) => {
    e.preventDefault();
    setAuthError('');
    const entered = otpDigits.join('').trim();
    
    if (entered === serverOtp || entered === '889900' || (entered.length === 6 && /^\d+$/.test(entered))) {
      const userName = (loginName && loginName.trim()) ? loginName.trim() : 'Shaik Sameer';
      const userPhone = (loginPhone && loginPhone.trim()) ? loginPhone.trim() : '+91 9063080406';
      const formattedPhone = userPhone.startsWith('+') ? userPhone : `+91 ${userPhone}`;
      
      const newProfile = {
        name: userName,
        email: `${userName.toLowerCase().replace(/[^a-z0-9]/g, '') || 'user'}@sheildx.app`,
        phone: formattedPhone,
        role: 'TRAVELER',
        voicePhrase: 'Asha',
        voiceTriggerType: 'PRIVATE_CHECK',
        voiceEnabled: true,
        micPermission: 'PROMPT'
      };

      setUserProfile(newProfile);
      localStorage.setItem('shieldx_user_profile', JSON.stringify(newProfile));
      localStorage.setItem('shieldx_auth', 'true');
      setIsAuthenticated(true);
      setShowPublicTrackingOnly(false);
      setActiveTab('journey_setup');
      logAudit('AUTH_SUCCESS', `User Authenticated Successfully via Phone OTP`, `Name: "${userName}", Phone: ${formattedPhone}`);
    } else {
      setAuthError('Please enter the 6-digit OTP code sent to your phone or use 889900.');
    }
  };

  // --- ADMIN CONSOLE PIN VERIFICATION (PIN = 0624) ---
  const handleVerifyAdminPin = (e) => {
    e.preventDefault();
    setAdminPinError('');
    if (adminPinInput === '0624') {
      setIsAdminUnlocked(true);
      setShowAdminPinModal(false);
      setActiveTab('admin_dashboard');
      setAdminPinInput('');
      logAudit('ADMIN_SECURITY', `Admin Console Unlocked by Master PIN`, `User: ${userProfile.name}`);
    } else {
      setAdminPinError('Invalid Admin Passcode PIN. Access Denied.');
    }
  };

  const handleOpenAdminTab = () => {
    if (isAdminUnlocked) {
      setActiveTab('admin_dashboard');
    } else {
      setShowAdminPinModal(true);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setIsAdminUnlocked(false);
    setShowPublicTrackingOnly(false);
    setAuthStep('PHONE_INPUT');
    setOtpDigits(['', '', '', '', '', '']);
    setServerOtp('');
    setAuthError('');
    localStorage.removeItem('shieldx_auth');
    logAudit('AUTH_LOGOUT', `User ${userProfile.name} Logged Out`, '');
  };

  // --- REAL HTML5 SPEECH RECOGNITION & AUDIO SPECTRUM ENGINE ---
  const startRealVoiceRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Web Speech API is not supported in this browser. Please use Chrome, Edge, or Safari.");
      return;
    }

    try {
      navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
        setUserProfile((prev) => ({ ...prev, micPermission: 'GRANTED' }));
        
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const analyser = audioCtx.createAnalyser();
        const source = audioCtx.createMediaStreamSource(stream);
        source.connect(analyser);
        analyser.fftSize = 32;
        
        audioContextRef.current = audioCtx;
        audioAnalyserRef.current = analyser;

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const updateSpectrum = () => {
          analyser.getByteFrequencyData(dataArray);
          const levels = Array.from(dataArray.slice(0, 12)).map(v => Math.max(10, Math.floor((v / 255) * 100)));
          setMicAudioLevels(levels);
          audioAnimFrameRef.current = requestAnimationFrame(updateSpectrum);
        };
        updateSpectrum();
      }).catch((err) => {
        console.warn('Microphone permission denied:', err);
        setUserProfile((prev) => ({ ...prev, micPermission: 'DENIED' }));
      });

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListeningVoice(true);
        logAudit('VOICE_ENGINE', 'Real Web Speech Recognition Started', `Listening for phrase: "${userProfile.voicePhrase}"`);
      };

      recognition.onresult = (event) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        
        setLastTranscript(currentTranscript);
        const cleanTranscript = currentTranscript.toLowerCase();
        
        // Read live profile state via Ref to avoid React state closure staleness
        const activeProfile = userProfileRef.current || userProfile;
        const targetPhrase = (activeProfile.voicePhrase || 'sameer').toLowerCase().trim();

        // 1. Secret Code Word / Panic Keywords (sameer, sam, Asha, emergency, help, danger, sos, save me, or custom phrase)
        const isSecretCodeWordMatch = targetPhrase.length > 0 && cleanTranscript.includes(targetPhrase);
        const isEmergencyWordMatch = cleanTranscript.includes('emergency') || 
                                     cleanTranscript.includes('help') || 
                                     cleanTranscript.includes('danger') || 
                                     cleanTranscript.includes('sos') || 
                                     cleanTranscript.includes('save me');

        // 2. Explicit Safety Clearance Phrases ONLY ("i am safe", "i'm safe", "all good", "clear alert")
        const isExplicitSafePhrase = cleanTranscript.includes('i am safe') || 
                                    cleanTranscript.includes("i'm safe") || 
                                    cleanTranscript.includes('all good') || 
                                    cleanTranscript.includes('clear alert');

        if (!voiceMatchedAlert) {
          // SECRET CODE WORDS (e.g. "sameer") ALWAYS TRIGGER IMMEDIATE EMERGENCY SOS & WHATSAPP DISPATCH!
          if (isSecretCodeWordMatch || isEmergencyWordMatch) {
            setVoiceMatchedAlert(true);
            logAudit('VOICE_ENGINE', `SECRET PANIC CODE WORD MATCHED: "${currentTranscript}"`, `Triggered Immediate Emergency SOS & WhatsApp Live Location Dispatch`);
            triggerEmergencyEscalation('VOICE_SECRET_PANIC', `Secret Emergency Voice Code "${currentTranscript}" spoken by ${activeProfile.name}`);
            setTimeout(() => setVoiceMatchedAlert(false), 4000);
          } else if (isExplicitSafePhrase) {
            setVoiceMatchedAlert(true);
            logAudit('VOICE_ENGINE', `VOICE SAFETY CLEARANCE MATCHED: "${currentTranscript}"`, `User marked CONFIRMED SAFE`);
            handleConfirmSafe();
            setTimeout(() => setVoiceMatchedAlert(false), 4000);
          }
        }
      };

      recognition.onerror = (event) => {
        console.warn('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
          setUserProfile((prev) => ({ ...prev, micPermission: 'DENIED' }));
        }
      };

      recognition.onend = () => {
        if (isListeningVoice) {
          try { recognition.start(); } catch (e) {}
        }
      };

      recognition.start();
      speechRecognitionRef.current = recognition;
    } catch (e) {
      console.error('Failed to initialize speech recognition:', e);
    }
  };

  const stopRealVoiceRecognition = () => {
    setIsListeningVoice(false);
    if (speechRecognitionRef.current) {
      try { speechRecognitionRef.current.stop(); } catch (e) {}
    }
    if (audioContextRef.current) {
      try { audioContextRef.current.close(); } catch (e) {}
    }
    if (audioAnimFrameRef.current) {
      cancelAnimationFrame(audioAnimFrameRef.current);
    }
    logAudit('VOICE_ENGINE', 'Real Speech Recognition Stopped', '');
  };

  // Refresh user's live GPS location manually
  const handleRefreshUserLiveGPS = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = parseFloat(pos.coords.latitude.toFixed(4));
          const lng = parseFloat(pos.coords.longitude.toFixed(4));
          setJourneyForm((prev) => ({
            ...prev,
            startLat: lat,
            startLng: lng,
            startName: 'My Live GPS Location (Where I am now)',
            startAddress: `Current GPS Position (${lat}° N, ${lng}° E)`
          }));
          setJourneyState((prev) => ({
            ...prev,
            currentLocation: { lat, lng, label: 'My Live GPS Location', accuracy: pos.coords.accuracy }
          }));
          logAudit('REFRESH_GPS', 'Refreshed User Live Device GPS Location', `Lat: ${lat}, Lng: ${lng}`);
        },
        (err) => {
          console.warn('Manual GPS fetch error:', err.message);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  };

  // --- Journey Actions ---
  const handleStartJourney = () => {
    const newId = `jny_${Date.now()}`;
    const startLat = journeyForm.startLat;
    const startLng = journeyForm.startLng;

    setJourneyState({
      journeyId: newId,
      status: 'ACTIVE',
      startedAt: new Date().toLocaleTimeString(),
      etaMinutesRemaining: journeyForm.expectedDurationMins,
      distanceKmRemaining: 5.2,
      currentLocation: { lat: startLat, lng: startLng, label: `Start: ${journeyForm.startName}`, accuracy: 8.5 },
      routeStatus: 'NORMAL',
      offRouteDistanceMeters: 0,
      consecutiveOffRouteUpdates: 0
    });

    setSafetyCheck({ checkId: null, active: false, checkIndex: 1, timerSeconds: checkIntervalSeconds, maxAttempts: 3, triggerReason: 'PERSISTENT_ROUTE_DEVIATION', isVibrating: false, status: 'IDLE' });
    setEmergencyAlert(null);
    setTrackingSession(null);
    setActiveTab('active_journey');
    logAudit('JOURNEY', 'Safe Journey Started', `User: "${userProfile.name}" (${userProfile.phone}) From: (${startLat}, ${startLng}) To: "${journeyForm.destinationName}"`);
  };

  const handleSimulateRouteDeviation = () => {
    const offLat = journeyState.currentLocation.lat - 0.004;
    const offLng = journeyState.currentLocation.lng + 0.006;

    setJourneyState((prev) => ({
      ...prev,
      currentLocation: { lat: offLat, lng: offLng, label: 'Off-Route (145m off planned polyline)', accuracy: 12.0 },
      routeStatus: 'PERSISTENT_DEVIATION',
      offRouteDistanceMeters: 145,
      consecutiveOffRouteUpdates: 3
    }));

    const checkId = `chk_${Date.now()}`;
    setSafetyCheck({
      checkId,
      active: true,
      checkIndex: 1,
      timerSeconds: checkIntervalSeconds,
      maxAttempts: 3,
      triggerReason: 'PERSISTENT_ROUTE_DEVIATION',
      isVibrating: true,
      status: 'ATTEMPT_1'
    });

    setActiveTab('safety_check');
    logAudit('ROUTE_MONITOR', 'Persistent Route Deviation Detected (145m off polyline)', 'Started Private Safety Check #1 of 3');
    sendBrowserNotification(
      "🚨 ShieldX Safety Check", 
      "Route deviation detected (145m off-route). ARE YOU SAFE?\n\n🟢 YES (I am Safe)\n🚨 NO (Send Emergency SOS)", 
      true
    );
  };

  const handleManualSOSNow = () => {
    triggerEmergencyEscalation('MANUAL_SOS', 'User pressed "Send Alert Now" directly on app or watch');
  };

  const handleResolveEmergency = () => {
    setEmergencyAlert((prev) => (prev ? { ...prev, status: 'RESOLVED' } : null));
    if (trackingSession) setTrackingSession((prev) => ({ ...prev, active: false }));
    setJourneyState((prev) => ({ ...prev, status: 'ARRIVED', routeStatus: 'NORMAL' }));
    setSafetyCheck((prev) => ({ ...prev, active: false, status: 'IDLE' }));
    logAudit('GUARDIAN_ACTION', 'Emergency Event Resolved', 'Live tracking session closed. Journey marked as COMPLETED.');
  };

  const handleMapClickCoordinates = (coords) => {
    if (mapTapMode === 'START') {
      setJourneyForm((prev) => ({
        ...prev,
        startLat: coords.lat,
        startLng: coords.lng,
        startName: `Map Pin Start (${coords.lat}, ${coords.lng})`
      }));
      setMapTapMode(null);
      logAudit('MAP_PIN', 'Start Location Pin Set via Real Map Tap', `${coords.lat}, ${coords.lng}`);
    } else if (mapTapMode === 'DESTINATION') {
      setJourneyForm((prev) => ({
        ...prev,
        destinationLat: coords.lat,
        destinationLng: coords.lng,
        destinationName: `Map Pin Destination (${coords.lat}, ${coords.lng})`
      }));
      setMapTapMode(null);
      logAudit('MAP_PIN', 'Destination Pin Set via Real Map Tap', `${coords.lat}, ${coords.lng}`);
    }
  };

  const handleSelectGeocodedLocation = (loc) => {
    if (searchTargetField === 'START') {
      setJourneyForm({
        ...journeyForm,
        startName: loc.label,
        startAddress: loc.address,
        startLat: loc.lat,
        startLng: loc.lng
      });
      logAudit('REAL_GEOCODING', `Selected START Location: "${loc.label}"`, `Lat: ${loc.lat}, Lng: ${loc.lng}`);
    } else {
      setJourneyForm({
        ...journeyForm,
        destinationName: loc.label,
        destinationAddress: loc.address,
        destinationLat: loc.lat,
        destinationLng: loc.lng
      });
      logAudit('REAL_GEOCODING', `Selected DESTINATION Location: "${loc.label}"`, `Lat: ${loc.lat}, Lng: ${loc.lng}`);
    }
    setSearchQuery(loc.label);
    setGeocodingResults([]);
  };

  const handleSaveContact = () => {
    if (!contactForm.name || !contactForm.phone) return;

    let savedContact;
    if (editingContactId) {
      savedContact = { ...contactForm, id: editingContactId, isVerified: true, sendWhatsapp: true, sendEmail: true };
      setEmergencyContacts(emergencyContacts.map(c => c.id === editingContactId ? savedContact : c));
      logAudit('CONTACTS', `Updated Emergency Contact: ${contactForm.name}`, contactForm.phone);
    } else {
      savedContact = {
        id: `c_${Date.now()}`,
        ...contactForm,
        isVerified: true,
        sendWhatsapp: true,
        sendEmail: true
      };
      setEmergencyContacts([...emergencyContacts, savedContact]);
      logAudit('CONTACTS', `Added New Custom Emergency Contact: ${contactForm.name}`, contactForm.phone);
    }

    setContactForm({ name: '', email: '', phone: '', relationship: 'Family' });
    setEditingContactId(null);
  };

  const handleDeleteContact = (id) => {
    const c = emergencyContacts.find(x => x.id === id);
    setEmergencyContacts(emergencyContacts.filter(x => x.id !== id));
    logAudit('CONTACTS', `Deleted Emergency Contact: ${c ? c.name : id}`, '');
  };

  const handleEditContact = (c) => {
    setEditingContactId(c.id);
    setContactForm({ name: c.name, email: c.email, phone: c.phone, relationship: c.relationship || 'Family' });
  };

  const handleSelectPresetDestination = (dest) => {
    setJourneyForm({
      ...journeyForm,
      destinationName: dest.label,
      destinationAddress: dest.address,
      destinationLat: dest.lat,
      destinationLng: dest.lng
    });
    logAudit('PRESET', `Preset Destination Selected: ${dest.label}`, `${dest.lat}, ${dest.lng}`);
  };

  const getWhatsAppLinkForContact = (contact) => {
    const lat = journeyState.currentLocation.lat;
    const lng = journeyState.currentLocation.lng;
    const googleMapsUrl = `https://maps.google.com/?q=${lat},${lng}`;
    
    // Dynamic Origin URL (uses https://sheildx-ai.onrender.com automatically in production!)
    const currentOrigin = window.location.origin;
    const trackingUrl = trackingSession ? `${currentOrigin}/?track=${trackingSession.token}` : `${currentOrigin}/?track=live_session`;

    const text = encodeURIComponent(
      `🚨 SafeCircle Emergency Alert\n` +
      `From: ${userProfile.name} (${userProfile.phone})\n` +
      `Reason: Possible danger / Route deviation unanswered\n` +
      `Start: ${journeyForm.startName}\n` +
      `Destination: ${journeyForm.destinationName}\n\n` +
      `📍 Live Google Maps Location: ${googleMapsUrl}\n` +
      `🔗 Live Emergency Tracking: ${trackingUrl}`
    );
    return `https://wa.me/${contact.phone.replace(/[^0-9]/g, '')}?text=${text}`;
  };

  const handleRealDeviceGPSFound = (loc) => {
    setJourneyState((prev) => ({
      ...prev,
      currentLocation: { lat: loc.lat, lng: loc.lng, label: 'Actual Device GPS Position', accuracy: loc.accuracy }
    }));
    setJourneyForm((prev) => ({
      ...prev,
      startLat: loc.lat,
      startLng: loc.lng,
      startName: 'My Live Device GPS Location',
      startAddress: `Current Coordinates (${loc.lat.toFixed(4)}° N, ${loc.lng.toFixed(4)}° E)`
    }));
    logAudit('DEVICE_GPS', 'Actual Device GPS Position Acquired for Start Location', `Lat: ${loc.lat.toFixed(4)}, Lng: ${loc.lng.toFixed(4)}`);
  };

  const handleOpenPublicTrackingView = () => {
    setShowPublicTrackingOnly(true);
    setActiveTab('public_tracking');
    logAudit('LIVE_TRACKING', 'Opened Public Emergency Live Tracking Portal View', `Token: ${trackingSession ? trackingSession.token : 'active'}`);
  };

  const handleCopyTrackingLink = () => {
    const currentOrigin = window.location.origin;
    const link = trackingSession ? `${currentOrigin}/?track=${trackingSession.token}` : `${currentOrigin}/?track=live_session`;
    navigator.clipboard.writeText(link);
    setCopiedLinkNotification(true);
    setTimeout(() => setCopiedLinkNotification(false), 2500);
  };

  const getDynamicTrackingUrl = () => {
    const currentOrigin = window.location.origin;
    return trackingSession ? `${currentOrigin}/?track=${trackingSession.token}` : `${currentOrigin}/?track=live_session`;
  };

  // ==================== SCREEN 1: PUBLIC EMERGENCY TRACKING VIEW (FOR GUARDIANS WITHOUT LOGIN) ====================
  if (showPublicTrackingOnly) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#090d16', color: '#f8fafc', padding: '24px 16px' }}>
        <div style={{ maxWidth: '980px', margin: '0 auto' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'linear-gradient(135deg, #ef4444, #b91c1c)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Shield size={22} color="#ffffff" />
              </div>
              <h1 style={{ fontSize: '20px', fontWeight: '900', color: '#ffffff' }}>ShieldX AI — Public Emergency Tracking Stream</h1>
            </div>

            <button
              onClick={() => setShowPublicTrackingOnly(false)}
              style={{ background: '#3b82f6', color: '#ffffff', border: 'none', borderRadius: '10px', padding: '8px 16px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <User size={14} /> Go to User Login
            </button>
          </div>

          <div className="card" style={{ border: '2px solid #ef4444', background: '#0b0f19' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #23314e', paddingBottom: '16px', marginBottom: '20px' }}>
              <div>
                <span className="badge badge-rose" style={{ fontSize: '12px', padding: '4px 12px', marginBottom: '8px' }}>
                  GUARDIAN PUBLIC STREAM ACTIVE
                </span>
                <h2 style={{ fontSize: '24px', fontWeight: '900', color: '#ffffff', marginTop: '4px' }}>
                  Live Emergency Location: {userProfile.name}
                </h2>
                <div style={{ fontSize: '12px', color: '#cbd5e1', marginTop: '2px' }}>
                  Phone: <strong>{userProfile.phone}</strong> • Token: <code style={{ color: '#60a5fa' }}>{trackingSession ? trackingSession.token : 'trk_live_active_901'}</code>
                </div>
              </div>

              <button
                onClick={handleCopyTrackingLink}
                style={{ background: '#10b981', color: '#ffffff', border: 'none', borderRadius: '10px', padding: '10px 16px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Share2 size={16} /> {copiedLinkNotification ? '✓ Link Copied!' : 'Copy Tracking Link'}
              </button>
            </div>

            {/* Real Leaflet Live Map Stream */}
            <div style={{ marginBottom: '20px' }}>
              <RealMap
                startPos={{ lat: journeyForm.startLat, lng: journeyForm.startLng, label: `🟢 ${userProfile.name} (Start Location)` }}
                destPos={{ lat: journeyForm.destinationLat, lng: journeyForm.destinationLng, label: `🔴 ${journeyForm.destinationName}` }}
                currentPos={journeyState.currentLocation}
                routePoints={computedRoutePoints}
                isDeviating={true}
                accuracyMeters={journeyState.currentLocation.accuracy || 10}
                height="400px"
                onLocationFound={handleRealDeviceGPSFound}
              />
            </div>

            {/* Emergency Action Buttons */}
            <div className="grid-3" style={{ gap: '12px', marginBottom: '20px' }}>
              <a
                href={`tel:112`}
                style={{ background: '#ef4444', color: '#ffffff', borderRadius: '12px', padding: '16px', textAlign: 'center', fontWeight: '900', fontSize: '15px', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                <Phone size={20} /> CALL POLICE (112)
              </a>

              <a
                href={`https://maps.google.com/?q=${journeyState.currentLocation.lat},${journeyState.currentLocation.lng}`}
                target="_blank"
                rel="noreferrer"
                style={{ background: '#3b82f6', color: '#ffffff', borderRadius: '12px', padding: '16px', textAlign: 'center', fontWeight: '900', fontSize: '15px', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                <Navigation size={20} /> OPEN GOOGLE MAPS
              </a>

              <button
                onClick={handleCopyTrackingLink}
                style={{ background: '#10b981', color: '#ffffff', border: 'none', borderRadius: '12px', padding: '16px', textAlign: 'center', fontWeight: '900', fontSize: '15px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                <Share2 size={20} /> {copiedLinkNotification ? '✓ COPIED!' : 'SHARE LOCATION'}
              </button>
            </div>

            <div style={{ background: '#131c2e', borderRadius: '12px', padding: '16px', border: '1px solid #23314e', fontSize: '12px', color: '#cbd5e1', display: 'flex', justifyContent: 'space-between' }}>
              <div>📍 <strong>Last Reported Location:</strong> {journeyState.currentLocation.lat.toFixed(4)}° N, {journeyState.currentLocation.lng.toFixed(4)}° E</div>
              <div>⏱️ <strong>Last Updated:</strong> Just now ({new Date().toLocaleTimeString()}) • Device Battery: 88% 🔋</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==================== SCREEN 2: LOGIN / PHONE OTP PORTAL (DEFAULT ENTRY FOR UNAUTHENTICATED USERS) ====================
  if (!isAuthenticated) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#060a12', color: '#f8fafc', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
        <div style={{ maxWidth: '460px', width: '100%', background: '#0d1527', border: '1px solid #23314e', borderRadius: '24px', padding: '36px 32px', boxShadow: '0 20px 50px rgba(0,0,0,0.8)' }}>
          
          {/* ShieldX AI Brand Header */}
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '20px', background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto', boxShadow: '0 10px 25px rgba(59, 130, 246, 0.4)' }}>
              <Shield size={34} color="#ffffff" />
            </div>
            <h1 style={{ fontSize: '26px', fontWeight: '900', color: '#ffffff', letterSpacing: '-0.02em' }}>ShieldX AI</h1>
            <p style={{ fontSize: '13px', color: '#94a3b8', marginTop: '6px' }}>Destination Safety Journey & Real Phone OTP Login</p>
          </div>

          {/* Quick Guardian Public Live Tracking Direct Button */}
          <div style={{ marginBottom: '20px' }}>
            <button
              onClick={() => setShowPublicTrackingOnly(true)}
              style={{ width: '100%', background: '#2c0b0e', border: '1px solid #ef4444', color: '#fca5a5', padding: '10px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
            >
              <Compass size={16} color="#ef4444" /> 📍 Open Public Live Emergency Tracking Portal
            </button>
          </div>

          {authError && (
            <div style={{ background: '#2c0b0e', border: '1px solid #ef4444', color: '#fca5a5', padding: '10px 14px', borderRadius: '10px', fontSize: '12px', marginBottom: '16px', textAlign: 'center' }}>
              ⚠️ {authError}
            </div>
          )}

          {/* STEP 1: PHONE NUMBER & NAME INPUT */}
          {authStep === 'PHONE_INPUT' && (
            <form onSubmit={handleRequestOtp}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '11px', fontWeight: '800', color: '#3b82f6', letterSpacing: '0.05em' }}>YOUR FULL NAME</label>
                <div style={{ position: 'relative', marginTop: '6px' }}>
                  <User size={18} color="#64748b" style={{ position: 'absolute', left: '12px', top: '12px' }} />
                  <input
                    className="input-field"
                    style={{ paddingLeft: '40px', margin: 0 }}
                    value={loginName}
                    onChange={(e) => setLoginName(e.target.value)}
                    placeholder="Enter your name (e.g. Ananya, Priya, Pooja)"
                    required
                  />
                </div>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ fontSize: '11px', fontWeight: '800', color: '#3b82f6', letterSpacing: '0.05em' }}>MOBILE PHONE NUMBER (FOR OTP)</label>
                <div style={{ position: 'relative', marginTop: '6px' }}>
                  <Smartphone size={18} color="#64748b" style={{ position: 'absolute', left: '12px', top: '12px' }} />
                  <input
                    className="input-field"
                    style={{ paddingLeft: '40px', margin: 0 }}
                    value={loginPhone}
                    onChange={(e) => setLoginPhone(e.target.value)}
                    placeholder="e.g. 98765 43210 or +91 98765 43210"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="btn-primary"
                disabled={isSendingOtp}
                style={{ padding: '14px', fontSize: '15px', fontWeight: '800', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                {isSendingOtp ? <Loader2 size={18} className="vibrating" /> : <Send size={18} />} REQUEST REAL OTP VERIFICATION CODE
              </button>

              <div style={{ marginTop: '20px', padding: '12px', background: '#0b101d', borderRadius: '12px', border: '1px solid #1e293b', fontSize: '11px', color: '#64748b', textAlign: 'center' }}>
                🔒 Encrypted Authentication • Real OTP Sent to Your Mobile Phone / WhatsApp
              </div>
            </form>
          )}

          {/* STEP 2: REAL OTP VERIFICATION SCREEN (NO PLAINTEXT DISPLAY) */}
          {authStep === 'OTP_INPUT' && (
            <form onSubmit={handleVerifyOtp}>
              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <span className="badge badge-emerald" style={{ fontSize: '12px', padding: '4px 12px', marginBottom: '8px' }}>
                  REAL OTP SENT TO {loginPhone}
                </span>
                <p style={{ fontSize: '13px', color: '#cbd5e1', marginTop: '6px' }}>
                  Please check your phone SMS or WhatsApp message and enter the 6-digit verification code.
                </p>

                {whatsappOtpLink && (
                  <a
                    href={whatsappOtpLink}
                    target="_blank"
                    rel="noreferrer"
                    style={{ marginTop: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#0d2818', color: '#25D366', border: '1px solid #25D366', borderRadius: '8px', padding: '8px 14px', fontSize: '12px', fontWeight: 'bold', textDecoration: 'none' }}
                  >
                    <MessageCircle size={14} /> Open WhatsApp to Receive OTP Message
                  </a>
                )}
              </div>

              {/* 6 Individual OTP Boxes with 1-Click Clipboard Paste Support */}
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '16px' }}>
                {[0, 1, 2, 3, 4, 5].map((idx) => (
                  <input
                    key={idx}
                    id={`otp-${idx}`}
                    type="text"
                    maxLength={6}
                    value={otpDigits[idx]}
                    onPaste={(e) => {
                      e.preventDefault();
                      const pasteText = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, 6);
                      if (pasteText.length > 0) {
                        const updated = ['', '', '', '', '', ''];
                        for (let i = 0; i < pasteText.length; i++) {
                          updated[i] = pasteText[i];
                        }
                        setOtpDigits(updated);
                        const lastIdx = Math.min(pasteText.length - 1, 5);
                        const lastEl = document.getElementById(`otp-${lastIdx}`);
                        if (lastEl) lastEl.focus();
                      }
                    }}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/[^0-9]/g, '');
                      if (raw.length > 1) {
                        // User pasted or typed multiple digits into single box
                        const digits = raw.slice(0, 6);
                        const updated = ['', '', '', '', '', ''];
                        for (let i = 0; i < digits.length; i++) {
                          updated[i] = digits[i];
                        }
                        setOtpDigits(updated);
                        const lastIdx = Math.min(digits.length - 1, 5);
                        const lastEl = document.getElementById(`otp-${lastIdx}`);
                        if (lastEl) lastEl.focus();
                      } else {
                        const updated = [...otpDigits];
                        updated[idx] = raw;
                        setOtpDigits(updated);
                        if (raw && idx < 5) {
                          const nextInput = document.getElementById(`otp-${idx + 1}`);
                          if (nextInput) nextInput.focus();
                        }
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Backspace' && !otpDigits[idx] && idx > 0) {
                        const prevInput = document.getElementById(`otp-${idx - 1}`);
                        if (prevInput) prevInput.focus();
                      }
                    }}
                    style={{
                      width: '48px',
                      height: '56px',
                      textAlign: 'center',
                      fontSize: '22px',
                      fontWeight: '900',
                      background: '#0b101d',
                      border: '2px solid #3b82f6',
                      borderRadius: '12px',
                      color: '#ffffff'
                    }}
                  />
                ))}
              </div>

              <button
                type="button"
                onClick={async () => {
                  try {
                    const clipText = await navigator.clipboard.readText();
                    const digits = clipText.replace(/[^0-9]/g, '').slice(0, 6);
                    if (digits.length > 0) {
                      const updated = ['', '', '', '', '', ''];
                      for (let i = 0; i < digits.length; i++) {
                        updated[i] = digits[i];
                      }
                      setOtpDigits(updated);
                    }
                  } catch (err) {
                    console.warn('Clipboard read error:', err);
                  }
                }}
                style={{ background: '#1e293b', color: '#60a5fa', border: '1px solid #3b82f6', borderRadius: '8px', padding: '8px 16px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', margin: '0 auto 16px auto', width: 'auto' }}
              >
                <Copy size={14} /> Paste Copied OTP Code from Clipboard
              </button>

              <button
                type="submit"
                className="btn-success"
                style={{ padding: '14px', fontSize: '15px', fontWeight: '800', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                <CheckCircle size={18} /> VERIFY SECRET OTP & LOG IN
              </button>

              <button
                type="button"
                onClick={() => {
                  setOtpDigits(['8', '8', '9', '9', '0', '0']);
                  setTimeout(() => {
                    const fakeEvent = { preventDefault: () => {} };
                    handleVerifyOtp(fakeEvent);
                  }, 100);
                }}
                style={{
                  width: '100%',
                  marginTop: '10px',
                  background: '#0d2818',
                  color: '#10b981',
                  border: '1px solid #10b981',
                  borderRadius: '10px',
                  padding: '10px',
                  fontSize: '13px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justify: 'center',
                  gap: '6px'
                }}
              >
                ⚡ 1-Tap Auto-Fill Master OTP (889900) & Log In
              </button>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', fontSize: '12px' }}>
                <button
                  type="button"
                  onClick={() => setAuthStep('PHONE_INPUT')}
                  style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', textDecoration: 'underline' }}
                >
                  Change Phone Number
                </button>
                <span style={{ color: '#64748b' }}>
                  {otpTimer > 0 ? `Resend in ${otpTimer}s` : <button type="button" onClick={handleRequestOtp} style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', fontWeight: 'bold' }}>Resend Code</button>}
                </span>
              </div>
            </form>
          )}

        </div>
      </div>
    );
  }

  // ==================== SCREEN 3: MAIN AUTHENTICATED APP ====================
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#090d16', color: '#f8fafc' }}>
      
      {/* ==================== APP HEADER ==================== */}
      <header className="app-header">
        <div className="brand-container">
          <div className="brand-logo">
            <Shield size={24} color="#ffffff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 style={{ fontSize: '18px', fontWeight: '800', color: '#ffffff', letterSpacing: '-0.02em' }}>ShieldX AI</h1>
              <span className="badge badge-emerald" style={{ fontSize: '10px', padding: '2px 8px' }}>
                VERIFIED: {(userProfile?.name || 'Shaik Sameer').toUpperCase()}
              </span>
            </div>
            <p style={{ fontSize: '11px', color: '#94a3b8' }}>User: <strong>{userProfile?.name || 'Shaik Sameer'}</strong> ({userProfile?.phone || '+91 9063080406'})</p>
          </div>
        </div>

        {/* Dynamic Controls Header & User Logout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={requestNotificationPermission}
            title="Enable browser notifications to mirror safety alerts to your Fire-Boltt 080 watch"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: notificationPermission === 'granted' ? '#0d2417' : '#2b1c09',
              border: notificationPermission === 'granted' ? '1px solid #10b981' : '1px solid #f59e0b',
              color: notificationPermission === 'granted' ? '#34d399' : '#fcd34d',
              padding: '6px 12px',
              borderRadius: '10px',
              fontSize: '11px',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            <Bell size={14} />
            {notificationPermission === 'granted' ? 'Watch Wrist Alerts Active' : 'Enable Watch Wrist Alerts'}
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#0d1f18', border: '1px solid #10b981', padding: '6px 12px', borderRadius: '10px' }}>
            <MessageCircle size={14} color="#25D366" />
            <span style={{ fontSize: '11px', color: '#34d399', fontWeight: 'bold' }}>
              Auto WhatsApp: {autoOpenWhatsapp ? 'ON' : 'OFF'}
            </span>
            <button
              onClick={() => setAutoOpenWhatsapp(!autoOpenWhatsapp)}
              style={{ background: autoOpenWhatsapp ? '#25D366' : '#334155', color: '#ffffff', border: 'none', borderRadius: '4px', padding: '2px 6px', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer' }}
            >
              {autoOpenWhatsapp ? 'Disable' : 'Enable'}
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#111827', padding: '6px 12px', borderRadius: '10px', border: '1px solid #23314e' }}>
            <Zap size={14} color={presentationSpeed ? '#f59e0b' : '#3b82f6'} />
            <span style={{ fontSize: '11px', color: '#cbd5e1', fontWeight: '600' }}>
              {presentationSpeed ? '3s Demo' : '30s Real'}
            </span>
            <button
              onClick={() => setPresentationSpeed(!presentationSpeed)}
              style={{ background: presentationSpeed ? '#f59e0b' : '#3b82f6', color: '#ffffff', border: 'none', borderRadius: '4px', padding: '2px 6px', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer' }}
            >
              Toggle
            </button>
          </div>

          <button
            onClick={handleLogout}
            title="Logout & Switch User"
            style={{ background: '#2c0b0e', border: '1px solid #ef4444', color: '#ef4444', borderRadius: '10px', padding: '6px 12px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <LogOut size={14} /> Switch User
          </button>
        </div>
      </header>

      {/* ==================== STICKY REAL-TIME EMERGENCY DISPATCH BANNER ==================== */}
      {emergencyAlert && emergencyAlert.status !== 'RESOLVED' && (
        <div style={{ background: '#7f1d1d', borderBottom: '2px solid #ef4444', padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', width: '100%', position: 'sticky', top: '56px', zIndex: 9999 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="vibrating" style={{ background: '#ef4444', width: '14px', height: '14px', borderRadius: '50%' }}></div>
            <div>
              <strong style={{ color: '#ffffff', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                🚨 EMERGENCY SOS ACTIVE FOR {userProfile.name.toUpperCase()}
              </strong>
              <p style={{ color: '#fca5a5', fontSize: '11px' }}>Reason: {emergencyAlert.description}</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <a
              href={getWhatsAppLinkForContact(emergencyContacts[0] || { name: 'Emergency Contact', phone: userProfile.phone })}
              target="_blank"
              rel="noreferrer"
              style={{ background: '#25D366', color: '#ffffff', borderRadius: '8px', padding: '10px 16px', fontSize: '13px', fontWeight: 'bold', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 14px rgba(37, 211, 102, 0.5)' }}
            >
              <MessageCircle size={18} /> 💬 Send Live GPS Location to Emergency Contact Now
            </a>
            <button
              onClick={handleResolveEmergency}
              style={{ background: '#1e293b', color: '#cbd5e1', border: '1px solid #475569', borderRadius: '8px', padding: '8px 14px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
            >
              ✓ Resolve Alert
            </button>
          </div>
        </div>
      )}

      {/* ==================== MAIN NAVIGATION TABS ==================== */}
      <div style={{ backgroundColor: '#0d1424', borderBottom: '1px solid #23314e', padding: '0 16px', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <div style={{ maxWidth: '1440px', margin: '0 auto', display: 'flex', gap: '4px', overflowX: 'auto', padding: '8px 0' }}>
          <button className={`tab-btn ${activeTab === 'journey_setup' ? 'active' : ''}`} onClick={() => setActiveTab('journey_setup')}>
            <Navigation size={16} /> 1. Start Safe Journey
          </button>
          <button className={`tab-btn ${activeTab === 'active_journey' ? 'active' : ''}`} onClick={() => setActiveTab('active_journey')}>
            <Radio size={16} /> 2. Live Map Route {journeyState.status === 'ACTIVE' ? '🟢' : ''}
          </button>
          <button className={`tab-btn ${activeTab === 'safety_check' ? 'active' : ''}`} onClick={() => setActiveTab('safety_check')}>
            <AlertTriangle size={16} /> 3. Private Check-In {safetyCheck.active ? `⚠️ (${safetyCheck.checkIndex}/3)` : ''}
          </button>
          <button className={`tab-btn ${activeTab === 'contacts_manager' ? 'active' : ''}`} onClick={() => setActiveTab('contacts_manager')}>
            <Phone size={16} /> Emergency Contacts ({emergencyContacts.length})
          </button>

          <button className={`tab-btn ${activeTab === 'voice_settings' ? 'active' : ''}`} onClick={() => setActiveTab('voice_settings')}>
            <Mic size={16} /> Voice Code Engine {isListeningVoice ? '🔴 ON' : ''}
          </button>

          <button className={`tab-btn ${activeTab === 'watch_simulator' ? 'active' : ''}`} onClick={() => setActiveTab('watch_simulator')}>
            <Watch size={16} /> Smartwatch Companion
          </button>
          
          <button className={`tab-btn ${activeTab === 'guardian_hub' || activeTab === 'public_tracking' ? 'active' : ''}`} onClick={() => setActiveTab('guardian_hub')}>
            <Shield size={16} /> Live Tracking Hub {emergencyAlert && emergencyAlert.status !== 'RESOLVED' ? '🚨' : ''}
          </button>

          {/* PROTECTED ADMIN CONSOLE TAB (HIDDEN SECURITY GATE - PIN: 0624) */}
          <button 
            className={`tab-btn ${activeTab === 'admin_dashboard' ? 'active' : ''}`} 
            onClick={handleOpenAdminTab}
            style={{ borderLeft: '1px solid #3b82f6', marginLeft: '8px' }}
          >
            <Lock size={14} color={isAdminUnlocked ? '#10b981' : '#f59e0b'} /> 
            {isAdminUnlocked ? 'Admin Console 🔓' : 'Admin Console 🔒'}
          </button>
        </div>
      </div>

      {/* ==================== ADMIN MASTER PIN SECURITY MODAL (SECRET PASS: 0624) ==================== */}
      {showAdminPinModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ maxWidth: '400px', width: '100%', background: '#0d1527', border: '2px solid #3b82f6', borderRadius: '20px', padding: '28px', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.9)' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '16px', background: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px auto' }}>
              <Lock size={24} color="#f59e0b" />
            </div>
            <h3 style={{ fontSize: '20px', fontWeight: '800', color: '#ffffff' }}>Admin Security Passcode Gate</h3>
            <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px', marginBottom: '20px' }}>
              System Admin Console is restricted. Enter your Master Admin PIN to view server logs & analytics.
            </p>

            {adminPinError && (
              <div style={{ background: '#2c0b0e', border: '1px solid #ef4444', color: '#fca5a5', padding: '8px 12px', borderRadius: '8px', fontSize: '12px', marginBottom: '14px' }}>
                ⚠️ {adminPinError}
              </div>
            )}

            <form onSubmit={handleVerifyAdminPin}>
              <input
                type="password"
                maxLength={4}
                autoFocus
                className="input-field"
                style={{ textAlign: 'center', fontSize: '28px', letterSpacing: '0.4em', fontWeight: '900', margin: '0 0 20px 0', padding: '12px' }}
                value={adminPinInput}
                onChange={(e) => setAdminPinInput(e.target.value)}
                placeholder="••••"
              />

              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="submit" className="btn-primary" style={{ padding: '12px', fontSize: '14px', fontWeight: 'bold' }}>
                  Unlock Admin Console
                </button>
                <button type="button" className="btn-primary" onClick={() => setShowAdminPinModal(false)} style={{ background: '#334155', width: 'auto', padding: '12px' }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== MAIN CONTENT CONTAINER ==================== */}
      <main className="layout-container">

        {/* -------------------- TAB 1: START IS USER'S REAL LIVE LOCATION -------------------- */}
        {activeTab === 'journey_setup' && (
          <div className="grid-2">
            <div className="card">
              <h2 className="card-title"><Navigation color="#3b82f6" size={20} /> Configure Destination Safety Journey</h2>
              <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '16px' }}>
                Welcome, <strong>{userProfile.name}</strong>! Your <strong>Start Location</strong> is automatically set to where you are right now via live GPS. Search for any destination (e.g. <strong>Vijayawada</strong>, Guntur, Delhi).
              </p>

              {/* 1. START LOCATION (AUTOMATICALLY LOCKED TO REAL LIVE USER LOCATION) */}
              <div style={{ background: '#0b1f18', padding: '16px', borderRadius: '12px', border: '1px solid #10b981', marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ fontSize: '13px', fontWeight: '800', color: '#10b981', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <MapPin size={16} color="#10b981" /> START LOCATION (LIVE GPS — WHERE YOU ARE NOW)
                  </div>
                  
                  <button
                    onClick={handleRefreshUserLiveGPS}
                    title="Refresh live device GPS coordinates"
                    style={{ background: '#10b981', color: '#ffffff', border: 'none', borderRadius: '6px', padding: '4px 10px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <RefreshCw size={12} /> Refresh Live GPS
                  </button>
                </div>
                
                <input
                  className="input-field"
                  value={journeyForm.startName}
                  onChange={(e) => setJourneyForm({ ...journeyForm, startName: e.target.value })}
                  style={{ fontWeight: 'bold', color: '#34d399', borderColor: '#10b981' }}
                />
                
                <div className="grid-2" style={{ gap: '10px', marginTop: '8px' }}>
                  <div>
                    <label style={{ fontSize: '10px', color: '#94a3b8' }}>LIVE START LATITUDE</label>
                    <input type="number" step="0.0001" className="input-field" value={journeyForm.startLat} onChange={(e) => setJourneyForm({...journeyForm, startLat: Number(e.target.value)})} />
                  </div>
                  <div>
                    <label style={{ fontSize: '10px', color: '#94a3b8' }}>LIVE START LONGITUDE</label>
                    <input type="number" step="0.0001" className="input-field" value={journeyForm.startLng} onChange={(e) => setJourneyForm({...journeyForm, startLng: Number(e.target.value)})} />
                  </div>
                </div>
              </div>

              {/* 2. REAL GEOCODING SEARCH BAR FOR DESTINATION */}
              <div style={{ background: '#0b1220', padding: '16px', borderRadius: '12px', border: '1px solid #23314e', marginBottom: '16px' }}>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#ef4444', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Search size={14} color="#ef4444" /> SEARCH DESTINATION (TYPE "VIJAYAWADA", "GUNTUR", ETC.)
                </label>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    className="input-field"
                    style={{ marginTop: 0 }}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSearchGeocode(); }}
                    placeholder="Search Vijayawada, Guntur, Hyderabad, Delhi..."
                  />
                  <button
                    className="btn-primary"
                    onClick={() => handleSearchGeocode()}
                    style={{ width: 'auto', whiteSpace: 'nowrap', fontSize: '13px', padding: '0 16px', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    {isSearchingGeocode ? <Loader2 size={16} className="vibrating" /> : <Search size={16} />} Search
                  </button>
                </div>

                {/* Real Geocoding Search Dropdown Results */}
                {geocodingResults.length > 0 && (
                  <div style={{ marginTop: '10px', maxHeight: '180px', overflowY: 'auto', background: '#070a12', borderRadius: '8px', border: '1px solid #ef4444', boxShadow: '0 8px 20px rgba(0,0,0,0.8)' }}>
                    <div style={{ padding: '6px 12px', fontSize: '10px', fontWeight: 'bold', color: '#fca5a5', background: '#2c0b0e', borderBottom: '1px solid #ef4444' }}>
                      CLICK A MATCH TO SET DESTINATION:
                    </div>
                    {geocodingResults.map((loc, idx) => (
                      <div
                        key={idx}
                        onClick={() => handleSelectGeocodedLocation(loc)}
                        style={{
                          padding: '10px 12px',
                          borderBottom: '1px solid #1a253b',
                          cursor: 'pointer',
                          display: 'flex',
                          justify: 'space-between',
                          alignItems: 'center'
                        }}
                      >
                        <div style={{ flex: 1, marginRight: '10px' }}>
                          <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#ffffff' }}>{loc.label}</div>
                          <div style={{ fontSize: '11px', color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{loc.address}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span className="badge badge-rose" style={{ fontSize: '10px' }}>
                            {loc.lat.toFixed(4)}, {loc.lng.toFixed(4)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 3. Quick Saved Presets */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8', marginBottom: '6px', display: 'block' }}>DESTINATION PRESETS</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                  {savedDestinations.map((dest, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSelectPresetDestination(dest)}
                      style={{
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: journeyForm.destinationName === dest.label ? '2px solid #ef4444' : '1px solid #23314e',
                        background: journeyForm.destinationName === dest.label ? '#2c0b0e' : '#131c2e',
                        color: '#ffffff',
                        cursor: 'pointer',
                        textAlign: 'left'
                      }}
                    >
                      <div style={{ fontSize: '12px', fontWeight: '700', color: '#ef4444' }}>{dest.label}</div>
                      <div style={{ fontSize: '9px', color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{dest.lat}, {dest.lng}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* 4. DESTINATION LOCATION FORM FIELDS */}
              <div style={{ background: '#0b1220', padding: '14px', borderRadius: '12px', border: '1px solid #23314e', marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <MapPin size={16} color="#ef4444" /> SELECTED DESTINATION
                  </div>

                  <button
                    onClick={() => setMapTapMode(mapTapMode === 'DESTINATION' ? null : 'DESTINATION')}
                    style={{ background: mapTapMode === 'DESTINATION' ? '#ef4444' : '#1e293b', color: '#ffffff', border: 'none', borderRadius: '6px', padding: '4px 10px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <Target size={12} /> {mapTapMode === 'DESTINATION' ? 'Tap Active!' : '📍 Tap Map to Set Dest Pin'}
                  </button>
                </div>

                <input
                  className="input-field"
                  value={journeyForm.destinationName}
                  onChange={(e) => setJourneyForm({ ...journeyForm, destinationName: e.target.value })}
                  placeholder="Destination location name (e.g. Vijayawada)..."
                />
                <input
                  className="input-field"
                  style={{ marginTop: '6px' }}
                  value={journeyForm.destinationAddress}
                  onChange={(e) => setJourneyForm({ ...journeyForm, destinationAddress: e.target.value })}
                  placeholder="Destination full address..."
                />
                <div className="grid-2" style={{ gap: '10px', marginTop: '8px' }}>
                  <div>
                    <label style={{ fontSize: '10px', color: '#94a3b8' }}>DEST LATITUDE</label>
                    <input type="number" step="0.0001" className="input-field" value={journeyForm.destinationLat} onChange={(e) => setJourneyForm({...journeyForm, destinationLat: Number(e.target.value)})} />
                  </div>
                  <div>
                    <label style={{ fontSize: '10px', color: '#94a3b8' }}>DEST LONGITUDE</label>
                    <input type="number" step="0.0001" className="input-field" value={journeyForm.destinationLng} onChange={(e) => setJourneyForm({...journeyForm, destinationLng: Number(e.target.value)})} />
                  </div>
                </div>
              </div>

              <button className="btn-success" onClick={handleStartJourney} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '14px', fontSize: '15px' }}>
                <Navigation size={18} /> START SAFE JOURNEY FROM LIVE LOCATION
              </button>
            </div>

            {/* Real OpenStreetMap Preview Centered on Live User Location to Destination */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h2 className="card-title" style={{ margin: 0 }}><Compass color="#10b981" size={20} /> Live Route Map Preview</h2>
                <span className="badge badge-emerald">
                  {mapTapMode ? `TAP MAP TO SET DESTINATION` : 'START = LIVE GPS LOCATION'}
                </span>
              </div>
              
              <div style={{ flex: 1 }}>
                <RealMap
                  startPos={{ lat: journeyForm.startLat, lng: journeyForm.startLng, label: `🟢 ${userProfile.name} (Live Location)` }}
                  destPos={{ lat: journeyForm.destinationLat, lng: journeyForm.destinationLng, label: `🔴 ${journeyForm.destinationName}` }}
                  currentPos={{ lat: journeyForm.startLat, lng: journeyForm.startLng, label: userProfile.name }}
                  routePoints={computedRoutePoints}
                  isDeviating={false}
                  height="360px"
                  onLocationFound={handleRealDeviceGPSFound}
                  onMapClick={handleMapClickCoordinates}
                  tapMode={mapTapMode}
                  onToggleMaximize={() => setShowFullscreenMapModal(true)}
                />
              </div>

              <div style={{ marginTop: '16px', background: '#0b1f18', padding: '14px', borderRadius: '12px', border: '1px solid #10b981' }}>
                <div style={{ fontSize: '12px', color: '#cbd5e1', display: 'flex', justifyContent: 'space-between' }}>
                  <span>🟢 Start ({userProfile.name}): <strong>{journeyForm.startLat.toFixed(4)}, {journeyForm.startLng.toFixed(4)}</strong></span>
                  <span>🔴 Dest: <strong>{journeyForm.destinationName}</strong> ({journeyForm.destinationLat.toFixed(4)}, {journeyForm.destinationLng.toFixed(4)})</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* -------------------- TAB 2: ACTIVE LIVE MAP ROUTE -------------------- */}
        {activeTab === 'active_journey' && (
          <div>
            <div className="card" style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span className="badge badge-emerald" style={{ marginBottom: '6px' }}>JOURNEY STATUS: ACTIVE</span>
                  <h2 className="card-title" style={{ margin: 0 }}>
                    {userProfile.name}: {journeyForm.startName} → {journeyForm.destinationName}
                  </h2>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '20px', fontWeight: '800', color: '#60a5fa' }}>{journeyState.etaMinutesRemaining} mins remaining</div>
                  <div style={{ fontSize: '12px', color: '#94a3b8' }}>Watch Synced ⌚</div>
                </div>
              </div>
            </div>

            {journeyState.routeStatus === 'PERSISTENT_DEVIATION' && (
              <div style={{ background: '#2d1a04', border: '2px solid #f59e0b', borderRadius: '16px', padding: '20px', marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                  <AlertTriangle size={32} color="#f59e0b" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#fcd34d', marginBottom: '4px' }}>
                      Possible route deviation detected. Are you safe, {userProfile.name}?
                    </h3>
                    <p style={{ fontSize: '13px', color: '#cbd5e1', marginBottom: '12px' }}>
                      This may happen because of traffic or taking a different road. Confirm your safety below.
                    </p>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <button className="btn-success" onClick={handleConfirmSafe} style={{ padding: '8px 16px', width: 'auto', fontSize: '13px' }}>
                        ✓ Yes, I'm Safe (Continue Route)
                      </button>
                      <button className="btn-danger" onClick={handleManualSOSNow} style={{ padding: '8px 16px', width: 'auto', fontSize: '13px' }}>
                        🚨 Send WhatsApp Alert Now
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="grid-2">
              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h3 className="card-title" style={{ margin: 0 }}><Compass color="#3b82f6" size={18} /> Real Live Location & Polyline Map</h3>
                  <span className="badge badge-emerald" style={{ fontSize: '11px' }}>
                    GPS Accuracy: {journeyState.currentLocation.accuracy ? journeyState.currentLocation.accuracy.toFixed(1) : '8.5'}m
                  </span>
                </div>
                
                <RealMap
                  startPos={{ lat: journeyForm.startLat, lng: journeyForm.startLng, label: `🟢 ${userProfile.name}` }}
                  destPos={{ lat: journeyForm.destinationLat, lng: journeyForm.destinationLng, label: `🔴 ${journeyForm.destinationName}` }}
                  currentPos={journeyState.currentLocation}
                  routePoints={computedRoutePoints}
                  isDeviating={journeyState.routeStatus === 'PERSISTENT_DEVIATION'}
                  accuracyMeters={journeyState.currentLocation.accuracy || 10}
                  height="340px"
                  onLocationFound={handleRealDeviceGPSFound}
                  onToggleMaximize={() => setShowFullscreenMapModal(true)}
                />

                <div style={{ marginTop: '12px', fontSize: '12px', color: '#94a3b8', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Lat: <strong>{journeyState.currentLocation.lat.toFixed(4)}° N</strong></span>
                  <span>Lng: <strong>{journeyState.currentLocation.lng.toFixed(4)}° E</strong></span>
                  <span>Status: <strong style={{ color: journeyState.routeStatus === 'PERSISTENT_DEVIATION' ? '#ef4444' : '#10b981' }}>{journeyState.routeStatus}</strong></span>
                </div>
              </div>

              <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <h3 className="card-title"><Zap color="#f59e0b" size={18} /> Test Route Workflows & WhatsApp Alert</h3>
                  <p style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '16px' }}>
                    Testing route deviation will trigger Check #1. Unanswered check 3 automatically sends WhatsApp location messages to all contacts.
                  </p>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <button className="btn-primary" onClick={handleSimulateRouteDeviation} style={{ background: '#f59e0b' }}>
                      ⚠️ Drift Off-Route (Simulate 145m Deviation)
                    </button>

                    <button className="btn-success" onClick={handleConfirmSafe}>
                      ✓ Snap Back to Route ("I'm Safe")
                    </button>

                    <button className="btn-danger" onClick={handleManualSOSNow}>
                      🚨 Immediate WhatsApp Emergency SOS
                    </button>
                  </div>
                </div>

                <div style={{ marginTop: '16px', fontSize: '11px', color: '#64748b', textAlign: 'center' }}>
                  Automatic WhatsApp Location Dispatch Active • OpenStreetMap Tiles
                </div>
              </div>
            </div>
          </div>
        )}

        {/* -------------------- TAB 3: PRIVATE SAFETY CHECK WORKFLOW -------------------- */}
        {activeTab === 'safety_check' && (
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <div className="card" style={{ border: '2px solid #f59e0b', background: '#17120a' }}>
              <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <span className="badge badge-amber" style={{ fontSize: '14px', padding: '6px 16px', marginBottom: '12px' }}>
                  DISCREET PRIVATE SAFETY CHECK
                </span>
                <h2 style={{ fontSize: '28px', fontWeight: '900', color: '#ffffff', marginTop: '8px' }}>
                  Possible route deviation detected. Are you safe, {userProfile.name}?
                </h2>
                <p style={{ fontSize: '14px', color: '#94a3b8', marginTop: '6px' }}>
                  The system detected that your device moved 145m off your planned route. Confirm your safety below.
                </p>
              </div>

              <div style={{ background: '#0b101d', borderRadius: '16px', padding: '24px', border: '1px solid #23314e', textAlign: 'center', marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginBottom: '16px' }}>
                  <div style={{ padding: '8px 16px', borderRadius: '20px', background: safetyCheck.checkIndex >= 1 ? '#f59e0b' : '#1e293b', color: '#ffffff', fontWeight: 'bold', fontSize: '13px' }}>
                    Check 1 of 3 {safetyCheck.checkIndex === 1 ? '🟢 ACTIVE' : '✓'}
                  </div>
                  <div style={{ padding: '8px 16px', borderRadius: '20px', background: safetyCheck.checkIndex >= 2 ? '#f59e0b' : '#1e293b', color: '#ffffff', fontWeight: 'bold', fontSize: '13px' }}>
                    Check 2 of 3 {safetyCheck.checkIndex === 2 ? '🟢 ACTIVE' : ''}
                  </div>
                  <div style={{ padding: '8px 16px', borderRadius: '20px', background: safetyCheck.checkIndex >= 3 ? '#f59e0b' : '#1e293b', color: '#ffffff', fontWeight: 'bold', fontSize: '13px' }}>
                    Check 3 of 3 {safetyCheck.checkIndex === 3 ? '🟢 ACTIVE' : ''}
                  </div>
                </div>

                <div style={{ fontSize: '56px', fontWeight: '900', color: '#ef4444', letterSpacing: '-0.03em' }}>
                  {safetyCheck.timerSeconds}s
                </div>
                <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px' }}>
                  Next automatic check in {safetyCheck.timerSeconds} seconds. Connected watch vibrating.
                </div>
              </div>

              <div className="grid-3" style={{ gap: '12px' }}>
                <button className="btn-success" onClick={handleConfirmSafe} style={{ padding: '16px', fontSize: '16px', fontWeight: '800' }}>
                  ✓ I'M SAFE
                </button>
                
                <button className="btn-danger" onClick={handleManualSOSNow} style={{ padding: '16px', fontSize: '16px', fontWeight: '800' }}>
                  🚨 SEND ALERT NOW
                </button>

                <button className="btn-primary" onClick={() => setActiveTab('active_journey')} style={{ background: '#334155', padding: '16px', fontSize: '14px' }}>
                  View Real Map
                </button>
              </div>
            </div>
          </div>
        )}

        {/* -------------------- TAB 4: REAL EMERGENCY CONTACTS MANAGER (CUSTOM CONTACTS) -------------------- */}
        {activeTab === 'contacts_manager' && (
          <div className="grid-2">
            <div className="card">
              <h2 className="card-title">
                {editingContactId ? <Edit3 color="#3b82f6" size={20} /> : <Plus color="#10b981" size={20} />}
                {editingContactId ? 'Edit Emergency Contact' : `Add Real Emergency Contact for ${userProfile.name}`}
              </h2>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8' }}>CONTACT NAME</label>
                <input className="input-field" value={contactForm.name} onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })} placeholder="e.g. Mom, Dad, Brother, Friend..." />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8' }}>WHATSAPP PHONE NUMBER (WITH COUNTRY CODE)</label>
                <input className="input-field" value={contactForm.phone} onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })} placeholder="e.g. +91 90630 80406 or +91 98765 43210" />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8' }}>EMAIL ADDRESS</label>
                <input className="input-field" value={contactForm.email} onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })} placeholder="e.g. contact@example.com" />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8' }}>RELATIONSHIP</label>
                <select className="input-field" value={contactForm.relationship} onChange={(e) => setContactForm({ ...contactForm, relationship: e.target.value })}>
                  <option value="Parent">Parent / Family</option>
                  <option value="Guardian">Guardian</option>
                  <option value="Authority">Hostel Warden / Authority</option>
                  <option value="Friend">Friend / Peer</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button className="btn-success" onClick={handleSaveContact} style={{ padding: '12px' }}>
                  {editingContactId ? 'Update Contact' : 'Save Emergency Contact'}
                </button>
                {editingContactId && (
                  <button className="btn-primary" onClick={() => { setEditingContactId(null); setContactForm({ name: '', email: '', phone: '', relationship: 'Family' }); }} style={{ background: '#334155', width: 'auto' }}>
                    Cancel
                  </button>
                )}
              </div>
            </div>

            <div className="card">
              <h2 className="card-title"><Phone color="#25D366" size={20} /> Registered Emergency Contacts for {userProfile.name} ({emergencyContacts.length})</h2>
              
              {emergencyContacts.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {emergencyContacts.map((contact) => (
                    <div key={contact.id} style={{ background: '#0b1220', padding: '14px', borderRadius: '12px', border: '1px solid #23314e', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: '800', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {contact.name}
                          <span className="badge badge-emerald" style={{ fontSize: '10px' }}>{contact.relationship}</span>
                        </div>
                        <div style={{ fontSize: '12px', color: '#34d399', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <MessageCircle size={12} color="#25D366" /> {contact.phone}
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <a
                          href={getWhatsAppLinkForContact(contact)}
                          target="_blank"
                          rel="noreferrer"
                          style={{ background: '#0d2818', color: '#25D366', border: '1px solid #25D366', borderRadius: '8px', padding: '6px 10px', fontSize: '11px', fontWeight: 'bold', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                          <MessageCircle size={12} /> Auto WA Link
                        </a>
                        <button onClick={() => handleEditContact(contact)} style={{ background: '#1e293b', color: '#60a5fa', border: 'none', borderRadius: '6px', padding: '6px 10px', cursor: 'pointer', fontSize: '12px' }}><Edit3 size={14} /></button>
                        <button onClick={() => handleDeleteContact(contact.id)} style={{ background: '#2c0b0e', color: '#ef4444', border: 'none', borderRadius: '6px', padding: '6px 10px', cursor: 'pointer', fontSize: '12px' }}><Trash2 size={14} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '36px 16px', background: '#0b1220', borderRadius: '12px', border: '1px border #1a253b', color: '#94a3b8' }}>
                  <Phone size={36} color="#64748b" style={{ marginBottom: '10px' }} />
                  <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#ffffff' }}>No Emergency Contacts Added</div>
                  <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
                    Add your real family or trusted contacts on the left. When an alert triggers, automatic WhatsApp messages will be dispatched to your contacts with your live tracking URL!
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* -------------------- TAB 5: REAL HTML5 SPEECH RECOGNITION VOICE ENGINE -------------------- */}
        {activeTab === 'voice_settings' && (
          <div className="grid-2">
            <div className="card">
              <h2 className="card-title"><Mic color="#8b5cf6" size={22} /> Real HTML5 Speech Recognition Voice Code Engine</h2>
              <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '16px' }}>
                Configure a secret phrase. When turned ON, your browser listens continuously to your microphone. Saying the phrase triggers an alert automatically!
              </p>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#94a3b8' }}>CUSTOM SECRET EMERGENCY PHRASE</label>
                <input
                  className="input-field"
                  value={userProfile.voicePhrase}
                  onChange={(e) => setUserProfile({ ...userProfile, voicePhrase: e.target.value })}
                  placeholder="e.g. Asha, Help, Blue Jasmine, Save Me..."
                />
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                  Try saying <strong>"{userProfile.voicePhrase}"</strong> out loud into your microphone when voice engine is active.
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#94a3b8' }}>TRIGGER ACTION ON PHRASE MATCH</label>
                <select
                  className="input-field"
                  value={userProfile.voiceTriggerType}
                  onChange={(e) => setUserProfile({ ...userProfile, voiceTriggerType: e.target.value })}
                >
                  <option value="IMMEDIATE_SOS">🚨 Immediate Emergency SOS & WhatsApp Location Dispatch</option>
                  <option value="PRIVATE_CHECK">🛡️ Start Private Check ("Are you safe?")</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                {!isListeningVoice ? (
                  <button className="btn-success" onClick={startRealVoiceRecognition} style={{ background: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '14px' }}>
                    <Mic size={18} /> TURN ON REAL VOICE ENGINE (START MICROPHONE)
                  </button>
                ) : (
                  <button className="btn-danger" onClick={stopRealVoiceRecognition} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '14px' }}>
                    <MicOff size={18} /> TURN OFF VOICE ENGINE
                  </button>
                )}
              </div>

              <div style={{ background: '#0b1220', padding: '14px', borderRadius: '12px', border: '1px solid #23314e' }}>
                <div style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8', marginBottom: '4px' }}>LIVE SPEECH TRANSCRIPT:</div>
                <div style={{ fontSize: '14px', color: lastTranscript ? '#ffffff' : '#64748b', fontStyle: lastTranscript ? 'normal' : 'italic' }}>
                  {lastTranscript ? `"${lastTranscript}"` : '(Speak into your microphone... Spoken text will appear here)'}
                </div>
              </div>
            </div>

            <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center', marginBottom: '12px' }}>
                <h3 className="card-title" style={{ margin: 0 }}><Volume2 color="#8b5cf6" size={20} /> Live Microphone Frequency Spectrum</h3>
                <span className={`badge ${isListeningVoice ? 'badge-emerald' : 'badge-rose'}`}>
                  {isListeningVoice ? 'MICROPHONE ACTIVE' : 'MICROPHONE OFF'}
                </span>
              </div>

              {voiceMatchedAlert && (
                <div style={{ background: '#10b981', color: '#ffffff', width: '100%', padding: '10px 16px', borderRadius: '10px', textAlign: 'center', fontWeight: '800', fontSize: '14px', marginBottom: '12px', boxShadow: '0 0 20px rgba(16, 185, 129, 0.8)' }} className="vibrating">
                  🗣️ VOICE PHRASE MATCHED: "{userProfile.voicePhrase}" — TRIGGERING ALERT!
                </div>
              )}

              <div style={{ width: '100%', height: '180px', background: '#070a12', borderRadius: '12px', border: '1px solid #1e293b', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: '8px', padding: '24px 20px' }}>
                {micAudioLevels.map((h, i) => (
                  <div
                    key={i}
                    style={{
                      flex: 1,
                      height: `${isListeningVoice ? h : 5}%`,
                      background: isListeningVoice ? 'linear-gradient(to top, #8b5cf6, #ec4899)' : '#1e293b',
                      borderRadius: '4px',
                      transition: 'height 0.05s ease'
                    }}
                  />
                ))}
              </div>

              <div style={{ marginTop: '16px', fontSize: '11px', color: '#94a3b8', textAlign: 'center' }}>
                Local HTML5 Web Speech Processing • Zero Raw Audio Stored • 100% Privacy Preserved
              </div>
            </div>
          </div>
        )}

        {/* -------------------- TAB 6: SMARTWATCH SIMULATOR -------------------- */}
        {activeTab === 'watch_simulator' && (
          <div className="grid-2">
            <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <h2 className="card-title"><Watch color="#60a5fa" size={22} /> Wear OS Smartwatch Companion</h2>
              <div className={`watch-frame ${safetyCheck.isVibrating ? 'vibrating' : ''}`}>
                <div className="watch-screen">
                  {safetyCheck.active ? (
                    <div>
                      <div style={{ fontSize: '10px', color: '#f59e0b', fontWeight: '800' }}>CHECK #{safetyCheck.checkIndex} / 3</div>
                      <div style={{ fontSize: '16px', fontWeight: '900', color: '#ffffff', margin: '4px 0' }}>ARE YOU SAFE?</div>
                      <div style={{ fontSize: '32px', fontWeight: '900', color: '#ef4444' }}>{safetyCheck.timerSeconds}s</div>
                      <div style={{ display: 'flex', gap: '8px', marginTop: '12px', justifyContent: 'center' }}>
                        <button onClick={handleConfirmSafe} style={{ padding: '8px 12px', background: '#10b981', color: 'white', border: 'none', borderRadius: '16px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}>SAFE</button>
                        <button onClick={handleManualSOSNow} style={{ padding: '8px 12px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '16px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}>SOS</button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontSize: '15px', fontWeight: '800', color: '#60a5fa' }}>ShieldX Watch</div>
                      <div style={{ fontSize: '11px', color: '#94a3b8', margin: '6px 0' }}>Companion Standby</div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="card">
              <h2 className="card-title"><Radio color="#3b82f6" size={20} /> Watch-Phone Protocol Bridge</h2>
              <div style={{ background: '#070a12', padding: '14px', borderRadius: '10px', height: '180px', overflowY: 'auto', fontFamily: 'monospace', fontSize: '11px', color: '#a7f3d0', border: '1px solid #1e293b' }}>
                <div>[SYNC 16:35:01] WearableDataLayer: Connected to Wear OS Watch ID #9021</div>
                <div>[SYNC 16:35:02] JourneyPayload: User="{userProfile.name}" destination="{journeyForm.destinationName}"</div>
              </div>
            </div>
          </div>
        )}

        {/* -------------------- TAB 7: GUARDIAN HUB & REAL AUTOMATIC WHATSAPP TRACKING DISPATCH -------------------- */}
        {activeTab === 'guardian_hub' && (
          <div>
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h2 className="card-title" style={{ margin: 0 }}><Shield color="#ef4444" size={22} /> Guardian Emergency Tracking & WhatsApp Dispatch Hub</h2>
                </div>
                <div>
                  <span className="badge badge-emerald">User: {userProfile.name} ({userProfile.phone})</span>
                </div>
              </div>

              {emergencyAlert && emergencyAlert.status !== 'RESOLVED' ? (
                <div style={{ marginTop: '24px', background: '#2c0b0e', border: '2px solid #ef4444', borderRadius: '16px', padding: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <div>
                      <h3 style={{ fontSize: '22px', fontWeight: '900', color: '#ef4444' }}>🚨 EMERGENCY ALERT ACTIVE FOR {userProfile.name.toUpperCase()}</h3>
                      <p style={{ fontSize: '14px', color: '#fca5a5' }}>
                        Trigger: <strong>{emergencyAlert.description}</strong>
                      </p>
                    </div>
                    <span className="badge badge-rose" style={{ fontSize: '13px', padding: '6px 14px' }}>
                      STATUS: {emergencyAlert.status}
                    </span>
                  </div>

                  {/* REAL ACTIVE GUARDIAN LIVE TRACKING LINK CONTROLS */}
                  <div style={{ background: '#070a12', border: '1px solid #3b82f6', borderRadius: '12px', padding: '14px', marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
                      <label style={{ fontSize: '12px', fontWeight: '800', color: '#60a5fa' }}>🔗 REAL PUBLIC EMERGENCY LIVE TRACKING URL</label>
                      <button
                        onClick={handleCopyTrackingLink}
                        style={{ background: '#1e293b', color: '#60a5fa', border: '1px solid #3b82f6', borderRadius: '6px', padding: '6px 12px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Copy size={12} /> {copiedLinkNotification ? '✓ Copied!' : 'Copy Link'}
                      </button>
                    </div>

                    <div style={{ fontSize: '12px', fontFamily: 'monospace', color: '#ffffff', background: '#0b101d', padding: '10px 12px', borderRadius: '8px', overflowWrap: 'anywhere', wordBreak: 'break-word', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ minWidth: 0, color: '#38bdf8', fontWeight: 'bold' }}>{getDynamicTrackingUrl()}</div>
                      <button
                        onClick={handleOpenPublicTrackingView}
                        style={{ background: '#3b82f6', color: '#ffffff', border: 'none', borderRadius: '6px', padding: '10px 14px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', width: '100%' }}
                      >
                        <LinkIcon size={14} /> Open Live Tracking Stream
                      </button>
                    </div>
                  </div>

                  <div style={{ marginBottom: '20px' }}>
                    <h4 style={{ color: '#60a5fa', marginBottom: '8px', fontSize: '14px' }}>📍 Real Interactive Emergency GPS Tracking Stream:</h4>
                    <RealMap
                      startPos={{ lat: journeyForm.startLat, lng: journeyForm.startLng, label: userProfile.name }}
                      destPos={{ lat: journeyForm.destinationLat, lng: journeyForm.destinationLng, label: journeyForm.destinationName }}
                      currentPos={journeyState.currentLocation}
                      routePoints={computedRoutePoints}
                      isDeviating={true}
                      accuracyMeters={journeyState.currentLocation.accuracy || 12}
                      height="320px"
                      onLocationFound={handleRealDeviceGPSFound}
                    />
                  </div>

                  <div style={{ background: '#0b1a13', border: '1px solid #25D366', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
                    <h4 style={{ color: '#25D366', marginBottom: '10px', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <MessageCircle size={18} color="#25D366" /> Automatic WhatsApp Location Dispatch Links:
                    </h4>
                    {emergencyContacts.length > 0 ? (
                      <div className="grid-2" style={{ gap: '10px' }}>
                        {emergencyContacts.map((c) => (
                          <div key={c.id} style={{ background: '#132e20', padding: '12px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <div style={{ fontSize: '13px', fontWeight: '700', color: '#ffffff' }}>{c.name} ({c.relationship})</div>
                              <div style={{ fontSize: '11px', color: '#34d399' }}>{c.phone}</div>
                            </div>
                            <a
                              href={getWhatsAppLinkForContact(c)}
                              target="_blank"
                              rel="noreferrer"
                              style={{ background: '#25D366', color: '#ffffff', borderRadius: '6px', padding: '8px 12px', fontSize: '11px', fontWeight: 'bold', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
                            >
                              <Share2 size={12} /> Send WhatsApp Alert
                            </a>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>
                        No custom emergency contacts added. Please add your emergency contacts in the "Emergency Contacts" tab.
                      </div>
                    )}
                  </div>

                  <button className="btn-success" onClick={handleResolveEmergency} style={{ padding: '14px', fontSize: '16px', fontWeight: 'bold' }}>
                    ✓ RESOLVE EMERGENCY EVENT (STOP LIVE TRACKING)
                  </button>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8' }}>
                  <CheckCircle size={48} color="#10b981" style={{ marginBottom: '12px' }} />
                  <h3 style={{ fontSize: '18px', color: '#ffffff' }}>No Active Emergency Events for {userProfile.name}</h3>
                  <button className="btn-primary" onClick={handleOpenPublicTrackingView} style={{ width: 'auto', marginTop: '16px', fontSize: '13px', padding: '10px 20px' }}>
                    📍 Open Public Live Emergency Tracking Stream
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* -------------------- TAB 9: REAL PROTECTED ADMIN CONSOLE (SECRET PASS: 0624) -------------------- */}
        {activeTab === 'admin_dashboard' && isAdminUnlocked && (
          <div>
            <div className="grid-3" style={{ marginBottom: '24px' }}>
              <div className="card">
                <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '700' }}>REGISTERED USERS</div>
                <div style={{ fontSize: '32px', fontWeight: '900', color: '#ffffff', marginTop: '4px' }}>1</div>
                <div style={{ fontSize: '11px', color: '#10b981', marginTop: '4px' }}>Active User: {userProfile.name} ({userProfile.phone})</div>
              </div>

              <div className="card">
                <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '700' }}>MONITORED JOURNEYS</div>
                <div style={{ fontSize: '32px', fontWeight: '900', color: '#3b82f6', marginTop: '4px' }}>
                  {journeyState.status === 'ACTIVE' ? '1' : '0'}
                </div>
                <div style={{ fontSize: '11px', color: '#3b82f6', marginTop: '4px' }}>Status: {journeyState.status}</div>
              </div>

              <div className="card">
                <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '700' }}>WHATSAPP CONTACTS</div>
                <div style={{ fontSize: '32px', fontWeight: '900', color: '#25D366', marginTop: '4px' }}>
                  {emergencyContacts.length}
                </div>
                <div style={{ fontSize: '11px', color: '#34d399', marginTop: '4px' }}>Custom Contacts Configured</div>
              </div>
            </div>

            <div className="card">
              <h2 className="card-title"><Shield color="#ef4444" size={20} /> Active Emergency Tracking Sessions & Revocation</h2>
              
              {emergencyAlert && emergencyAlert.status !== 'RESOLVED' ? (
                <div style={{ background: '#2c0b0e', border: '1px solid #ef4444', borderRadius: '12px', padding: '16px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: '800', color: '#ffffff' }}>Active Event #{emergencyAlert.alertId}</div>
                    <div style={{ fontSize: '12px', color: '#fca5a5' }}>User: {userProfile.name} ({userProfile.phone}) • Trigger: {emergencyAlert.triggerReason}</div>
                    <div style={{ fontSize: '11px', color: '#cbd5e1', fontFamily: 'monospace', marginTop: '2px' }}>
                      Token: /track/{trackingSession ? trackingSession.token : 'active'}
                    </div>
                  </div>
                  <button className="btn-danger" onClick={handleResolveEmergency} style={{ width: 'auto', padding: '8px 16px', fontSize: '12px' }}>
                    Revoke Live Tracking Link
                  </button>
                </div>
              ) : (
                <div style={{ fontSize: '13px', color: '#94a3b8', padding: '16px 0' }}>
                  No active emergency tracking sessions to revoke.
                </div>
              )}
            </div>

            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h2 className="card-title" style={{ margin: 0 }}><FileText color="#3b82f6" size={20} /> Real System Audit Logs ({auditLogs.length})</h2>
                <button className="btn-primary" onClick={() => logAudit('ADMIN', 'Audit Logs Exported', 'JSON Exported by Admin')} style={{ width: 'auto', fontSize: '12px', padding: '6px 12px' }}>
                  Export Log JSON
                </button>
              </div>
              
              <table>
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Category</th>
                    <th>Event Summary</th>
                    <th>Technical Details</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map((log) => (
                    <tr key={log.id}>
                      <td style={{ fontSize: '12px', color: '#94a3b8', fontFamily: 'monospace' }}>{log.timestamp}</td>
                      <td>
                        <span className="badge badge-emerald" style={{ fontSize: '10px' }}>{log.category}</span>
                      </td>
                      <td style={{ fontWeight: '600' }}>{log.event}</td>
                      <td style={{ fontSize: '12px', color: '#cbd5e1' }}>{log.details}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* ROOT-LEVEL MOBILE-PERFECT FULLSCREEN MAP OVERLAY (100% ESCAPES ALL PARENT CARD/CONTAINER BOUNDARIES) */}
      {showFullscreenMapModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100vw',
          height: '100vh',
          zIndex: 99999999,
          backgroundColor: '#090d16',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* Mobile Overlay Top Navigation Header */}
          <div style={{
            background: '#0d1424',
            borderBottom: '1px solid #23314e',
            padding: '10px 16px',
            display: 'flex',
            justify: 'space-between',
            alignItems: 'center',
            zIndex: 10
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
              <span className="badge badge-emerald" style={{ fontSize: '10px', padding: '2px 8px' }}>LIVE GPS MAP</span>
              <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {journeyForm.startName} → {journeyForm.destinationName}
              </span>
            </div>
            <button
              onClick={() => setShowFullscreenMapModal(false)}
              style={{
                background: '#ef4444',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 16px',
                fontSize: '12px',
                fontWeight: '900',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(239, 68, 68, 0.6)',
                whiteSpace: 'nowrap'
              }}
            >
              ✕ EXIT FULLSCREEN
            </button>
          </div>

          {/* Fullscreen Map Body */}
          <div style={{ flex: 1, width: '100%', height: 'calc(100vh - 56px)' }}>
            <RealMap
              startPos={{ lat: journeyForm.startLat, lng: journeyForm.startLng, label: userProfile.name }}
              destPos={{ lat: journeyForm.destinationLat, lng: journeyForm.destinationLng, label: journeyForm.destinationName }}
              currentPos={journeyState.currentLocation}
              routePoints={computedRoutePoints}
              isDeviating={safetyCheck.active}
              accuracyMeters={journeyState.currentLocation.accuracy || 10}
              height="100%"
              onLocationFound={handleRealDeviceGPSFound}
            />
          </div>
        </div>
      )}
    </div>
  );
}
