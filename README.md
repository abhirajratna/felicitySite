# Club Council Event Management System

**Roll Number:** 2024114011

## Tech Stack
- **Frontend:** React (Create React App), react-router-dom v6, axios
- **Backend:** Express.js, MongoDB (Mongoose), JWT auth, bcryptjs, nodemailer, qrcode, uuid
- **QR Scanning:** jsqr (browser-side decoding from camera/file upload)

## Setup & Run

### Backend
```bash
cd backend
npm install
node server.js
```
Backend runs on `http://localhost:5000`. Requires MongoDB on `localhost:27017`.

### Frontend
```bash
cd frontend
npm install
npm start
```
Frontend runs on `http://localhost:3000`.

### Default Admin
- Email: `admin@iiit.ac.in`
- Password: `admin123`

---

## Part 2 - Advanced Features (Section 13)

### Tier A Features (8 marks each)

#### 1. Merchandise Payment Approval Workflow
- **Location:** Backend: `routes/events.js` (approve/reject routes), Frontend: `EventDetails.js`, `OrganizerEventDetail.js`
- **How it works:**
  - When a participant purchases merchandise, they must upload a payment proof image (converted to base64)
  - The order enters `pending_approval` status — no QR code is generated and stock is not decremented yet
  - Organizers see a **Pending Orders** tab on their event detail page with payment proof images
  - Organizers can **Approve** (generates QR, decrements stock, sends confirmation email) or **Reject** orders
  - Participants see their pending order status on the event page

#### 2. QR Scanner & Attendance Tracking
- **Location:** Backend: `routes/events.js` (scan/attendance routes), Frontend: `OrganizerEventDetail.js` (Attendance tab)
- **How it works:**
  - Organizers have an **Attendance** tab with three check-in methods:
    1. **Camera Scan** — uses device camera via getUserMedia + jsqr for live QR scanning
    2. **File Upload** — upload a QR code image, decoded client-side with jsqr
    3. **Manual Entry** — paste a ticket ID directly
  - Backend validates the ticket, rejects duplicate scans, and records attendance with timestamp
  - Live attendance stats (checked-in count, percentage) displayed on the page
  - **Attendance CSV export** available for download
  - Manual check-ins include audit notes with organizer ID and timestamp

### Tier B Features (6 marks each)

#### 3. Organizer Password Reset Workflow
- **Location:** Backend: `routes/user.js`, `routes/admin.js`, Models: `PasswordResetRequest.js`, Frontend: `OrganizerProfile.js`, `AdminPasswordRequests.js`
- **How it works:**
  - Organizers can submit a password reset request with a reason from their profile page
  - Only one pending request allowed at a time
  - Admin sees all requests on the **Password Reset Requests** page with filter tabs (pending/approved/rejected/all)
  - Admin can **Approve** (auto-generates a new random password, hashes and saves it) or **Reject** with optional comments
  - Generated credentials are displayed to admin for secure sharing
  - Organizers can view their request history with status updates

#### 4. Real-Time Discussion Forum
- **Location:** Backend: `routes/discussion.js`, Model: `Discussion.js`, Frontend: `EventDetails.js`
- **How it works:**
  - Every event has a discussion section visible to registered participants and the organizer
  - Messages are polled every 5 seconds for near real-time updates
  - Features: **Threaded replies**, **Emoji reactions** (👍 ❤️ 😂), **Pinned messages**, **Announcements**
  - **Organizer moderation:** Can pin/unpin messages, delete any message, post announcements
  - Pinned messages appear at the top of the discussion
  - Participants can post, reply, and react to messages

### Tier C Feature (2 marks)

#### 5. Anonymous Feedback System
- **Location:** Backend: `routes/feedback.js`, Model: `Feedback.js`, Frontend: `EventDetails.js`
- **How it works:**
  - Registered participants can submit anonymous feedback (1-5 star rating + optional comment) for completed/closed events
  - Feedback is stored with participant reference but displayed **anonymously** (no names shown)
  - Aggregate stats: average rating, total reviews, rating distribution (1-5 star breakdown)
  - Upsert behavior: participants can update their feedback
  - Unique index on event+participant prevents duplicate entries
