const router = require('express').Router();
const Discussion = require('../models/Discussion');
const Event = require('../models/Event');
const { auth } = require('../middleware/auth');

// GET /api/discussions/:eventId — get discussion messages
router.get('/:eventId', auth, async (req, res) => {
  try {
    let disc = await Discussion.findOne({ event: req.params.eventId })
      .populate('messages.user', 'firstName lastName organizerName role')
      .populate('messages.replies.user', 'firstName lastName organizerName role');
    if (!disc) {
      disc = { event: req.params.eventId, messages: [] };
    }
    // Sort: pinned first, then by date desc
    const messages = [...(disc.messages || [])];
    messages.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
    res.json({ messages });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// POST /api/discussions/:eventId — post a message
router.post('/:eventId', auth, async (req, res) => {
  try {
    const { text, isAnnouncement } = req.body;
    if (!text || !text.trim()) return res.status(400).json({ msg: 'Message text is required' });

    // Verify user is registered participant or organizer of this event
    const event = await Event.findById(req.params.eventId);
    if (!event) return res.status(404).json({ msg: 'Event not found' });

    const isOrganizer = event.organizer.toString() === req.user.id;
    const isRegistered = event.registrations.some(
      r => r.participant.toString() === req.user.id && r.status === 'confirmed'
    );
    if (!isOrganizer && !isRegistered) {
      return res.status(403).json({ msg: 'Only registered participants and the organizer can post' });
    }

    let disc = await Discussion.findOne({ event: req.params.eventId });
    if (!disc) {
      disc = new Discussion({ event: req.params.eventId, messages: [] });
    }
    disc.messages.push({
      user: req.user.id,
      text: text.trim(),
      isAnnouncement: isOrganizer ? !!isAnnouncement : false,
    });
    await disc.save();

    // Re-fetch with populated data
    disc = await Discussion.findOne({ event: req.params.eventId })
      .populate('messages.user', 'firstName lastName organizerName role')
      .populate('messages.replies.user', 'firstName lastName organizerName role');

    res.status(201).json({ messages: disc.messages });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// DELETE /api/discussions/:eventId/:messageId — delete message (organizer or own)
router.delete('/:eventId/:messageId', auth, async (req, res) => {
  try {
    const event = await Event.findById(req.params.eventId);
    if (!event) return res.status(404).json({ msg: 'Event not found' });
    const isOrganizer = event.organizer.toString() === req.user.id;

    const disc = await Discussion.findOne({ event: req.params.eventId });
    if (!disc) return res.status(404).json({ msg: 'Discussion not found' });

    const msgIdx = disc.messages.findIndex(m => m._id.toString() === req.params.messageId);
    if (msgIdx === -1) return res.status(404).json({ msg: 'Message not found' });

    // Only organizer or message author can delete
    if (!isOrganizer && disc.messages[msgIdx].user.toString() !== req.user.id) {
      return res.status(403).json({ msg: 'Not authorized' });
    }

    disc.messages.splice(msgIdx, 1);
    await disc.save();
    res.json({ msg: 'Message deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// PUT /api/discussions/:eventId/:messageId/pin — toggle pin (organizer only)
router.put('/:eventId/:messageId/pin', auth, async (req, res) => {
  try {
    const event = await Event.findById(req.params.eventId);
    if (!event) return res.status(404).json({ msg: 'Event not found' });
    if (event.organizer.toString() !== req.user.id) {
      return res.status(403).json({ msg: 'Only the organizer can pin messages' });
    }

    const disc = await Discussion.findOne({ event: req.params.eventId });
    if (!disc) return res.status(404).json({ msg: 'Discussion not found' });

    const message = disc.messages.id(req.params.messageId);
    if (!message) return res.status(404).json({ msg: 'Message not found' });

    message.pinned = !message.pinned;
    await disc.save();
    res.json({ pinned: message.pinned });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// POST /api/discussions/:eventId/:messageId/reply — reply to message
router.post('/:eventId/:messageId/reply', auth, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) return res.status(400).json({ msg: 'Reply text required' });

    const disc = await Discussion.findOne({ event: req.params.eventId });
    if (!disc) return res.status(404).json({ msg: 'Discussion not found' });

    const message = disc.messages.id(req.params.messageId);
    if (!message) return res.status(404).json({ msg: 'Message not found' });

    message.replies.push({ user: req.user.id, text: text.trim() });
    await disc.save();

    const updated = await Discussion.findOne({ event: req.params.eventId })
      .populate('messages.user', 'firstName lastName organizerName role')
      .populate('messages.replies.user', 'firstName lastName organizerName role');

    res.status(201).json({ messages: updated.messages });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// PUT /api/discussions/:eventId/:messageId/react — react to message
router.put('/:eventId/:messageId/react', auth, async (req, res) => {
  try {
    const { emoji } = req.body;
    if (!emoji) return res.status(400).json({ msg: 'Emoji required' });

    const disc = await Discussion.findOne({ event: req.params.eventId });
    if (!disc) return res.status(404).json({ msg: 'Discussion not found' });

    const message = disc.messages.id(req.params.messageId);
    if (!message) return res.status(404).json({ msg: 'Message not found' });

    // Toggle reaction
    const users = message.reactions.get(emoji) || [];
    const idx = users.indexOf(req.user.id);
    if (idx === -1) {
      users.push(req.user.id);
    } else {
      users.splice(idx, 1);
    }
    message.reactions.set(emoji, users);
    await disc.save();

    res.json({ reactions: Object.fromEntries(message.reactions) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router;
