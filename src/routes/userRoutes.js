const express = require('express');
const multer = require("multer");
const {userRegistration, userLogin, userSessionLogin} = require("../controllers/user/userAuth");
const {verifyJwt} = require("../middleware/jwtAuthMiddleware");
const {
    setReferer, getTransactionHistory, getTopPlayers, getBalances, withdrawFunds, depositFunds, transferFunds,
    updateProfile, uploadProfileImage
} = require("../controllers/user/userActions");
const router = express.Router();
const path = require("path");

const userImagePath = path.join(__dirname, "../../data/user/")

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, userImagePath + req.params.type + "/");
    }, filename: (req, file, cb) => {
        let tempFilename = file.originalname;
        let type = tempFilename.substring(tempFilename.lastIndexOf(".") + 1);
        let filename = req.user.number + "." + type;
        req.body.type = type;
        cb(null, filename);
    },
});

const upload = multer({storage: storage});

router.post("/auth/registration", userRegistration);
router.post("/auth/login", userLogin);
router.post("/auth/sessionLogin", verifyJwt, userSessionLogin);

router.post("/actions/setReferer/:referCode", verifyJwt, setReferer);
router.post("/actions/getTransactionHistory/:query", verifyJwt, getTransactionHistory);
router.post("/actions/getTopPlayers", getTopPlayers);
router.post("/actions/getBalances", verifyJwt, getBalances);
router.post("/actions/withdrawFunds", verifyJwt, withdrawFunds);
router.post("/actions/depositFunds", verifyJwt, depositFunds);
router.post("/actions/transferFunds", verifyJwt, transferFunds);
router.post("/actions/updateProfile/", verifyJwt, updateProfile);
router.post("/actions/uploadProfileImage/:type", verifyJwt, upload.single('image'), uploadProfileImage);
module.exports = router;