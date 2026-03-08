const router = require('express').Router();
const { saveBattleResult, getBattleHistory } = require('../controllers/battleController');
const { protect } = require('../middleware/auth');

router.post('/result',  protect, saveBattleResult);
router.get ('/history', protect, getBattleHistory);

module.exports = router;
