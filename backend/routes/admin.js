const router = require('express').Router();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const User = require('../models/User');
const { auth, authorize } = require('../middleware/auth');

// All admin routes require admin role
router.use(auth, authorize('admin'));

// POST /api/admin/create-organizer — auto-generates email & password if not provided
router.post('/create-organizer', async (req, res) => {
  try {
    const { organizerName, email, password, category, description, contactEmail } = req.body;
    if (!organizerName) {
      return res.status(400).json({ msg: 'Organizer name is required' });
    }

    // Auto-generate email/password if not given
    const slug = organizerName.toLowerCase().replace(/[^a-z0-9]/g, '');
    const genEmail = email || `${slug}@clubs.iiit.ac.in`;
    const genPassword = password || crypto.randomBytes(6).toString('hex');

    const existing = await User.findOne({ email: genEmail.toLowerCase() });
    if (existing) return res.status(400).json({ msg: 'Email already in use' });

    const hashed = await bcrypt.hash(genPassword, 10);
    const user = await User.create({
      organizerName,
      email: genEmail.toLowerCase(),
      password: hashed,
      role: 'organizer',
      category: category || '',
      description: description || '',
      contactEmail: contactEmail || genEmail.toLowerCase(),
      isIIIT: true,
      onboardingDone: true,
    });
    res.status(201).json({
      msg: 'Organizer created',
      user: { id: user._id, organizerName: user.organizerName, email: user.email, category: user.category },
      credentials: { email: genEmail.toLowerCase(), password: genPassword },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// DELETE /api/admin/remove-organizer/:id — permanently delete
router.delete('/remove-organizer/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user || user.role !== 'organizer') return res.status(404).json({ msg: 'Organizer not found' });
    await User.findByIdAndDelete(req.params.id);
    res.json({ msg: 'Organizer removed' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// PUT /api/admin/disable-organizer/:id — toggle disable/enable
router.put('/disable-organizer/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user || user.role !== 'organizer') return res.status(404).json({ msg: 'Organizer not found' });
    user.isDisabled = !user.isDisabled;
    await user.save();
    res.json({ msg: user.isDisabled ? 'Organizer disabled' : 'Organizer enabled', isDisabled: user.isDisabled });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// GET /api/admin/organizers
router.get('/organizers', async (req, res) => {
  try {
    const organizers = await User.find({ role: 'organizer' }).select('-password');
    res.json({ organizers });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// PUT /api/admin/reset-password/:id  — admin resets organizer password (auto-generated)
router.put('/reset-password/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user || user.role !== 'organizer') return res.status(404).json({ msg: 'Organizer not found' });

    const newPassword = crypto.randomBytes(8).toString('hex');
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({
      msg: 'Password reset successful',
      credentials: { email: user.email, password: newPassword },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// GET /api/admin/participants
router.get('/participants', async (req, res) => {
  try {
    const participants = await User.find({ role: 'participant' }).select('-password');
    res.json({ participants });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// ─── PASSWORD RESET REQUEST WORKFLOW ───────────────────────────────

const PasswordResetRequest = require('../models/PasswordResetRequest');

// GET /api/admin/password-reset-requests — list all password reset requests
router.get('/password-reset-requests', async (req, res) => {
  try {
    const requests = await PasswordResetRequest.find()
      .populate('organizer', 'organizerName email')
      .sort({ createdAt: -1 });
    res.json({ requests });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// PUT /api/admin/password-reset-requests/:id/approve — approve and auto-generate password
router.put('/password-reset-requests/:id/approve', async (req, res) => {
  try {
    const resetReq = await PasswordResetRequest.findById(req.params.id).populate('organizer', 'organizerName email');
    if (!resetReq) return res.status(404).json({ msg: 'Request not found' });
    if (resetReq.status !== 'pending') return res.status(400).json({ msg: 'Request already processed' });

    const generatedPassword = crypto.randomBytes(6).toString('hex');
    const hashed = await bcrypt.hash(generatedPassword, 10);
    await User.findByIdAndUpdate(resetReq.organizer._id, { password: hashed });

    resetReq.status = 'approved';
    resetReq.adminComment = req.body.comment || '';
    resetReq.generatedPassword = generatedPassword;
    await resetReq.save();

    res.json({
      msg: 'Password reset approved',
      credentials: { email: resetReq.organizer.email, password: generatedPassword },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// PUT /api/admin/password-reset-requests/:id/reject — reject request
router.put('/password-reset-requests/:id/reject', async (req, res) => {
  try {
    const resetReq = await PasswordResetRequest.findById(req.params.id);
    if (!resetReq) return res.status(404).json({ msg: 'Request not found' });
    if (resetReq.status !== 'pending') return res.status(400).json({ msg: 'Request already processed' });

    resetReq.status = 'rejected';
    resetReq.adminComment = req.body.comment || '';
    await resetReq.save();

    res.json({ msg: 'Password reset request rejected' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router;
