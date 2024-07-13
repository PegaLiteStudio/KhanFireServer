const express = require('express');
const {superAdminLogin} = require("../controllers/super-admin/superAdminAuth");
const {addAdmin, getAdmins, getAdminDetails, editAdmin} = require("../controllers/super-admin/superAdminActions");
const {verifySuperAdmin} = require("../middleware/jwtAuthMiddleware");
const router = express.Router();

router.post("/auth/login", superAdminLogin);
router.post("/actions/addAdmin/:key", verifySuperAdmin, addAdmin);
router.post("/actions/getAdmins/:key", verifySuperAdmin, getAdmins);
router.post("/actions/getAdminDetails/:key/:number", verifySuperAdmin, getAdminDetails);
router.post("/actions/editAdmin/:key/:number", verifySuperAdmin, editAdmin);


module.exports = router;