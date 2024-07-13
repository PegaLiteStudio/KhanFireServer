const {respondFailed, respondSuccessWithData} = require("../../managers/responseManager");
const {getJWT} = require("../../helpers/authHelper");
const {AdminModel} = require("../../models/adminModels");
const adminLoginMain = async (res, number, pass, deviceID, callback) => {
    if (!number || !pass || !deviceID) {
        return respondFailed(res, "000");
    }

    let admin = await AdminModel.findOne({number});

    if (!admin) {
        callback(null);
        return respondFailed(res, "102");
    }

    admin = admin.toObject();

    if (admin.pass !== pass) {
        callback(null);
        return respondFailed(res, "004");
    }

    if (admin.status !== true) {
        callback(null);
        return respondFailed(res, "201");
    }

    if (admin.hasOwnProperty("deviceID")) {
        if (admin.deviceID !== deviceID) {
            return respondFailed(res, "203");
        }
    } else {
        await AdminModel.updateOne({number}, {$set: {deviceID}});
    }

    callback(admin);

}

const adminLogin = async (req, res) => {
    let {number, pass, deviceID} = req.body;
    await adminLoginMain(res, number, pass, deviceID, (user) => {
        if (user) {
            respondSuccessWithData(res, {token: getJWT(number, pass, deviceID)});
        }
    });
}

const adminSessionLogin = (req, res) => {
    req.user.permissionJSON = JSON.stringify(req.user.permissions);
    respondSuccessWithData(res, req.user);
}

module.exports = {
    adminLogin, adminLoginMain, adminSessionLogin
}