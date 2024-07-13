const {respondSuccessWithData, respondFailed, respondSuccess} = require("../../managers/responseManager");
const {WithdrawRequestModel} = require("../../models/financeModels");
const {PrimaryUserModel, UserTransactionModel} = require("../../models/userModels");
const {insertTransaction} = require("../../managers/transactionManager");
const {sendNotification} = require("../../managers/notificationManager");
const getAllWithdrawRequests = async (req, res) => {
    let skip = req.params.skip;
    if (!skip) {
        skip = 0;
    }
    let withdrawRequests = await WithdrawRequestModel.find().skip(skip).limit(30);
    let allWithdrawRequests = [];
    for (let i = 0; i < withdrawRequests.length; i++) {
        let request = withdrawRequests[i];
        allWithdrawRequests.push({
            number: request.number,
            amount: request.amount,
            txnID: request.txnID,
            date: request.date,
            method: request.method,
            address: request.address
        });
    }
    respondSuccessWithData(res, allWithdrawRequests);
}
const searchWithdrawRequest = async (req, res) => {
    let {query, skip} = req.body;
    if (!skip) {
        skip = 0;
    }
    if (!query) {
        query = "";
    }
    let allWithdrawRequests = await WithdrawRequestModel.find({
        $or: [{
            txnID: {$regex: query, $options: 'i'}
        }, {number: {$regex: query}}, {method: {$regex: query, $options: 'i'}}]
    }).skip(skip).limit(30);
    let withdrawRequests = [];
    for (let i = 0; i < allWithdrawRequests.length; i++) {
        let request = allWithdrawRequests[i];
        withdrawRequests.push({
            number: request.number,
            amount: request.amount,
            txnID: request.txnID,
            date: request.date,
            method: request.method,
            address: request.address
        });
    }

    respondSuccessWithData(res, withdrawRequests);
}


const getWithdrawRequestDetails = async (req, res) => {
    let {txnID} = req.params;

    if (!txnID) {
        return respondFailed(res, "000");
    }
    let request = await WithdrawRequestModel.findOne({txnID});
    if (!request) {
        return respondFailed(res, "702");
    }
    respondSuccessWithData(res, request)

}

const confirmWithdrawRequests = async (req, res) => {
    let {txnID} = req.params;
    if (!txnID) {
        return respondFailed(res, "000");
    }
    let request = await WithdrawRequestModel.findOne({txnID});
    if (!request) {
        return respondSuccess(res);
    }
    //TODO put in one list
    await WithdrawRequestModel.deleteOne({txnID});
    await UserTransactionModel.updateOne({txnID}, {$set: {status: "s"}})
    sendNotification(request.number, "Withdraw Completed!!!", `Your withdraw request for ৳${request.amount} has been completed.`);
    respondSuccess(res);
}

const rejectWithdrawRequests = async (req, res) => {
    let {txnID, reason} = req.body;
    if (!txnID || !reason) {
        return respondFailed(res, "000");
    }

    let request = await WithdrawRequestModel.findOne({txnID});
    if (!request) {
        return respondSuccess(res);
    }
    let number = request.number;
    let amount = request.amount;

    let user = await PrimaryUserModel.findOne({number});

    await PrimaryUserModel.updateOne({number}, {$inc: {wBalance: +amount}});

    let finalBalance = user.wBalance + amount;
    io.to(connectedUsers[number]).emit("balance-update", "w", finalBalance);

    await insertTransaction(number, "+" + amount, "w", "withdraw-refund", "s", request.method + ":" + txnID + ":" + reason);

    await WithdrawRequestModel.deleteOne({txnID});
    await UserTransactionModel.updateOne({txnID}, {$set: {status: "r"}});

    sendNotification(number, "Withdraw Rejected!!!", `Your withdraw request for ৳${amount} has been rejected. Reason: ${reason}`);

    respondSuccess(res);
}


module.exports = {
    getAllWithdrawRequests,
    searchWithdrawRequest,
    getWithdrawRequestDetails,
    confirmWithdrawRequests,
    rejectWithdrawRequests
}