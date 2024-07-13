const {PrimaryUserModel} = require("../../models/userModels");
const {respondSuccessWithData, respondFailed, respondSuccess} = require("../../managers/responseManager");

const getAllUsers = async (req, res) => {
    let skip = req.params.skip;
    if (!skip) {
        skip = 0;
    }
    let users = await PrimaryUserModel.find().skip(skip).limit(30);
    let allUsers = [];
    for (let i = 0; i < users.length; i++) {
        let user = users[i];
        allUsers.push({
            name: user.name, number: user.number, status: user.status
        });
    }
    respondSuccessWithData(res, allUsers);
}

const searchUser = async (req, res) => {
    let {query, skip} = req.body;
    if (!skip) {
        skip = 0;
    }
    if (!query) {
        query = "";
    }
    let users = await PrimaryUserModel.find({
        $or: [{
            name: {$regex: query, $options: 'i'}
        }, {number: {$regex: query}}]
    }).skip(skip).limit(30);
    let allUsers = [];
    for (let i = 0; i < users.length; i++) {
        let user = users[i];
        allUsers.push({
            name: user.name, number: user.number, status: user.status
        });
    }

    respondSuccessWithData(res, allUsers);
}

const getUserDetails = async (req, res) => {
    let number = req.params.number;

    if (!number) {
        return respondFailed(res, "000");
    }
    let user = await PrimaryUserModel.findOne({number});
    if (!user) {
        return respondFailed(res, "102");
    }
    respondSuccessWithData(res, user)

}

const resetDevice = async (req, res) => {
    let number = req.params.number;
    if (!number) {
        return respondFailed(res, "000");
    }
    await PrimaryUserModel.updateOne({number}, {$unset: {deviceID: ''}});
    respondSuccess(res);
}
const changePassword = async (req, res) => {
    let {number, pass} = req.body;
    if (!number || !pass) {
        return respondFailed(res, "000");
    }
    if (pass.length < 6) {
        return respondFailed(res, "004")
    }
    await PrimaryUserModel.updateOne({number}, {$set: {pass}});
    respondSuccess(res);
}
const banUser = async (req, res) => {
    let number = req.params.number;
    if (!number) {
        return respondFailed(res, "000");
    }
    await PrimaryUserModel.updateOne({number}, {$set: {status: "banned"}});
    respondSuccess(res);
}
const unbanUser = async (req, res) => {
    let number = req.params.number;
    if (!number) {
        return respondFailed(res, "000");
    }
    await PrimaryUserModel.updateOne({number}, {$unset: {status: ''}});
    respondSuccess(res);
}
module.exports = {
    getAllUsers, searchUser, getUserDetails, resetDevice, changePassword, banUser, unbanUser
}