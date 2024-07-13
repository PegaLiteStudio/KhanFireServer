const mongoose = require("mongoose");


const withdrawRequestSchema = new mongoose.Schema({
    number: {type: String, required: true},
    amount: {type: Number, required: true},
    txnID: {type: String, required: true, unique: true},
    date: {type: String, required: true},
    method: {type: String, required: true},
    address: {type: String, required: true},
});


const depositRequestSchema = new mongoose.Schema({
    number: {type: String, required: true},
    amount: {type: Number, required: true},
    txnID: {type: String, required: true, unique: true},
    date: {type: String, required: true},
    method: {type: String, required: true},
    address: {type: String, required: true},
});

const WithdrawRequestModel = new mongoose.model("withdraw-requests", withdrawRequestSchema);
const DepositRequestModel = new mongoose.model("deposit-requests", depositRequestSchema);

module.exports = {
    WithdrawRequestModel, DepositRequestModel
}