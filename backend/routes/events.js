const router = require('express').Router();
const Event = require('../models/Event');
const User = require('../models/User');
const { auth, authorize } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');
const QRCode = require('qrcode');
const { sendTicketEmail, buildTicketEmailHtml } = require('../utils/email');

// Helper: send discord webhook when event is published
async function sendDiscordNotification(organizer, event) {
  if (!organizer.discordWebhook) return;
  try {
    const fetch = (await import('node-fetch')).default;
    await fetch(organizer.discordWebhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: `🎉 **New Event Published!**\n**${event.title}**\nType: ${event.eventType}\nDate: ${event.startDate ? new Date(event.startDate).toLocaleDateString() : 'TBA'}\nVenue: ${event.venue || 'TBA'}\nOrganized by: ${organizer.organizerName}`,
      }),
    });
  } catch (e) { console.error('Discord webhook error:', e.message); }
}

// ─── ORGANIZER: CRUD ──────────────────────────────────────────────

// POST /api/events — create event (organizer only, starts as draft)
router.post('/', auth, authorize('organizer'), async (req, res) => {
  try {
    const data = req.body;
    data.organizer = req.user.id;
    if (!data.status) data.status = 'draft';
    const event = await Event.create(data);
    res.status(201).json({ event });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// PUT /api/events/:id — update event with editing rules
router.put('/:id', auth, authorize('organizer'), async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ msg: 'Event not found' });
    if (event.organizer.toString() !== req.user.id) return res.status(403).json({ msg: 'Not your event' });

    const updates = req.body;
    const oldStatus = event.status;

    // Editing rules based on status
    if (oldStatus === 'draft') {
      // Draft: free edits, can be published
      Object.assign(event, updates);
      // If publishing, send discord notification
      if (updates.status === 'published' && oldStatus !== 'published') {
        const organizer = await User.findById(req.user.id);
        await sendDiscordNotification(organizer, event);
      }
    } else if (oldStatus === 'published') {
      // Published: only description update, extend deadline, increase limit, close registrations, status change
      const allowed = ['description', 'registrationDeadline', 'registrationLimit', 'status'];
      for (const key of allowed) {
        if (updates[key] !== undefined) {
          if (key === 'registrationLimit' && updates[key] < event.registrationLimit) continue; // can only increase
          event[key] = updates[key];
        }
      }
    } else if (oldStatus === 'ongoing' || oldStatus === 'completed') {
      // Ongoing/Completed: no edits except status change
      if (updates.status) event.status = updates.status;
    } else if (oldStatus === 'closed' || oldStatus === 'cancelled') {
      // Closed/cancelled: no edits
      return res.status(400).json({ msg: 'Cannot edit a closed or cancelled event' });
    }

    // Lock custom form fields after first registration
    if (event.registrations.length > 0 && updates.customFormFields) {
      delete updates.customFormFields;
    }

    await event.save();
    res.json({ event });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// DELETE /api/events/:id
router.delete('/:id', auth, authorize('organizer', 'admin'), async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ msg: 'Event not found' });
    if (req.user.role === 'organizer' && event.organizer.toString() !== req.user.id)
      return res.status(403).json({ msg: 'Not your event' });
    await Event.findByIdAndDelete(req.params.id);
    res.json({ msg: 'Event deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// ─── PARTICIPANT: MY EVENTS (must be before /:id) ──────────────────

// GET /api/events/my/registrations — all events user registered for
router.get('/my/registrations', auth, authorize('participant'), async (req, res) => {
  try {
    const events = await Event.find({ 'registrations.participant': req.user.id })
      .populate('organizer', 'organizerName category')
      .lean();

    const result = events.map(e => {
      const myRegs = e.registrations.filter(r => r.participant.toString() === req.user.id);
      return { ...e, myRegistrations: myRegs };
    });
    res.json({ events: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// GET /api/events/my/ticket/:ticketId — get ticket details with QR
router.get('/my/ticket/:ticketId', auth, async (req, res) => {
  try {
    const event = await Event.findOne({ 'registrations.ticketId': req.params.ticketId })
      .populate('organizer', 'organizerName category contactEmail');
    if (!event) return res.status(404).json({ msg: 'Ticket not found' });

    const reg = event.registrations.find(r => r.ticketId === req.params.ticketId);
    if (!reg) return res.status(404).json({ msg: 'Ticket not found' });

    // Verify ownership or admin
    if (reg.participant.toString() !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'organizer')
      return res.status(403).json({ msg: 'Access denied' });

    const participant = await User.findById(reg.participant).select('firstName lastName email');

    // Only generate QR for confirmed tickets (not pending/rejected)
    let qrDataUrl = null;
    if (reg.status === 'confirmed') {
      const qrData = JSON.stringify({ ticketId: reg.ticketId, eventId: event._id, participantId: reg.participant });
      qrDataUrl = await QRCode.toDataURL(qrData);
    }

    res.json({
      ticket: {
        ticketId: reg.ticketId,
        status: reg.status,
        registeredAt: reg.registeredAt,
        size: reg.size,
        color: reg.color,
        variant: reg.variant,
        quantity: reg.quantity,
        formAnswers: reg.formAnswers,
      },
      event: {
        id: event._id,
        title: event.title,
        eventType: event.eventType,
        startDate: event.startDate,
        endDate: event.endDate,
        venue: event.venue,
        organizer: event.organizer,
      },
      participant,
      qrDataUrl,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// ─── ORGANIZER: own events (must be before /:id) ──────────────────

// GET /api/events/organizer/mine — events by current organizer
router.get('/organizer/mine', auth, authorize('organizer'), async (req, res) => {
  try {
    const events = await Event.find({ organizer: req.user.id })
      .populate('registrations.participant', 'firstName lastName email')
      .sort({ createdAt: -1 });
    res.json({ events });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// GET /api/events/organizer/:organizerId — events by a specific organizer (public)
router.get('/organizer/:organizerId', auth, async (req, res) => {
  try {
    const events = await Event.find({ organizer: req.params.organizerId, status: { $in: ['published', 'ongoing'] } })
      .populate('organizer', 'organizerName category')
      .sort({ startDate: 1 });
    res.json({ events });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// GET /api/events/analytics/mine — organizer analytics for completed events
router.get('/analytics/mine', auth, authorize('organizer'), async (req, res) => {
  try {
    const events = await Event.find({ organizer: req.user.id, status: { $in: ['completed', 'closed'] } }).lean();
    let totalRegistrations = 0;
    let totalRevenue = 0;
    let totalMerchSales = 0;
    events.forEach(e => {
      const confirmed = e.registrations.filter(r => r.status === 'confirmed');
      totalRegistrations += confirmed.length;
      if (e.eventType === 'merchandise') {
        const sales = confirmed.reduce((s, r) => s + (r.quantity || 1), 0);
        totalMerchSales += sales;
        totalRevenue += sales * (e.price || 0);
      } else {
        totalRevenue += confirmed.length * (e.registrationFee || 0);
      }
    });
    res.json({ totalEvents: events.length, totalRegistrations, totalRevenue, totalMerchSales });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// GET /api/events/export/:id — export participants as CSV
router.get('/export/:id', auth, authorize('organizer'), async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('registrations.participant', 'firstName lastName email contactNumber');
    if (!event) return res.status(404).json({ msg: 'Event not found' });
    if (event.organizer.toString() !== req.user.id) return res.status(403).json({ msg: 'Not your event' });

    let csv = 'Name,Email,Registration Date,Status,Ticket ID';
    if (event.eventType === 'merchandise') csv += ',Size,Color,Variant,Quantity';
    csv += '\n';

    event.registrations.forEach(r => {
      const p = r.participant;
      const name = p ? `${p.firstName} ${p.lastName}` : 'Unknown';
      const email = p ? p.email : '';
      const regDate = r.registeredAt ? new Date(r.registeredAt).toISOString().split('T')[0] : '';
      let row = `"${name}","${email}","${regDate}","${r.status}","${r.ticketId}"`;
      if (event.eventType === 'merchandise') {
        row += `,"${r.size || ''}","${r.color || ''}","${r.variant || ''}","${r.quantity || 1}"`;
      }
      csv += row + '\n';
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${event.title}-participants.csv"`);
    res.send(csv);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// ─── MERCHANDISE PAYMENT APPROVAL ──────────────────────────────────

// GET /api/events/pending/:id — pending orders for an event
router.get('/pending/:id', auth, authorize('organizer'), async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('registrations.participant', 'firstName lastName email');
    if (!event) return res.status(404).json({ msg: 'Event not found' });
    if (event.organizer.toString() !== req.user.id) return res.status(403).json({ msg: 'Not your event' });
    const pending = event.registrations.filter(r => r.status === 'pending_approval');
    res.json({ pending });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// PUT /api/events/approve/:eventId/:ticketId — approve merchandise payment
router.put('/approve/:eventId/:ticketId', auth, authorize('organizer'), async (req, res) => {
  try {
    const event = await Event.findById(req.params.eventId);
    if (!event) return res.status(404).json({ msg: 'Event not found' });
    if (event.organizer.toString() !== req.user.id) return res.status(403).json({ msg: 'Not your event' });

    const reg = event.registrations.find(r => r.ticketId === req.params.ticketId);
    if (!reg) return res.status(404).json({ msg: 'Registration not found' });
    if (reg.status !== 'pending_approval') return res.status(400).json({ msg: 'Not in pending state' });

    // Approve: set confirmed, decrement stock, generate QR, send email
    reg.status = 'confirmed';
    const qty = reg.quantity || 1;
    if (event.stockQuantity > 0) {
      if (event.stockQuantity < qty) {
        return res.status(400).json({ msg: 'Not enough stock to fulfill this order' });
      }
      event.stockQuantity -= qty;
    }
    await event.save();

    const participant = await User.findById(reg.participant).select('firstName lastName email');
    const qrData = JSON.stringify({ ticketId: reg.ticketId, eventId: event._id, participantId: reg.participant });
    const qrDataUrl = await QRCode.toDataURL(qrData);

    const extras = [];
    if (reg.size) extras.push({ label: 'Size', value: reg.size });
    if (reg.color) extras.push({ label: 'Color', value: reg.color });
    if (reg.variant) extras.push({ label: 'Variant', value: reg.variant });
    extras.push({ label: 'Quantity', value: String(qty) });
    extras.push({ label: 'Total', value: `₹${qty * (event.price || 0)}` });

    const emailHtml = buildTicketEmailHtml({
      eventTitle: event.title,
      ticketId: reg.ticketId,
      eventDate: event.startDate ? new Date(event.startDate).toLocaleDateString() : 'TBA',
      venue: event.venue || 'TBA',
      participantName: `${participant.firstName} ${participant.lastName}`,
      qrDataUrl,
      extras,
    });
    sendTicketEmail(participant.email, `Payment Approved: ${event.title}`, emailHtml, qrDataUrl);

    res.json({ msg: 'Payment approved', ticketId: reg.ticketId, qrDataUrl });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// PUT /api/events/reject/:eventId/:ticketId — reject merchandise payment
router.put('/reject/:eventId/:ticketId', auth, authorize('organizer'), async (req, res) => {
  try {
    const event = await Event.findById(req.params.eventId);
    if (!event) return res.status(404).json({ msg: 'Event not found' });
    if (event.organizer.toString() !== req.user.id) return res.status(403).json({ msg: 'Not your event' });

    const reg = event.registrations.find(r => r.ticketId === req.params.ticketId);
    if (!reg) return res.status(404).json({ msg: 'Registration not found' });
    if (reg.status !== 'pending_approval') return res.status(400).json({ msg: 'Not in pending state' });

    reg.status = 'rejected';
    // Restore stock reservation if needed
    await event.save();

    // Send rejection notification email
    const rejectedParticipant = await User.findById(reg.participant).select('firstName lastName email');
    if (rejectedParticipant) {
      const rejectHtml = `
        <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;border:2px solid #f44336;border-radius:12px;overflow:hidden;">
          <div style="background:#f44336;color:#fff;padding:16px 20px;text-align:center;">
            <h2 style="margin:0;">Payment Rejected</h2>
          </div>
          <div style="padding:20px;">
            <p>Hi ${rejectedParticipant.firstName},</p>
            <p>Your payment for <strong>${event.title}</strong> has been rejected by the organizer.</p>
            <p><strong>Ticket ID:</strong> ${reg.ticketId}</p>
            <p>Please contact the organizer if you believe this is an error, or submit a new order with valid payment proof.</p>
          </div>
        </div>`;
      sendTicketEmail(rejectedParticipant.email, `Payment Rejected: ${event.title}`, rejectHtml);
    }

    res.json({ msg: 'Payment rejected' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// ─── QR SCANNER & ATTENDANCE TRACKING ──────────────────────────────

// POST /api/events/scan/:id — scan QR and mark attendance
router.post('/scan/:id', auth, authorize('organizer'), async (req, res) => {
  try {
    const { ticketId, participantId } = req.body;
    const event = await Event.findById(req.params.id)
      .populate('registrations.participant', 'firstName lastName email');
    if (!event) return res.status(404).json({ msg: 'Event not found' });
    if (event.organizer.toString() !== req.user.id) return res.status(403).json({ msg: 'Not your event' });

    const reg = event.registrations.find(r => r.ticketId === ticketId);
    if (!reg) return res.status(404).json({ msg: 'Invalid ticket' });
    if (reg.status !== 'confirmed') return res.status(400).json({ msg: `Ticket status is ${reg.status}` });

    // Check duplicate scan
    if (reg.attendanceChecked) {
      return res.status(400).json({
        msg: `Already checked in at ${new Date(reg.attendanceCheckedAt).toLocaleString()}`,
        duplicate: true,
      });
    }

    reg.attendanceChecked = true;
    reg.attendanceCheckedAt = new Date();
    await event.save();

    const p = reg.participant;
    const participantName = p ? `${p.firstName} ${p.lastName}` : 'Unknown';
    res.json({
      msg: 'Attendance marked',
      participant: { name: participantName, email: p?.email || '' },
      participantName,
      ticketId: reg.ticketId,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// GET /api/events/attendance/:id — attendance dashboard data
router.get('/attendance/:id', auth, authorize('organizer'), async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('registrations.participant', 'firstName lastName email');
    if (!event) return res.status(404).json({ msg: 'Event not found' });
    if (event.organizer.toString() !== req.user.id) return res.status(403).json({ msg: 'Not your event' });

    const confirmed = event.registrations.filter(r => r.status === 'confirmed');
    const checkedIn = confirmed.filter(r => r.attendanceChecked);
    const notCheckedIn = confirmed.filter(r => !r.attendanceChecked);

    res.json({
      total: confirmed.length,
      checkedIn: checkedIn.length,
      notCheckedIn: notCheckedIn.length,
      checkedInList: checkedIn.map(r => ({
        ticketId: r.ticketId,
        name: r.participant ? `${r.participant.firstName} ${r.participant.lastName}` : 'Unknown',
        email: r.participant?.email || '',
        checkedAt: r.attendanceCheckedAt,
        note: r.attendanceNote || '',
      })),
      notCheckedInList: notCheckedIn.map(r => ({
        ticketId: r.ticketId,
        name: r.participant ? `${r.participant.firstName} ${r.participant.lastName}` : 'Unknown',
        email: r.participant?.email || '',
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// GET /api/events/attendance-export/:id — export attendance CSV
router.get('/attendance-export/:id', auth, authorize('organizer'), async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('registrations.participant', 'firstName lastName email');
    if (!event) return res.status(404).json({ msg: 'Event not found' });
    if (event.organizer.toString() !== req.user.id) return res.status(403).json({ msg: 'Not your event' });

    let csv = 'Name,Email,Ticket ID,Status,Checked In,Checked At,Note\n';
    event.registrations.filter(r => r.status === 'confirmed').forEach(r => {
      const p = r.participant;
      const name = p ? `${p.firstName} ${p.lastName}` : 'Unknown';
      csv += `"${name}","${p?.email || ''}","${r.ticketId}","${r.status}","${r.attendanceChecked ? 'Yes' : 'No'}","${r.attendanceCheckedAt ? new Date(r.attendanceCheckedAt).toISOString() : ''}","${r.attendanceNote || ''}"\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${event.title}-attendance.csv"`);
    res.send(csv);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// POST /api/events/manual-checkin/:id/:ticketId — manual check-in with audit
router.post('/manual-checkin/:id/:ticketId', auth, authorize('organizer'), async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ msg: 'Event not found' });
    if (event.organizer.toString() !== req.user.id) return res.status(403).json({ msg: 'Not your event' });

    const reg = event.registrations.find(r => r.ticketId === req.params.ticketId);
    if (!reg) return res.status(404).json({ msg: 'Ticket not found' });

    const note = req.body.note || 'Manual check-in by organizer';
    reg.attendanceChecked = true;
    reg.attendanceCheckedAt = new Date();
    reg.attendanceNote = `[MANUAL] ${note} (by ${req.user.id} at ${new Date().toISOString()})`;
    await event.save();

    res.json({ msg: 'Manual check-in successful', ticketId: reg.ticketId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// ─── PUBLIC / PARTICIPANT: BROWSE ──────────────────────────────────

// GET /api/events — browse events with search, filters, trending
router.get('/', auth, async (req, res) => {
  try {
    const { search, type, eligibility, dateFrom, dateTo, followedOnly, trending } = req.query;
    let query = { status: { $in: ['published', 'ongoing'] } };

    // Filter by type
    if (type) query.eventType = type;

    // Filter by eligibility
    if (eligibility && eligibility !== 'all') query.eligibility = { $in: [eligibility, 'all'] };

    // Date range filter
    if (dateFrom || dateTo) {
      query.startDate = {};
      if (dateFrom) query.startDate.$gte = new Date(dateFrom);
      if (dateTo) query.startDate.$lte = new Date(dateTo);
    }

    // Followed clubs filter
    if (followedOnly === 'true' && req.user.role === 'participant') {
      const me = await User.findById(req.user.id);
      if (me && me.followedClubs.length > 0) {
        query.organizer = { $in: me.followedClubs };
      }
    }

    // Search: partial & fuzzy matching on title or organizer name
    let events;
    if (search) {
      const regex = new RegExp(search.split('').join('.*'), 'i'); // fuzzy
      const matchingOrgs = await User.find({ role: 'organizer', organizerName: { $regex: regex } }).select('_id');
      const orgIds = matchingOrgs.map(o => o._id);
      query.$or = [
        { title: { $regex: regex } },
        { organizer: { $in: orgIds } },
      ];
    }

    // Trending: top 5 by recent view count in last 24h
    if (trending === 'true') {
      const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
      events = await Event.find(query)
        .populate('organizer', 'organizerName category contactEmail')
        .lean();
      // Count recent views
      events = events.map(e => ({
        ...e,
        trendScore: (e.recentViews || []).filter(d => new Date(d) > cutoff).length,
      }));
      events.sort((a, b) => b.trendScore - a.trendScore);
      events = events.slice(0, 5);
      return res.json({ events });
    }

    events = await Event.find(query)
      .populate('organizer', 'organizerName category contactEmail')
      .sort({ startDate: 1 })
      .lean();

    // Preference-based ordering: boost events matching user interests and followed clubs
    if (req.user.role === 'participant') {
      const me = await User.findById(req.user.id).lean();
      if (me && (me.interests?.length > 0 || me.followedClubs?.length > 0)) {
        const userInterests = (me.interests || []).map(i => i.toLowerCase());
        const followedIds = (me.followedClubs || []).map(id => id.toString());
        events = events.map(e => {
          let score = 0;
          // Boost for matching tags with user interests
          if (e.tags && userInterests.length > 0) {
            const matchingTags = e.tags.filter(t => userInterests.includes(t.toLowerCase()));
            score += matchingTags.length * 2;
          }
          // Boost for followed club/organizer
          if (e.organizer && followedIds.includes(e.organizer._id.toString())) {
            score += 3;
          }
          // Boost for matching organizer category with user interests
          if (e.organizer?.category && userInterests.includes(e.organizer.category.toLowerCase())) {
            score += 1;
          }
          return { ...e, recommendationScore: score };
        });
        // Sort by recommendation score (desc), then by startDate (asc)
        events.sort((a, b) => {
          if (b.recommendationScore !== a.recommendationScore) return b.recommendationScore - a.recommendationScore;
          return new Date(a.startDate || 0) - new Date(b.startDate || 0);
        });
      }
    }

    res.json({ events });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// GET /api/events/:id — event details
router.get('/:id', auth, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('organizer', 'organizerName category description contactEmail')
      .populate('registrations.participant', 'firstName lastName email');
    if (!event) return res.status(404).json({ msg: 'Event not found' });

    // Increment view count for trending
    event.viewCount += 1;
    event.recentViews.push(new Date());
    // Trim old views (older than 24h)
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    event.recentViews = event.recentViews.filter(d => d > cutoff);
    await event.save();

    res.json({ event });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// ─── PARTICIPANT: REGISTRATION ──────────────────────────────────────

// POST /api/events/:id/register — register for event
router.post('/:id/register', auth, authorize('participant'), async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ msg: 'Event not found' });
    if (event.status !== 'published') return res.status(400).json({ msg: 'Event not open for registration' });

    // Check deadline
    if (event.registrationDeadline && new Date() > new Date(event.registrationDeadline)) {
      return res.status(400).json({ msg: 'Registration deadline has passed' });
    }

    // Check eligibility
    const participant = await User.findById(req.user.id);
    if (event.eligibility === 'iiit' && participant.participantType !== 'iiit') {
      return res.status(403).json({ msg: 'This event is for IIIT students only' });
    }
    if (event.eligibility === 'non-iiit' && participant.participantType !== 'non-iiit') {
      return res.status(403).json({ msg: 'This event is for non-IIIT participants only' });
    }

    // Check already registered
    const alreadyRegistered = event.registrations.find(
      r => r.participant.toString() === req.user.id && (r.status === 'confirmed' || r.status === 'pending_approval')
    );
    if (alreadyRegistered) {
      const msg = alreadyRegistered.status === 'pending_approval'
        ? 'You already have a pending order for this event'
        : 'Already registered';
      return res.status(400).json({ msg });
    }

    // For normal events
    if (event.eventType === 'normal') {
      // Check registration limit
      const confirmedCount = event.registrations.filter(r => r.status === 'confirmed').length;
      if (event.registrationLimit > 0 && confirmedCount >= event.registrationLimit) {
        return res.status(400).json({ msg: 'Registration limit reached' });
      }

      const ticketId = uuidv4();
      event.registrations.push({
        participant: req.user.id,
        ticketId,
        status: 'confirmed',
        formAnswers: req.body.formAnswers || {},
      });
      await event.save();

      // Generate QR code
      const qrData = JSON.stringify({ ticketId, eventId: event._id, participantId: req.user.id });
      const qrDataUrl = await QRCode.toDataURL(qrData);

      // Send confirmation email with QR as inline attachment
      const emailHtml = buildTicketEmailHtml({
        eventTitle: event.title,
        ticketId,
        eventDate: event.startDate ? new Date(event.startDate).toLocaleDateString() : 'TBA',
        venue: event.venue || 'TBA',
        participantName: `${participant.firstName} ${participant.lastName}`,
        qrDataUrl,
      });
      sendTicketEmail(participant.email, `Registration Confirmed: ${event.title}`, emailHtml, qrDataUrl);

      return res.status(201).json({
        msg: 'Registered successfully',
        ticketId,
        qrDataUrl,
      });
    }

    // For merchandise events — uses payment approval workflow
    if (event.eventType === 'merchandise') {
      const { size, color, variant, quantity, paymentProof } = req.body;
      const qty = quantity || 1;

      // Check stock — block out-of-stock purchases
      if (event.stockQuantity <= 0) {
        return res.status(400).json({ msg: 'This item is out of stock' });
      }
      if (qty > event.stockQuantity) {
        return res.status(400).json({ msg: `Not enough stock. Only ${event.stockQuantity} left.` });
      }

      // Check per-user purchase limit
      const userPurchases = event.registrations
        .filter(r => r.participant.toString() === req.user.id && (r.status === 'confirmed' || r.status === 'pending_approval'))
        .reduce((sum, r) => sum + r.quantity, 0);
      if (event.purchaseLimitPerUser > 0 && userPurchases + qty > event.purchaseLimitPerUser) {
        return res.status(400).json({ msg: `Purchase limit is ${event.purchaseLimitPerUser} per person` });
      }

      if (!paymentProof) {
        return res.status(400).json({ msg: 'Payment proof image is required' });
      }

      const ticketId = uuidv4();
      event.registrations.push({
        participant: req.user.id,
        ticketId,
        status: 'pending_approval',
        size: size || '',
        color: color || '',
        variant: variant || '',
        quantity: qty,
        paymentProof,
      });

      // Do NOT decrement stock yet — only on approval
      await event.save();

      // No QR generated while pending — QR is generated on approval
      return res.status(201).json({
        msg: 'Order placed — pending payment approval by organizer',
        ticketId,
        status: 'pending_approval',
      });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router;
