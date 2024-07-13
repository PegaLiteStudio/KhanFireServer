const {respondFailed, respondSuccess} = require("../../managers/responseManager");
const {SuperAdminModel} = require("../../models/superAdminModels");
const superAdminLogin = async (req, res) => {
    let {key, deviceID} = req.body;
    if (!key || !deviceID) {
        return respondFailed(res, "000");
    }

    let superAdmin = await SuperAdminModel.findOne();

    superAdmin = superAdmin.toObject();

    if (superAdmin.invalidAttempts === superAdmin.maxInvalidAttempts) {
        return respondFailed(res, "204");
    }

    if (superAdmin.key !== key) {
        await SuperAdminModel.updateOne({id: "super-admin"}, {$inc: {invalidAttempts: 1}})
        return respondFailed(res, "004")
    }

    if (superAdmin.isActive !== true) {
        return respondFailed(res, "201");
    }

    if (superAdmin.hasOwnProperty("deviceID")) {
        if (superAdmin.deviceID !== deviceID) {
            return respondFailed(res, "203");
        }
    } else {
        await SuperAdminModel.updateOne({id: "super-admin"}, {$set: {deviceID}})
    }

    if (superAdmin.invalidAttempts !== 0) {
        await SuperAdminModel.updateOne({id: "super-admin"}, {$set: {invalidAttempts: 0}})
    }

    respondSuccess(res);
}

module.exports = {
    superAdminLogin
}