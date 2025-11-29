import csv
import io
import json
from datetime import datetime
from typing import List, Optional

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

import os

# Define base path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FRONTEND_DIR = os.path.join(BASE_DIR, "frontend")

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory storage
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except:
                pass

manager = ConnectionManager()

# Data Models
class CheckInRequest(BaseModel):
    name: str
    type: str  # "guest" or "member"
    currentTime: str # ISO timestamp or similar

class EventRequest(BaseModel):
    name: str
    date: str

# Mock Data
members_db = [
    "Alice Smith", "Bob Jones", "Charlie Brown", "David Wilson", "Eva Green",
    "Frank White", "Grace Lee", "Henry Ford", "Ivy Chen", "Jack Black"
]

attendance_db = []
events_db = []

# Routes

@app.post("/api/events")
async def create_event(event: EventRequest):
    events_db.append(event.dict())
    return {"status": "success", "message": "Event created"}

@app.get("/api/members")
async def get_members():
    return {"members": members_db}

@app.post("/api/checkin")
async def check_in(checkin: CheckInRequest):
    # Validate type
    if checkin.type.lower() not in ["guest", "member"]:
        raise HTTPException(status_code=400, detail="Invalid user type")
    
    record = {
        "name": checkin.name,
        "type": checkin.type.lower(),
        "timestamp": checkin.currentTime,
        "received_at": datetime.now().isoformat()
    }
    
    attendance_db.append(record)
    
    # Broadcast to admin
    await manager.broadcast({
        "type": "new_checkin",
        "data": record
    })
    
    return {"status": "success", "message": "Check-in successful"}

@app.get("/api/records")
async def get_records():
    return {"records": attendance_db}

@app.get("/api/export")
async def export_records():
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Name", "Type", "Check-in Time", "Server Received Time"])
    
    for record in attendance_db:
        writer.writerow([
            record["name"],
            record["type"],
            record["timestamp"],
            record["received_at"]
        ])
    
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=attendance.csv"}
    )

@app.websocket("/ws/records")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)

# Serve Static Files
app.mount("/static", StaticFiles(directory=os.path.join(FRONTEND_DIR, "static")), name="static")

# Serve HTML Pages
@app.get("/")
async def read_index():
    return FileResponse(os.path.join(FRONTEND_DIR, "index.html"))

@app.get("/guest")
async def read_guest():
    return FileResponse(os.path.join(FRONTEND_DIR, "guest.html"))

@app.get("/member")
async def read_member():
    return FileResponse(os.path.join(FRONTEND_DIR, "member.html"))

@app.get("/admin")
async def read_admin():
    return FileResponse(os.path.join(FRONTEND_DIR, "admin.html"))

