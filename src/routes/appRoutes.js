const express = require('express');
const {appInit, updateApp, getImage} = require("../controllers/app/appService");
const router = express.Router();

router.post("/appInit", appInit)
router.post("/updateApp", updateApp)
router.get("/getImage/:parent/:type/:id", getImage)

module.exports = router;