import uvicorn
import logging
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.firebase import init_firebase
from app.api import auth, users, journeys, emergency, voice_codes, guardian, admin

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("sheildx.main")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Real Backend Engine for SheildX AI SafeCircle Watch System"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Firebase SDK
@app.on_event("startup")
def startup_event():
    init_firebase()
    logger.info("SheildX AI Backend Service started successfully.")

# Register API Routers
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(users.router, prefix=settings.API_V1_STR)
app.include_router(journeys.router, prefix=settings.API_V1_STR)
app.include_router(emergency.router, prefix=settings.API_V1_STR)
app.include_router(voice_codes.router, prefix=settings.API_V1_STR)
app.include_router(guardian.router, prefix=settings.API_V1_STR)
app.include_router(admin.router, prefix=settings.API_V1_STR)

@app.get("/")
def root():
    return {
        "system": settings.PROJECT_NAME,
        "status": "OPERATIONAL",
        "tagline": "Help, even when you cannot press SOS.",
        "version": settings.VERSION
    }

@app.get("/health")
def health_check():
    return {"status": "HEALTHY", "service": "sheildx-backend"}

# Real-time WebSocket connection for Live Emergency Location Streaming
class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception:
                pass

manager = ConnectionManager()

@app.websocket("/ws/live-tracking/{event_id}")
async def websocket_live_tracking(websocket: WebSocket, event_id: str):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_json()
            # Broadcast location update to all connected guardians/monitors
            await manager.broadcast({
                "event_id": event_id,
                "location": data.get("location"),
                "battery": data.get("battery", 90),
                "timestamp": data.get("timestamp")
            })
    except WebSocketDisconnect:
        manager.disconnect(websocket)

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
