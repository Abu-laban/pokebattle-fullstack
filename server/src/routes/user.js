// ── user.js ───────────────────────────────────────────────────────────────
const router = require('express').Router();
const { getProfile, getPublicProfile, syncProgress } = require('../controllers/userController');
const { protect } = require('../middleware/auth');

router.get ('/',           protect, getProfile);
router.patch('/progress',  protect, syncProgress);
router.get ('/:username',           getPublicProfile);

module.exports = router;
