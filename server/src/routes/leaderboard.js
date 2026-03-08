const router = require('express').Router();
const { getXPLeaderboard, getTowerLeaderboard, getWinsLeaderboard } = require('../controllers/leaderboardController');

router.get('/xp',    getXPLeaderboard);
router.get('/tower', getTowerLeaderboard);
router.get('/wins',  getWinsLeaderboard);

module.exports = router;
