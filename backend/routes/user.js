const router = require('express').Router();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const { sendTicketEmail } = require('../utils/email');

// PUT /api/user/preferences
router.put('/preferences', auth, async (req, res) => {
  try {
    const { interests, followedClubs } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ msg: 'User not found' });
    if (user.role !== 'participant') return res.status(403).json({ msg: 'Only participants can set preferences' });

    if (interests !== undefined) user.interests = interests;
    if (followedClubs !== undefined) user.followedClubs = followedClubs;
    user.onboardingDone = true;
    await user.save();

    res.json({
      msg: 'Preferences updated',
      user: {
        id: user._id,
        interests: user.interests,
        followedClubs: user.followedClubs,
        onboardingDone: user.onboardingDone,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// PUT /api/user/skip-onboarding
router.put('/skip-onboarding', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ msg: 'User not found' });
    user.onboardingDone = true;
    await user.save();
    res.json({ msg: 'Onboarding skipped' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// GET /api/user/organizers-list
router.get('/organizers-list', auth, async (req, res) => {
  try {
    const organizers = await User.find({ role: 'organizer' }).select('organizerName category description contactEmail _id');
    res.json({ organizers });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// GET /api/user/profile
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password').populate('followedClubs', 'organizerName category');
    if (!user) return res.status(404).json({ msg: 'User not found' });
    res.json({ user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// PUT /api/user/profile
router.put('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ msg: 'User not found' });

    if (user.role === 'participant') {
      const { firstName, lastName, contactNumber, collegeName } = req.body;
      if (firstName !== undefined) user.firstName = firstName;
      if (lastName !== undefined) user.lastName = lastName;
      if (contactNumber !== undefined) user.contactNumber = contactNumber;
      if (collegeName !== undefined) user.collegeName = collegeName;
    } else if (user.role === 'organizer') {
      const { organizerName, category, description, contactEmail, contactNumber, discordWebhook } = req.body;
      if (organizerName !== undefined) user.organizerName = organizerName;
      if (category !== undefined) user.category = category;
      if (description !== undefined) user.description = description;
      if (contactEmail !== undefined) user.contactEmail = contactEmail;
      if (contactNumber !== undefined) user.contactNumber = contactNumber;
      if (discordWebhook !== undefined) user.discordWebhook = discordWebhook;
    }
    await user.save();

    const updated = await User.findById(user._id).select('-password').populate('followedClubs', 'organizerName category');
    res.json({ msg: 'Profile updated', user: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// PUT /api/user/change-password
router.put('/change-password', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ msg: 'User not found' });

    if (user.role !== 'participant') {
      return res.status(403).json({ msg: 'Organizers must request a password reset through admin' });
    }

    const { currentPassword } = req.body;
    if (!currentPassword) return res.status(400).json({ msg: 'Current password is required' });

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) return res.status(400).json({ msg: 'Current password is incorrect' });

    // Auto-generate a random password
    const newPassword = crypto.randomBytes(8).toString('hex');
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    // Send the new password via email
    const emailHtml = `
      <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;border:2px solid #333;border-radius:12px;overflow:hidden;">
        <div style="background:#333;color:#fff;padding:16px 20px;text-align:center;">
          <h2 style="margin:0;">Password Reset</h2>
        </div>
        <div style="padding:20px;">
          <p>Hi ${user.firstName},</p>
          <p>Your password has been reset successfully. Here is your new password:</p>
          <div style="padding:12px;background:#f5f5f5;border-radius:6px;text-align:center;margin:16px 0;">
            <code style="font-size:18px;font-weight:bold;letter-spacing:2px;">${newPassword}</code>
          </div>
          <p style="font-size:13px;color:#888;">Please log in with this password. You can reset it again anytime from your profile.</p>
        </div>
      </div>
    `;
    sendTicketEmail(user.email, 'Your New Password — Club Council', emailHtml);

    res.json({ msg: 'Password reset successfully. New password has been sent to your email.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// PUT /api/user/follow/:organizerId
router.put('/follow/:organizerId', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'participant') return res.status(403).json({ msg: 'Only participants can follow' });
    const orgId = req.params.organizerId;
    const idx = user.followedClubs.indexOf(orgId);
    if (idx === -1) {
      user.followedClubs.push(orgId);
    } else {
      user.followedClubs.splice(idx, 1);
    }
    await user.save();
    res.json({ followedClubs: user.followedClubs });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

const PasswordResetRequest = require('../models/PasswordResetRequest');

// POST /api/user/password-reset-request
router.post('/password-reset-request', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'organizer') return res.status(403).json({ msg: 'Only organizers can request password resets' });

    const existing = await PasswordResetRequest.findOne({ organizer: req.user.id, status: 'pending' });
    if (existing) return res.status(400).json({ msg: 'You already have a pending request' });

    const resetReq = await PasswordResetRequest.create({
      organizer: req.user.id,
      reason: req.body.reason || '',
    });
    res.status(201).json({ msg: 'Password reset request submitted', request: resetReq });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// GET /api/user/password-reset-requests
router.get('/password-reset-requests', auth, async (req, res) => {
  try {
    const requests = await PasswordResetRequest.find({ organizer: req.user.id }).sort({ createdAt: -1 });
    res.json({ requests });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router;
