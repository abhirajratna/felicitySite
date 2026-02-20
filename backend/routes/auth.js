const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Helper: check IIIT email
function isIIITEmail(email) {
  return email.endsWith('@iiit.ac.in') || email.endsWith('@students.iiit.ac.in') || email.endsWith('@research.iiit.ac.in');
}

// POST /api/auth/register  — participant only
router.post('/register', async (req, res) => {
  try {
    const { firstName, lastName, email, password, collegeName, contactNumber } = req.body;
    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ msg: 'Please fill all required fields' });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(400).json({ msg: 'User already exists' });

    const isIIIT = isIIITEmail(email.toLowerCase());

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({
      firstName,
      lastName,
      email: email.toLowerCase(),
      password: hashed,
      role: 'participant',
      participantType: isIIIT ? 'iiit' : 'non-iiit',
      isIIIT,
      collegeName: collegeName || '',
      contactNumber: contactNumber || '',
      onboardingDone: false,
    });

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        name: user.name,
        email: user.email,
        role: user.role,
        participantType: user.participantType,
        isIIIT: user.isIIIT,
        collegeName: user.collegeName,
        contactNumber: user.contactNumber,
        onboardingDone: user.onboardingDone,
        interests: user.interests,
        followedClubs: user.followedClubs,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ msg: 'Please fill all fields' });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(400).json({ msg: 'Invalid credentials' });

    // Check if account is disabled
    if (user.isDisabled) return res.status(403).json({ msg: 'Account has been disabled. Contact admin.' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ msg: 'Invalid credentials' });

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.json({
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        name: user.name,
        email: user.email,
        role: user.role,
        participantType: user.participantType,
        isIIIT: user.isIIIT,
        collegeName: user.collegeName,
        contactNumber: user.contactNumber,
        onboardingDone: user.onboardingDone,
        interests: user.interests,
        followedClubs: user.followedClubs,
        organizerName: user.organizerName,
        category: user.category,
        description: user.description,
        contactEmail: user.contactEmail,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// GET /api/auth/me  — get current user from token
const { auth: authMiddleware } = require('../middleware/auth');
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password').populate('followedClubs', 'organizerName category email');
    if (!user) return res.status(404).json({ msg: 'User not found' });
    res.json({ user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router;
