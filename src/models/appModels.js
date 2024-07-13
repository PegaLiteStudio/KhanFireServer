const mongoose = require("mongoose");


const appConfigSchema = new mongoose.Schema({
    version: {type: Number, unique: true},
    versionName: {type: String, unique: true},
    primary: {type: Boolean, default: false},
    isUnderDevelopment: {type: Boolean, default: true},
    date: {type: String, required: true},
});

const appInfoSchema = new mongoose.Schema({
    maintenance: {type: Boolean, default: false},
    signature: {type: String, required: true},
    maintenanceMsg: {type: String, required: false},
    notice: {type: String, required: false},
    showNotice: {type: Boolean, default: false},
    sliderImages: {type: Array, required: true},

    appUrl: {type: String, required: true},
    supportUrl: {type: String, required: true},

    howToAddMoneyUrl: {type: String, required: true},
    howToUseAppUrl: {type: String, required: true},
    howToPlayGameUrl: {type: String, required: true},

    bikashNumber: {type: String, required: true},
    nagadNumber: {type: String, required: true},
    rocketNumber: {type: String, required: true},
    binanceAddress: {type: String, required: true},

    minimumTransferAmount: {type: Number, required: true},
    minimumWithdrawAmount: {type: Number, required: true},
    minimumDepositAmount: {type: Number, required: true},

    withdrawEnabled: {type: Boolean, default: true},
    depositEnabled: {type: Boolean, default: true},
    transferEnabled: {type: Boolean, default: true},

    USDTPrice: {type: Number, required: true},

    realtimeMatchPenalty: {type: Number, required: true},
    fixedTimeMatchPenalty: {type: Number, required: true},

    refererBonus: {type: Number, required: true},
    referBonus: {type: Number, required: true},
    referEnabled: {type: Boolean, default: true},

});

const scheduledJobs = new mongoose.Schema({
    matchID: {type: String, required: true},
    roomID: {type: String},
    gameID: {type: String, required: true},
    number: {type: String},
    scheduledTime: {type: String, required: true},
    scheduledFor : {type : String}
});

const deviceLogs = new mongoose.Schema({
    id: {type: String, required: true},
});


const AppConfigModel = new mongoose.model("app-configs", appConfigSchema);
const AppInfoModel = new mongoose.model("app-infos", appInfoSchema);
const ScheduleJobModel = new mongoose.model("scheduled-jobs", scheduledJobs);
const DeviceLogsModel = new mongoose.model("device-logs", deviceLogs);

module.exports = {
    AppConfigModel, AppInfoModel, ScheduleJobModel, DeviceLogsModel
}
