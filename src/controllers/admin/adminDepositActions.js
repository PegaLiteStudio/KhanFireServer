const {respondSuccessWithData, respondFailed, respondSuccess} = require("../../managers/responseManager");
const {DepositRequestModel} = require("../../models/financeModels");
const {UserTransactionModel, PrimaryUserModel} = require("../../models/userModels");
const {insertTransaction} = require("../../managers/transactionManager");
const {sendNotification} = require("../../managers/notificationManager");
const {AdminModel} = require("../../models/adminModels");
const getAllDepositRequests = async (req, res) => {
    let skip = req.params.skip;
    if (!skip) {
        skip = 0;
    }
    let depositRequests = await DepositRequestModel.find().skip(skip).limit(30);
    let allDepositRequests = [];
    for (let i = 0; i < depositRequests.length; i++) {
        let request = depositRequests[i];
        allDepositRequests.push({
            number: request.number,
            amount: request.amount,
            txnID: request.txnID,
            date: request.date,
            method: request.method,
            address: request.address
        });
    }
    respondSuccessWithData(res, allDepositRequests);
}
const searchDepositRequest = async (req, res) => {
    let {query, skip} = req.body;
    if (!skip) {
        skip = 0;
    }
    if (!query) {
        query = "";
    }
    let allDepositRequests = await DepositRequestModel.find({
        $or: [{
            txnID: {$regex: query, $options: 'i'}
        }, {number: {$regex: query}}, {method: {$regex: query, $options: 'i'}}]
    }).skip(skip).limit(30);
    let depositRequests = [];
    for (let i = 0; i < allDepositRequests.length; i++) {
        let request = allDepositRequests[i];
        depositRequests.push({
            number: request.number,
            amount: request.amount,
            txnID: request.txnID,
            date: request.date,
            method: request.method,
            address: request.address
        });
    }

    respondSuccessWithData(res, depositRequests);
}

const getDepositRequestDetails = async (req, res) => {
    let {txnID} = req.params;

    if (!txnID) {
        return respondFailed(res, "000");
    }
    let request = await DepositRequestModel.findOne({txnID});
    if (!request) {
        return respondFailed(res, "702");
    }
    respondSuccessWithData(res, request)
}


const confirmDepositRequest = async (req, res) => {
    let {txnID} = req.params;
    if (!txnID) {
        return respondFailed(res, "000");
    }
    let request = await DepositRequestModel.findOne({txnID});
    if (!request) {
        return respondSuccess(res);
    }


    let number = request.number;
    let amount = request.amount;

    let adminBalance = req.user.balance;
    if (adminBalance < amount) {
        return respondFailed(res, "700");
    }


    await AdminModel.updateOne({number: req.user.number}, {$inc: {balance: -amount}});
    let finalAmount = adminBalance - amount;
    io.to(connectedUsers["admin-" + req.user.number]).emit("update", {balance: finalAmount});

    let user = await PrimaryUserModel.findOne({number});

    await PrimaryUserModel.updateOne({number}, {$inc: {gBalance: +amount}});

    let finalBalance = user.gBalance + amount;
    io.to(connectedUsers[number]).emit("balance-update", "g", finalBalance);

    await UserTransactionModel.deleteOne({txnID});
    await DepositRequestModel.deleteOne({txnID});

    await insertTransaction(number, "+" + amount, "w", "deposit", "s", request.method + ":" + request.address, txnID);
    sendNotification(number, "Deposit Completed!!!", `Your deposit request for ৳${amount} has been completed and credited in your game balance.`);
    respondSuccess(res);
}


const rejectDepositRequests = async (req, res) => {
    let {txnID, reason} = req.body;
    if (!txnID || !reason) {
        return respondFailed(res, "000");
    }

    let request = await DepositRequestModel.findOne({txnID});
    if (!request) {
        return respondSuccess(res);
    }

    await DepositRequestModel.deleteOne({txnID});
    await UserTransactionModel.updateOne({txnID}, {$set: {status: "r"}});
    sendNotification(request.number, "Deposit Rejected!!!", `Your deposit request for ৳${request.amount} has been rejected. Reason:${reason}`);
    respondSuccess(res);
}

module.exports = {
    getAllDepositRequests, searchDepositRequest, getDepositRequestDetails, confirmDepositRequest, rejectDepositRequests
}