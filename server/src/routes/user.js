const router = require('express').Router();
const { getProfile, getPublicProfile, syncProgress, saveBattleResult } = require('../controllers/userController');
const { protect } = require('../middleware/auth');

router.get  ('/',               protect, getProfile);
router.patch('/progress',       protect, syncProgress);
router.post ('/battle-result',  protect, saveBattleResult);
router.get  ('/:username',               getPublicProfile);

module.exports = router;