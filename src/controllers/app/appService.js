const {AppConfigModel, AppInfoModel} = require("../../models/appModels");
const {respondFailed, respondSuccessWithData, respondSuccess} = require("../../managers/responseManager");
const path = require("path");
const imagePath = path.join(__dirname, "../../../data/")

let APP_CONFIGS, APP_INFO, LATEST_UPDATE;

const API_KEYS = {
    app: process.env.APP_API_KEY
}

const loadDefaults = async (hardLoad = false) => {
    if (APP_CONFIGS && !hardLoad) {
        return;
    }

    APP_CONFIGS = {};
    LATEST_UPDATE = {};
    APP_INFO = {};

    let appInfo = await AppInfoModel.findOne({});
    let appConfigs = await AppConfigModel.find({});


    APP_INFO = appInfo.toObject();

    delete APP_INFO["_id"];
    delete APP_INFO["__v"];

    APP_INFO.app = API_KEYS.app;

    for (let i = 0; i < appConfigs.length; i++) {
        let appInfo = appConfigs[i].toObject();
        let v = appInfo.version;
        APP_CONFIGS[v] = appInfo;
        if (appInfo.hasOwnProperty("primary") && appInfo.primary === true) {
            LATEST_UPDATE.version = v;
            LATEST_UPDATE.versionName = appInfo.versionName;
            LATEST_UPDATE.appUrl = APP_INFO.appUrl;
        }
    }
    //
    // if (hardLoad) {
    //     console.log("App Config Changes Published!");
    //     io.emit("app-update", APP_INFO);
    // }

}

const appInit = async (req, res) => {
    /* Code for inserting dummy app info */
    // let s = new AppInfoModel({
    //     maintenance: false,
    //     maintenanceMsg: "App Under Maintenance",
    //     signature: "sdf",
    //     sliderImages: [
    //         {"img": "https://", "action": "sdf"},
    //         {"img": "https://", "action": "sdf"}
    //     ],
    //     appUrl: "https://youtube.com",
    //     supportUrl: "https://youtube.com",
    //     howToAddMoneyUrl: "https://youtube.com",
    //     howToUseAppUrl: "https://youtube.com",
    //     howToPlayGameUrl: "https://youtube.com",
    //
    //     bikashNumber: "16033017709",
    //     nagadNumber: "16033017709",
    //     rocketNumber: "16033017709",
    //
    //     minimumTransferAmount: 10,
    //     minimumWithdrawAmount: 50,
    //     minimumDepositAmount: 50,
    // });
    // await s.save();
    // return respondSuccess(res);


    if (!APP_CONFIGS) {
        await loadDefaults();
    }

    let {version, signature} = req.body;

    if (!version || !signature) {
        return respondFailed(res, "000");
    }


    if (!APP_CONFIGS.hasOwnProperty(version)) {
        return respondFailed(res, "901", LATEST_UPDATE)
    }

    let app = APP_CONFIGS[version];

    if (!app.hasOwnProperty("isUnderDevelopment") || app.isUnderDevelopment === false) {
        if (LATEST_UPDATE.version !== version || signature !== APP_INFO.signature) {
            return respondFailed(res, "901", LATEST_UPDATE);
        }

        if (APP_INFO.maintenance === true) {
            return respondFailed(res, "900", {msg: APP_INFO.maintenanceMsg})
        }
    }
    if (APP_INFO.showNotice === false) {
        delete APP_INFO.notice;
    }
    respondSuccessWithData(res, APP_INFO)

}


const updateApp = async (req, res) => {
    // await MatchModel.updateMany({}, {$set: {joins: 0}, $unset: {player1: '', player2: ''}});
    // await UserTransactionModel.deleteMany({in: {exists: false}});
    // await UserTransactionModel.updateMany(  { "for": "match-refund" }, // Filter documents where "for" is "match-join"
    //     [
    //         {
    //             $set: {
    //                 amount: {
    //                     $cond: {
    //                         if: { $eq: ["$amount", ""] }, // Check if "amount" is empty
    //                         then: "$amount", // If empty, keep it as it is
    //                         else: { $concat: ["+", "$amount"] } // If not empty, prepend "-"
    //                     }
    //                 }
    //             }
    //         }
    //     ]);
    //
    // await PrimaryUserModel.updateMany({}, {
    //     $set: {
    //         totalReferRegistration: 0,
    //         totalReferEarnings: 0
    //     }
    // });
    await loadDefaults(true);
    respondSuccess(res);
}

const getRefererBonus = () => {
    return APP_INFO.refererBonus;
}

const getRealtimeMatchPenalty = () => {
    return APP_INFO.realtimeMatchPenalty;
}
const getFixedTimeMatchPenalty = () => {
    return APP_INFO.fixedTimeMatchPenalty;
}

const getReferBonus = () => {
    return APP_INFO.referBonus;
}


const getImage = (req, res) => {
    let {parent, id, type} = req.params;

    if (!parent || !id || !type) {
        return respondFailed(res, "000");
    }
    res.sendFile(imagePath + parent + "/" + type + "/" + id, (err) => {
        if (err) {
        }
    });
}

module.exports = {
    appInit,
    loadDefaults,
    updateApp,
    getReferBonus,
    getRefererBonus,
    getImage,
    getRealtimeMatchPenalty,
    getFixedTimeMatchPenalty
}