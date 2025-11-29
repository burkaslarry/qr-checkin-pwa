# QR Check-In System (PWA)

A Progressive Web App for event check-in with three user roles:
1. **External Guest**: Scan Event QR -> Enter Name -> Check In.
2. **Internal Member**: Scan Event QR -> Select Name -> Check In.
3. **Admin**: Create Event QR, Manual Entry, Live Attendance Records.

## Tech Stack
- **Backend**: Python (FastAPI), WebSockets
- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Libraries**: `html5-qrcode` (Scanner), `qrcode.js` (Generator)

## Setup & Run

1. **Prerequisites**: Python 3.8+ installed.

2. **Run the Server**:
   ```bash
   chmod +x run.sh
   ./run.sh
   ```
   Or manually:
   ```bash
   pip install -r backend/requirements.txt
   cd backend
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```

3. **Access the App**:
   Open `http://localhost:8000` in your browser.

## Features
- **User Roles**: Landing page to select role.
- **Event QR**: Admin generates a specific QR for the event. Users must scan this to unlock the check-in form.
- **Real-time Updates**: Admin dashboard updates instantly via WebSocket when users check in.
- **Export**: Download attendance as CSV.
