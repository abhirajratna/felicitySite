# Club Council Event Management System

**Roll Number:** 2024114011

A web app for managing campus club events — handles everything from event creation and registration to merchandise sales, attendance tracking, and feedback collection. Built as part of DASS Assignment 1.

Deployed at: https://felicity-site.vercel.app (frontend), https://felicitysite.onrender.com (backend API)

## Libraries and Frameworks

**Frontend:**
- **React** (via Create React App) — picked this since it's what I'm most comfortable with for building SPAs. CRA handles the webpack/babel config so I didn't have to set that up manually.
- **react-router-dom v6** — for client-side routing. v6 has a simpler API than v5 and the nested routes work well for the dashboard layouts.
- **axios** — HTTP client for API calls. Chose it over fetch because the interceptor pattern makes it easy to attach the JWT token to every request automatically (see `api.js`).
- **jsqr** — browser-side QR code decoder. I use this for the attendance scanner feature — it works with both camera streams and uploaded images without needing a native app or server-side processing.

**Backend:**
- **Express.js** — lightweight and flexible, good enough for a REST API of this size. Didn't need anything heavier.
- **Mongoose** (MongoDB ODM) — schemas give some structure to MongoDB documents, and the populate/virtuals are useful for joining user data with events and registrations.
- **jsonwebtoken** — JWT-based auth. Tokens are generated on login and verified via middleware on protected routes. Went with JWTs over sessions since the frontend is a separate SPA.
- **bcryptjs** — password hashing. Using the JS implementation so there's no native dependency issues during deployment.
- **qrcode** — generates QR code images (as data URLs) for event tickets. The QR encodes the ticket ID + event ID + participant ID as JSON.
- **uuid** — generates unique ticket IDs for registrations.
- **nodemailer** — sends confirmation emails with QR code attachments when someone registers or gets their merchandise order approved.
- **node-fetch** — used to send Discord webhook notifications when organizers publish events (if they've configured a webhook URL in their profile).
- **crypto** (built-in) — generates random passwords for organizer accounts and password resets.

## Advanced Features

### Merchandise Payment Approval Workflow (Tier A)

For merchandise events, I needed a way for organizers to verify payments before confirming orders. The flow works like this: participants upload a payment proof image (stored as base64 in the registration subdocument), and the order goes into `pending_approval` status. Stock isn't decremented and no QR code is generated at this stage — that only happens on approval. Organizers see a "Pending Orders" tab on their event detail page where they can view the proof images and approve or reject each order. On approval, the system decrements stock, generates a QR ticket, and sends a confirmation email. On rejection, a notification email is sent explaining the rejection.

I stored registrations as subdocuments within the Event schema rather than a separate collection — this keeps everything atomic and avoids needing transactions for stock updates. The tradeoff is that events with lots of registrations get large, but for a campus setting the numbers are manageable.

Key files: `backend/routes/events.js` (approve/reject endpoints), `frontend/src/pages/OrganizerEventDetail.js` (pending orders tab), `frontend/src/pages/EventDetails.js` (purchase flow with proof upload).

### QR Scanner & Attendance Tracking (Tier A)

The attendance system supports three check-in methods:
1. **Live camera scan** — uses `getUserMedia` to access the device camera, draws video frames to a canvas, and runs jsqr on each frame in a `requestAnimationFrame` loop. This was the trickiest part — I had to handle camera permissions, cleanup on unmount, and parse the QR data (JSON with ticketId, eventId, participantId).
2. **Image upload** — same jsqr decoding but from a file input instead of a video stream.
3. **Manual ticket ID entry** — fallback for when QR scanning isn't practical.

The backend validates the ticket against the event, checks for duplicate scans, and marks attendance with a timestamp. Manual check-ins include an audit note with the organizer's ID and time. I also added CSV export for attendance data and a stats dashboard showing check-in rates.

Key files: `backend/routes/events.js` (scan, attendance, manual-checkin endpoints), `frontend/src/pages/OrganizerEventDetail.js` (attendance tab with scanner UI).

### Organizer Password Reset Workflow (Tier B)

Since organizer accounts are created by the admin (not self-registered), organizers can't just reset their own passwords freely. Instead, they submit a request with an optional reason, and the admin approves or rejects it from a dedicated page. On approval, the system auto-generates a random password (using `crypto.randomBytes`), hashes it, updates the account, and displays the new credentials to the admin for sharing. I added a constraint so only one pending request per organizer is allowed at a time.

Key files: `backend/routes/user.js` (submit request), `backend/routes/admin.js` (approve/reject), `backend/models/PasswordResetRequest.js`, `frontend/src/pages/AdminPasswordRequests.js`.

### Discussion Forum (Tier B)

Each event has a discussion thread where registered participants and the organizer can post messages. I went with polling (every 5 seconds) instead of WebSockets since it's simpler to deploy and the near-real-time delay is acceptable for this use case. New message notifications show up as a badge that users can dismiss.

Features: threaded replies, emoji reactions (stored as a Map in the Discussion schema), message pinning (organizer-only, pinned messages sort to top), announcements, and organizer moderation (delete any message). The Discussion model uses subdocuments for messages and nested subdocuments for replies.

Key files: `backend/routes/discussion.js`, `backend/models/Discussion.js`, `frontend/src/pages/EventDetails.js`.

### Anonymous Feedback System (Tier C)

Participants can leave anonymous feedback (1–5 stars + optional comment) on completed or closed events. Feedback is stored with a participant reference (for upsert behavior — one review per person per event) but the GET endpoint strips participant info before returning results. The frontend shows aggregate stats (average rating, distribution) and lets users filter reviews by star rating.

Key files: `backend/routes/feedback.js`, `backend/models/Feedback.js`, `frontend/src/pages/EventDetails.js`.

## Setup

### Prerequisites
- Node.js v16+
- MongoDB (local or Atlas)

### Backend
```bash
cd backend
npm install
node server.js
```
Runs on `http://localhost:5000`. Set env vars in `.env`: `MONGO_URI`, `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `EMAIL_USER`, `EMAIL_PASS`.

Admin account is auto-seeded on first start (default: `admin@iiit.ac.in` / `admin123`).

### Frontend
```bash
cd frontend
npm install
npm start
```
Runs on `http://localhost:3001`. API base URL is configured in `src/api.js`.