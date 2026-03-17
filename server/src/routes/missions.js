const router = require('express').Router();
const { getMissions, completeMission, updateProgress } = require('../controllers/missionController');
const { protect } = require('../middleware/auth');

router.get('/',         protect, getMissions);
router.post('/complete',protect, completeMission);
router.patch('/progress',protect, updateProgress);

module.exports = router;