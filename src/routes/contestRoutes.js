const express = require('express');
const {getMatches, joinMatch, exitMatch} = require("../controllers/contest/matchController");
const {verifyJwt} = require("../middleware/jwtAuthMiddleware");
const router = express.Router();

router.post("/matches/getMatches/:gameID",verifyJwt, getMatches)
router.post("/matches/joinMatch/:matchID", verifyJwt, joinMatch)
router.post("/matches/exitMatch/:roomID", verifyJwt, exitMatch)

module.exports = router;