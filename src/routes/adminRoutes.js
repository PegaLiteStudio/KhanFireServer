const express = require('express');
const {adminLogin, adminSessionLogin} = require("../controllers/admin/adminAuth");
const {verifyAdminJWT} = require("../middleware/jwtAuthMiddleware");
const {
    getAllUsers, searchUser, getUserDetails, resetDevice, changePassword, banUser, unbanUser
} = require("../controllers/admin/adminUserActions");
const {
    getAllWithdrawRequests,
    searchWithdrawRequest,
    getWithdrawRequestDetails,
    confirmWithdrawRequests,
    rejectWithdrawRequests
} = require("../controllers/admin/adminWithdrawActions");
const {
    getAllDepositRequests, searchDepositRequest, getDepositRequestDetails, confirmDepositRequest, rejectDepositRequests
} = require("../controllers/admin/adminDepositActions");
const {
    getAppSettings,
    updateAppSettings,
    getAppVersions,
    addAppVersion,
    getVersionDetails,
    updateAppVersion,
    getSliderImages,
    uploadSliderImage, deleteImageSlider
} = require("../controllers/admin/adminAppActions");
const path = require("path");
const multer = require("multer");
const {generateRandomID} = require("../helpers/appHelper");
const {getGames} = require("../controllers/admin/adminContestActions");
const {getAnalytics} = require("../controllers/admin/adminAnalyticsActions");
const {uploadNotificationImage, getNotificationImages, sendNotificationFromAdmin} = require("../controllers/admin/adminNotificationActions");
const router = express.Router();
const sliderImagePath = path.join(__dirname, "../../data/app/slider/")
const notificationImagePath = path.join(__dirname, "../../data/app/notification/")

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        if (req.params.hasOwnProperty("isNotification")) {
            cb(null, notificationImagePath);
        } else {
            cb(null, sliderImagePath);
        }
    }, filename: (req, file, cb) => {
        let tempFilename = file.originalname;
        let type = tempFilename.substring(tempFilename.lastIndexOf(".") + 1);
        let filename = generateRandomID() + "." + type;
        req.body.type = type;
        req.body.filename = filename;
        cb(null, filename);
    },
});

const upload = multer({storage});

router.post("/auth/login", adminLogin);
router.post("/auth/sessionLogin", verifyAdminJWT, adminSessionLogin);
router.post("/actions/getAllUsers/:skip", verifyAdminJWT, getAllUsers);
router.post("/actions/searchUser", verifyAdminJWT, searchUser);
router.post("/actions/getUserDetails/:number", verifyAdminJWT, getUserDetails);
router.post("/actions/resetDevice/:number", verifyAdminJWT, resetDevice);
router.post("/actions/changePassword", verifyAdminJWT, changePassword);
router.post("/actions/banUser/:number", verifyAdminJWT, banUser);
router.post("/actions/unbanUser/:number", verifyAdminJWT, unbanUser);

router.post("/actions/getAllWithdrawRequests/:skip", verifyAdminJWT, getAllWithdrawRequests);
router.post("/actions/searchWithdrawRequest", verifyAdminJWT, searchWithdrawRequest);
router.post("/actions/getWithdrawRequestDetails/:txnID", verifyAdminJWT, getWithdrawRequestDetails);
router.post("/actions/confirmWithdrawRequests/:txnID", verifyAdminJWT, confirmWithdrawRequests);
router.post("/actions/rejectWithdrawRequests", verifyAdminJWT, rejectWithdrawRequests);

router.post("/actions/getAllDepositRequests/:skip", verifyAdminJWT, getAllDepositRequests);
router.post("/actions/searchDepositRequest", verifyAdminJWT, searchDepositRequest);
router.post("/actions/getDepositRequestDetails/:txnID", verifyAdminJWT, getDepositRequestDetails);
router.post("/actions/confirmDepositRequest/:txnID", verifyAdminJWT, confirmDepositRequest);
router.post("/actions/rejectDepositRequests", verifyAdminJWT, rejectDepositRequests);

router.post("/actions/getAppSettings", verifyAdminJWT, getAppSettings);
router.post("/actions/updateAppSettings", verifyAdminJWT, updateAppSettings);

router.post("/actions/getAppVersions", verifyAdminJWT, getAppVersions);
router.post("/actions/addAppVersion", verifyAdminJWT, addAppVersion);
router.post("/actions/getVersionDetails/:versionName", verifyAdminJWT, getVersionDetails);
router.post("/actions/updateAppVersion/:versionName", verifyAdminJWT, updateAppVersion);
router.post("/actions/getSliderImages", verifyAdminJWT, getSliderImages);
router.post("/actions/uploadSliderImage", verifyAdminJWT, upload.single('image'), uploadSliderImage);
router.post("/actions/deleteSliderImages/:img", verifyAdminJWT, deleteImageSlider);

router.post("/actions/getGames", verifyAdminJWT, getGames);

router.post("/actions/getAnalytics", verifyAdminJWT, getAnalytics);

router.post("/actions/getNotificationImages", verifyAdminJWT, getNotificationImages);
router.post("/actions/uploadNotificationImage/:isNotification", verifyAdminJWT, upload.single('image'), uploadNotificationImage);
router.post("/actions/sendNotificationFromAdmin", verifyAdminJWT, sendNotificationFromAdmin);

module.exports = router;
