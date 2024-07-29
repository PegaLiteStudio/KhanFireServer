const {getIndianTime} = require("./timeManager");
const {UserTransactionModel} = require("../models/userModels");
const {generateRandomID} = require("../helpers/appHelper");
const insertTransaction = async (number, amount, iN, foR, status, description, txnID) => {
    if (!txnID) {
        txnID = generateRandomID();
    }
    amount = amount + '';
    if (!amount.includes("+") && !amount.includes("-")) {
        if (status === "c") {
            amount = "+" + amount;
        } else if (status === "d") {
            amount = "-" + amount;
        }
    }
    try {
        let userTransaction = new UserTransactionModel({
            number, txnID, amount, in: iN, date: getIndianTime(), for: foR, status, description
        });
        await userTransaction.save();
    } catch (e) {
        console.log(e);
    }
}

const insertMatchJoinTransaction = async (number, amount, description) => {
    await insertTransaction(number, amount, "g", "match-join", "d", description);
}
const insertMatchJoinTransactionWithWinning = async (number, amount, description) => {
    await insertTransaction(number, amount, "w", "match-join", "d", description);
}

const insertMatchRefundTransaction = async (number, amount, description) => {
    await insertTransaction(number, amount, "g", "match-refund", "c", description);
}

const insertMatchWinTransaction = async (number, amount, description) => {
    await insertTransaction(number, amount, "w", "match-win", "c", description);
}

module.exports = {
    insertTransaction, insertMatchJoinTransaction,insertMatchJoinTransactionWithWinning, insertMatchRefundTransaction, insertMatchWinTransaction

}

