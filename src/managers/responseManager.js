// const {sendInternalError} = require("../support/serverSupport");
const MISSING_PARAMETERS_MSG = {status: "failed", code: "000", msg: "Missing Parameters"};
const CODE_MESSAGES = {
    "001": "Invalid Number",
    "002": "Invalid Name",
    "003": "Invalid OTP",
    "004": "Invalid Password",
    "005": "Invalid Email",
    "006": "Invalid Refer Code",
    "101": "Account Already Exists",
    "102": "Account Not Exists",
    "103": "Refer Bonus Already Claimed",
    "201": "Account Banned",
    "202": "Device Already Registered",
    "203": "Account Linked With Other Device",
    "204": "Max Attempt Reached",
    "301": "OTP Expired",
    "302": "Session Expired",
    "600": "Game Not Found",
    "601": "Match Not Found",
    "602": "Match Already Joined",
    "603": "Match Already Started",
    "604": "You Have Already Joined a Realtime Match",
    "700": "Insufficient Game Balance",
    "701": "Insufficient Winning Balance",
    "702": "Transaction Not Found",
    "703": "Previous Request is Already Pending!",
    "900": "App Under Maintenance",
    "901": "Update Required",
    "1000": "Error"
}
const throwError = (res, err) => {
    console.log(err);
    res.status(200).send({status: "error", error: err});
}

const throwInternalError = (req, res, err) => {
    console.log(err);
    res.status(500).send({status: "error", error: err});
    // sendInternalError(req, res, err)
}

const respondSuccess = (res) => {
    res.status(200).send({status: "success"});
}

const respondSuccessWithData = (res, ...data) => {
    /* if (data.length === 1) {
           data = data[0];
   } */

    if (Array.isArray(data[0]) === true) {
        data = data[0];
    }

    res.status(200).send({status: "success", data});
}

const respondFailed = (res, code, data) => {
    if (code === "000") {
        return respondDeclared(res, MISSING_PARAMETERS_MSG);
    }
    res.status(200).send({status: "failed", code, msg: CODE_MESSAGES[code], data});
}

const respond = (res, data) => {
    res.status(200).send(data);
}

const respondDeclared = (res, msg) => {
    res.status(200).send(msg);
}

module.exports = {
    throwError,
    throwInternalError,
    respondSuccess,
    respondSuccessWithData,
    respondFailed,
    respond,
    respondDeclared,
    MISSING_PARAMETERS_MSG
}