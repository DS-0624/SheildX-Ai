# SheildX AI — SafeCircle Watch System

> **Tagline:** *"Help, even when you cannot press SOS."*
>
> **Product Identity:** Full-Stack Smartwatch + Mobile Safety Ecosystem combining Wear OS smartwatches, Child/User mobile apps, Parent/Guardian monitoring apps, FastAPI backend engine, Firebase Firestore/Auth, FCM push notifications, multi-recipient email alerts (4 emergency contacts), WhatsApp Cloud API integration, and Web Admin Dashboard.

---

## 1. Product Overview & Safety Philosophy

SafeCircle Watch does not rely solely on a manual SOS button. It operates on a proactive, intelligent multi-tiered safety model:

$$\text{Voice Code} + \text{Journey Context} + \text{Destination} + \text{Route Monitoring} + \text{Silent Check} + \text{Staged Escalation}$$

### Core Safety Workflow:
1. **Personal Emergency Voice Code:** User sets a secret emergency phrase (e.g., `"Blue Jasmine"`). Saying the phrase during an active journey immediately triggers emergency `ALERT` and `LIVE_RESPONSE` states without delay.
2. **Destination & Journey Mode:** User selects start point, destination, suggested ETA, and starts journey monitoring.
3. **Route Deviation Detection:** Continuous Haversine & segment distance evaluation against planned polyline. Filters GPS noise and temporary drift.
4. **Silent Safety Checks (3x 30s):**
   - Sustained route deviation triggers **Check #1**: Watch vibrates & asks *"Are you safe?"* with **YES — I'M SAFE** / **NO — SEND HELP** and a 30-second timer.
   - **YES:** Resets check & returns to normal journey active.
   - **NO:** Immediately escalates to emergency state.
   - **Timeout (30s):** Triggers **Check #2** (vibrates + 30s timer).
   - **Timeout (30s):** Triggers **Check #3** (vibrates + 30s timer).
   - **Timeout after Check #3:** **AUTOMATIC EMERGENCY ESCALATION** — Dispatches FCM Push to Guardian App, emails all 4 registered emergency contacts, sends WhatsApp alert, and opens live GPS tracking stream.

---

## 2. Full Architecture Diagram

```text
+-----------------------+              +------------------------+
|  SafeCircle Watch     | --- Bluetooth/|  SafeCircle Child App  |
|  (Wear OS App)        |   Data Layer |  (Kotlin / Compose)    |
+-----------------------+              +------------------------+
                                                    |
                                            REST / WebSockets
                                                    v
                                       +------------------------+
                                       |  FastAPI Backend       |
                                       |  (Route & Escalation)  |
                                       +------------------------+
                                         /          |          \
                                        v           v           v
                          +------------------+ +----------+ +-------------------+
                          | Firebase Firestore| |  FCM Push| | 4 Emergency Emails|
                          |  & Security Rules| | Notification| & WhatsApp Cloud API|
                          +------------------+ +----------+ +-------------------+
                                                    |
                                                    v
                                       +------------------------+
                                       | Parent / Guardian App  |
                                       | & Admin Dashboard      |
                                       +------------------------+
```

---

## 3. Project Structure

```text
SheildX_Ai/
├── backend/
│   ├── app/
│   │   ├── api/             # Auth, Users, Journeys, Emergency, VoiceCodes, Guardian, Admin
│   │   ├── core/            # Config, Security, Firebase SDK & Fallback Mock DB
│   │   ├── models/          # Schemas (User, Journey, EmergencyContact, EmergencyEvent)
│   │   ├── services/        # RouteEngine, EscalationEngine, Email, WhatsApp, FCM
│   │   └── main.py          # FastAPI application entrypoint with WebSockets
│   ├── tests/               # Test suites (RouteEngine, Escalation, Emergency)
│   ├── run_tests.py         # Standard Python unit test runner
│   ├── requirements.txt
│   └── Dockerfile
├── firebase/
│   ├── firestore.rules      # Strict Security Rules with RBAC
│   └── firestore.indexes.json
├── android/
│   ├── user-app/            # Child/User Mobile App (Kotlin + Compose)
│   ├── guardian-app/        # Parent/Guardian Mobile App (Kotlin + Compose)
│   └── wear-os-app/         # Wear OS Smartwatch App (Haptics, Vibration, 30s Check UI)
├── admin-dashboard/         # React + Vite Web Admin Dashboard
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## 4. Environment Variables Setup

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

Key variables:
- `FIREBASE_PROJECT_ID`: Firebase project identifier.
- `SMTP_HOST` & `SMTP_PASSWORD`: SMTP server credentials for dispatching alerts to 4 registered emergency emails.
- `WHATSAPP_API_TOKEN` & `WHATSAPP_PHONE_NUMBER_ID`: WhatsApp Business Cloud API integration payload.
- `GOOGLE_MAPS_API_KEY`: Google Maps Directions & Geocoding key.

---

## 5. Running the Backend & Test Suite

### Running Backend Tests:
```bash
cd backend
python run_tests.py
```
*Expected Output:*
```text
.....
----------------------------------------------------------------------
Ran 5 tests in 0.002s

OK
```

### Starting Backend API Server:
```bash
cd backend
python -m uvicorn app.main:app --reload --port 8000
```
Interactive API docs available at: `http://localhost:8000/docs`

---

## 6. Running Web Admin Dashboard

```bash
cd admin-dashboard
npm install
npm run dev
```
Open: `http://localhost:3000`

---

## 7. Android & Wear OS App Compilation

Open the `android/` directory in Android Studio:
1. `:user-app` — Main Child/User app (Speech recognition for `"Blue Jasmine"`, 4 Emergency Emails registration, Journey setup).
2. `:guardian-app` — Parent/Guardian app (Secure invitation code linking, Live Emergency Tracking map, Acknowledge & Resolve controls).
3. `:wear-os-app` — Wear OS Smartwatch app (Vibration haptics, 30s *"Are you safe?"* UI, manual SOS tap gesture).

---

## 8. Summary Statement

*"SheildX AI SafeCircle Watch is a real smartwatch and mobile safety system that lets a user define a private emergency voice code, set a destination and expected arrival time, monitor the journey, detect meaningful route deviation, silently ask 'Are you safe?' up to three times at 30-second intervals, immediately escalate when the user selects No, and automatically escalate when the user cannot respond — notifying authorized guardians through the app, email (4 emergency contacts), and WhatsApp while sharing the user's live location during the active emergency."*
