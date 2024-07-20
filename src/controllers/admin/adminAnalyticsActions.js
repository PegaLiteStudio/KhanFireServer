const {PrimaryUserModel} = require("../../models/userModels");
const {respondSuccessWithData} = require("../../managers/responseManager");
const {AllMatchesHistoryModel} = require("../../models/contestModel");
const getAnalytics = async (req, res) => {
    let totalUsers = await PrimaryUserModel.find().count();
    let activeUsers = Object.keys(connectedUsers).length;
    let totalGamingBalance = await PrimaryUserModel.aggregate([
        {
            $group: {
                _id: null,
                totalGBalance: {$sum: "$gBalance"},
                totalWBalance: {$sum: "$wBalance"}
            }
        }
    ]);

    let referJoins = await PrimaryUserModel.find({referer: {$exists: true}}).count();
    let matchesPlayed = await AllMatchesHistoryModel.find().count();
    const totalGBalance = totalGamingBalance[0] ? totalGamingBalance[0].totalGBalance : 0;
    const totalWBalance = totalGamingBalance[0] ? totalGamingBalance[0].totalWBalance : 0;

    respondSuccessWithData(res, {totalUsers, activeUsers, totalGBalance, totalWBalance, referJoins, matchesPlayed})
}
module.exports = {
    getAnalytics
}