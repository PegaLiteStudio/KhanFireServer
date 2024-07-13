const mongoose = require("mongoose");
const {getIndianTime} = require("../managers/timeManager");

/** User Schema for Primary User Information
 * */
const primaryUserSchema = new mongoose.Schema({
    name: {type: String, required: true, trim: true, maxLength: 30},
    email: {type: String, required: true, trim: true, maxLength: 70, unique: true},
    number: {type: String, required: true, trim: true, unique: true},
    deviceID: {type: String, required: true, trim: true},
    referCode: {type: String, required: true, trim: true, unique: true},
    referer: {type: String, trim: true},
    pass: {type: String, required: true, trim: true, maxLength: 30},
    regTime: {type: String, default: getIndianTime()},
    status: {type: String, required: false},
    gBalance: {type: Number, default: 0}, // Game Balance
    wBalance: {type: Number, default: 0}, // Winning Balance
    tWinnings: {type: Number, default: 0}, // Total  Winnings
    totalReferRegistration: {type: Number, default: 0}, // Total Refer Registration
    totalReferEarnings: {type: Number, default: 0}, // Total Refer Earnings
    totalMatchesPlayed: {type: Number, default: 0}, // Total Matches Played
    totalMatchesWin: {type: Number, default: 0}, // Total Matches Win
    dp: {type: String, trim: true},
    bg: {type: String, trim: true},
});

/** Transaction Schema for saving Transactions
 * for ["refer-bonus", "refer-join-bonus", "match-join", "match-refund"]
 * */
const userTransactionSchema = new mongoose.Schema({
    number: {type: String, required: true, trim: true},
    txnID: {type: String, required: true, trim: true, unique: true},
    amount: {type: String, required: true, trim: true},
    in: {type: String, required: true, trim: true}, // Credited in? g -> Game Balance. w -> Winning Balance;
    date: {type: String, default: getIndianTime()},
    for: {type: String, required: false, trim: true},
    status: {type: String, required: false, default: "p"}, // c -> Credited, d -> Debited, p -> Pending, r -> Rejected, s -> success
    description: {type: String, required: false},
});


const PrimaryUserModel = new mongoose.model("users", primaryUserSchema);
const UserTransactionModel = new mongoose.model("user-transactions", userTransactionSchema);

module.exports = {
    PrimaryUserModel, UserTransactionModel
}