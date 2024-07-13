const jwt = require('jsonwebtoken');
const {
    respondDeclared,
    MISSING_PARAMETERS_MSG,
    throwError,
    respondFailed
} = require("../managers/responseManager");
const {mainLogin} = require("../controllers/user/userAuth");
const {SuperAdminModel} = require("../models/superAdminModels");
const {adminLoginMain} = require("../controllers/admin/adminAuth");

const verifyJwt = async (req, res, next) => {
    let token = req.headers.authorization;

    if (!token) {
        return respondDeclared(res, MISSING_PARAMETERS_MSG);
    }

    token = req.headers.authorization.replace("Bearer ", "");

    let jwtSecretKey = process.env.JWT_SECRET_KEY;

    try {
        const verified = jwt.verify(token, jwtSecretKey);
        if (!verified) {
            return respondFailed(res, "302")
        }

        await mainLogin(verified.number, verified.pass, verified.deviceID, res, (user) => {
            if (!user) {
                return;
            }
            req.user = user;
            next();
        });

    } catch (e) {
        if (e.message === "jwt expired") {
            return respondFailed(res, "302");
        }
        throwError(res, e);
    }
}

const verifyAdminJWT = async (req, res, next) => {
    let token = req.headers.authorization;

    if (!token) {
        return respondDeclared(res, MISSING_PARAMETERS_MSG);
    }

    token = req.headers.authorization.replace("Bearer ", "");

    let jwtSecretKey = process.env.JWT_SECRET_KEY;

    try {
        const verified = jwt.verify(token, jwtSecretKey);
        if (!verified) {
            return respondFailed(res, "302")
        }

        await adminLoginMain(res, verified.number, verified.pass, verified.deviceID, (user) => {
            if (!user) {
                return;
            }
            req.user = user;
            next();
        });

    } catch (e) {
        if (e.message === "jwt expired") {
            return respondFailed(res, "302");
        }
        throwError(res, e);
    }
}

const verifySuperAdmin = async (req, res, next) => {
    let {key} = req.params;
    if (!key) {
        return respondFailed(res, "000");
    }
    let superAdmin = await SuperAdminModel.findOne();
    superAdmin = superAdmin.toObject();

    if (superAdmin.key !== key) {
        return respondFailed(res, "004")
    }

    next();
}

module.exports = {
    verifyJwt, verifySuperAdmin, verifyAdminJWT
}