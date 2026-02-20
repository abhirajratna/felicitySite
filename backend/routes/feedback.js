const router = require('express').Router();
const Feedback = require('../models/Feedback');
const Event = require('../models/Event');
const { auth, authorize } = require('../middleware/auth');

// POST /api/feedback/:eventId — submit anonymous feedback
router.post('/:eventId', auth, authorize('participant'), async (req, res) => {
  try {
    const { rating, comment } = req.body;
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ msg: 'Rating must be between 1 and 5' });
    }

    const event = await Event.findById(req.params.eventId);
    if (!event) return res.status(404).json({ msg: 'Event not found' });

    // Check participant was registered
    const wasRegistered = event.registrations.some(
      r => r.participant.toString() === req.user.id && r.status === 'confirmed'
    );
    if (!wasRegistered) {
      return res.status(403).json({ msg: 'Only registered participants can give feedback' });
    }

    // Upsert feedback (one per participant per event)
    const existing = await Feedback.findOne({ event: req.params.eventId, participant: req.user.id });
    if (existing) {
      existing.rating = rating;
      existing.comment = comment || '';
      await existing.save();
      return res.json({ msg: 'Feedback updated' });
    }

    await Feedback.create({
      event: req.params.eventId,
      participant: req.user.id,
      rating,
      comment: comment || '',
    });
    res.status(201).json({ msg: 'Feedback submitted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// GET /api/feedback/:eventId — get feedback for event (anonymous: no participant names)
router.get('/:eventId', auth, async (req, res) => {
  try {
    const feedbacks = await Feedback.find({ event: req.params.eventId })
      .select('rating comment createdAt -_id')
      .sort({ createdAt: -1 });

    const totalRatings = feedbacks.length;
    const avgRating = totalRatings > 0
      ? (feedbacks.reduce((sum, f) => sum + f.rating, 0) / totalRatings).toFixed(1)
      : 0;
    const distribution = [0, 0, 0, 0, 0];
    feedbacks.forEach(f => { distribution[f.rating - 1]++; });

    res.json({ feedbacks, totalRatings, avgRating: Number(avgRating), distribution });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router;
