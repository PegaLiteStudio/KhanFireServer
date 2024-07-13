const {respondFailed, throwError, respondSuccess, respondSuccessWithData} = require("../../managers/responseManager");
const {PrimaryUserModel, UserTransactionModel} = require("../../models/userModels");
const {getRefererBonus, getReferBonus} = require("../app/appService");
const {insertTransaction} = require("../../managers/transactionManager");
const {DepositRequestModel, WithdrawRequestModel} = require("../../models/financeModels");
const {generateRandomID} = require("../../helpers/appHelper");
const {getIndianTime} = require("../../managers/timeManager");
const {getJWT} = require("../../helpers/authHelper");
const {sendNotification} = require("../../managers/notificationManager");

const setReferer = async (req, res) => {
    let user = req.user;

    let {referCode} = req.params;
    let {number} = user;

    if (user.referer) {
        return respondFailed(res, "103");
    }
    if (!referCode) {
        return respondFailed(res, "000");
    }
    if (referCode.length !== 8) {
        return respondFailed(res, "006");
    }

    try {
        let referer = await PrimaryUserModel.findOne({referCode});

        /*Check if Refer Code is Valid or Not*/
        if (!referer) {
            return respondFailed(res, "006");
        }

        /*Set the Referer to the User*/
        await PrimaryUserModel.updateOne({number}, {$set: {referer: referCode}});

        let refererBonus = getRefererBonus();
        let referBonus = getReferBonus();

        if (refererBonus !== 0) {

            /*Add the refer bonus to the referrer's game balance*/
            await PrimaryUserModel.updateOne({referCode}, {
                $inc: {
                    gBalance: refererBonus, totalReferEarnings: refererBonus, totalReferRegistration: 1
                }
            });

            let finalBalance = referer.gBalance + refererBonus;
            io.to(connectedUsers[referer.number]).emit("balance-update", "g", finalBalance);

            await insertTransaction(referer.number, refererBonus, "g", "refer-bonus", "c", number);
            sendNotification(referer.number, "Refer Bonus!!!", `Congratulations! You've earned ৳${refererBonus} for a successful referral using your Refer code.`)
        }

        if (referBonus !== 0) {

            /*Add the refer bonus to user's game balance*/
            await PrimaryUserModel.updateOne({number}, {$inc: {gBalance: referBonus}});

            let finalBalance = req.user.gBalance + referBonus;
            io.to(connectedUsers[number]).emit("balance-update", "g", finalBalance);

            await insertTransaction(number, referBonus, "g", "refer-join-bonus", "c")

        }

        respondSuccess(res)

    } catch (err) {
        throwError(res, err)
    }
}

const updateProfile = async (req, res) => {
    let {name, oldPass, pass} = req.body;
    let number = req.user.number;
    if (name) {
        if (name.length < 3 || name.length > 30) {
            return respondFailed(res, "002");
        }
        await PrimaryUserModel.updateOne({number}, {$set: {name}});
        return respondSuccess(res);
    } else if (oldPass && pass) {
        if (pass.length < 6 || pass.length > 30) {
            return respondFailed(res, "004");
        }
        if (oldPass !== req.user.pass) {
            return respondFailed(res, "004");
        }
        await PrimaryUserModel.updateOne({number}, {$set: {pass}});
        return respondSuccessWithData(res, {token: getJWT(number, pass, req.user.deviceID)});
    } else {
        respondFailed(res, "000");
    }

}

const uploadProfileImage = async (req, res) => {
    let number = req.user.number;
    let type = req.body.type;
    let imType = req.params.type;
    if (imType === "dp") {
        await PrimaryUserModel.updateOne({number}, {
            $set: {dp: type}
        });
    } else {
        await PrimaryUserModel.updateOne({number}, {
            $set: {bg: type}
        });
    }
    respondSuccess(res);
}

const getTransactionHistory = async (req, res) => {
    let {number} = req.user;
    let query = req.params.query;

    let transactions;
    if (!query || query === "all") {
        transactions = await UserTransactionModel.find({number});
    } else {
        transactions = await UserTransactionModel.find({number, "for": query});
    }

    let userTransactions = [];
    for (let i = 0; i < transactions.length; i++) {
        let transaction = transactions[i];
        delete transaction._id;
        delete transaction.__v;
        userTransactions.push(transaction);
    }
    respondSuccessWithData(res, userTransactions);
}


const getTopPlayers = async (req, res) => {
    let topPLayers = await PrimaryUserModel.find().sort({"tWinnings": -1}).limit(100);
    let finalTopPlayers = [];
    for (let i = 0; i < topPLayers.length; i++) {
        let topPlayer = topPLayers[i];
        finalTopPlayers.push({
            tWinnings: topPlayer.tWinnings, name: topPlayer.name
        })

    }
    respondSuccessWithData(res, finalTopPlayers)

}

const getBalances = (req, res) => {
    let user = req.user;
    respondSuccessWithData(res, {
        gBalance: user.gBalance,
        wBalance: user.wBalance,
        tWinnings: user.tWinnings,
        totalReferEarnings: user.totalReferEarnings
    });
}

const withdrawFunds = async (req, res) => {
    let {amount, method, address} = req.body;
    let user = req.user;
    let number = req.user.number;
    if (!amount || !method || !address) {
        return respondFailed(res, "000");
    }

    if (user.wBalance < amount) {
        return respondFailed(res, "701");
    }

    let withdrawModel = await WithdrawRequestModel.findOne({number});

    if (withdrawModel) {
        return respondFailed(res, "703")
    }

    let txnID = generateRandomID();
    await PrimaryUserModel.updateOne({number}, {$inc: {wBalance: -amount}});

    let finalBalance = user.wBalance - amount;
    io.to(connectedUsers[number]).emit("balance-update", "w", finalBalance);

    await insertTransaction(number, -amount, "w", "withdraw", "p", method + ":" + address, txnID)

    let withdrawReq = new WithdrawRequestModel({
        number, amount, method, address, txnID, date: getIndianTime()
    });

    await withdrawReq.save();

    return respondSuccess(res);
}


const depositFunds = async (req, res) => {
    let {amount, method, address} = req.body;
    let number = req.user.number;
    if (!amount || !method || !address) {
        return respondFailed(res, "000");
    }

    let depositReqModel = await DepositRequestModel.findOne({number});

    if (depositReqModel) {
        return respondFailed(res, "703")
    }

    let txnID = generateRandomID();

    await insertTransaction(number, amount, "g", "deposit", "p", method + ":" + address, txnID)

    let depositReq = new DepositRequestModel({
        number, amount, method, address, txnID, date: getIndianTime()
    });

    await depositReq.save();

    return respondSuccess(res)

}

const transferFunds = async (req, res) => {
    let {amount} = req.body;
    let user = req.user;
    let number = user.number;

    if (!amount) {
        return respondFailed(res, "000");
    }

    if (user.wBalance < amount) {
        return respondFailed(res, "701");
    }

    await PrimaryUserModel.updateOne({number}, {$inc: {wBalance: -amount, gBalance: amount}});

    await insertTransaction(number, amount, "b", "transfer", "s")

    let finalWBalance = user.wBalance - amount;
    let finalGBalance = user.gBalance + amount;
    io.to(connectedUsers[number]).emit("balance-update", "transfer", finalWBalance, finalGBalance);

    respondSuccess(res);
}


module.exports = {
    setReferer,
    getTransactionHistory,
    getTopPlayers,
    getBalances,
    withdrawFunds,
    depositFunds,
    transferFunds,
    updateProfile,
    uploadProfileImage
}