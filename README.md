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


## Prerequisites
- Node.js v16+ and npm
- MongoDB (local or MongoDB Atlas)

## Backend Setup

cd backend
npm install
npm run dev       # starts with nodemon on port 5000

Admin account is auto-seeded on first start using credentials from .env:
  Email:    admin@iiit.ac.in
  Password: admin123

## Frontend Setup

cd frontend
npm install
npm start         # starts React dev server on port 3000

## Production Deployment

### Frontend (Vercel/Netlify)
1. Push code to GitHub
2. Connect frontend/ to Vercel or Netlify
3. Set build command: npm run build
4. Set output directory: build
5. Set environment variable (if needed): REACT_APP_API_URL=<backend_url>

### Backend (Render/Railway)
1. Connect backend/ to Render or Railway
2. Set build command: npm install
3. Set start command: node server.js
4. Set environment variables: MONGO_URI, JWT_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD
5. Update frontend api.js baseURL to deployed backend URL

### Database (MongoDB Atlas)
1. Create free cluster on mongodb.com
2. Create database user and whitelist IPs
3. Use connection string in MONGO_URI env variable

## Usage Flow

1. Open the frontend URL
2. Admin: login with admin@iiit.ac.in / admin1  23
   - Dashboard → Manage Clubs/Organizers → Add clubs, disable/remove, reset passwords
   - System auto-generates login email & password for new organizers
3. Organizer: login with credentials created by admin
   - Dashboard → Create Event → Form Builder → Save Draft → Publish
   - View analytics, manage participants, export CSV
   - Profile → Set Discord Webhook for auto-posting new events
4. Participant: register via /register, then set preferences (or skip)
   - IIIT students must use @iiit.ac.in / @students.iiit.ac.in / @research.iiit.ac.in email
   - Non-IIIT participants can use any email
   - Browse events, register, view tickets with QR codes