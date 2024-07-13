const {AppInfoModel, AppConfigModel} = require("../../models/appModels");
const {respondSuccessWithData, respondSuccess, respondFailed} = require("../../managers/responseManager");
const {loadDefaults} = require("../app/appService");
const {getIndianTime} = require("../../managers/timeManager");
const path = require("path");
const fs = require("fs");
const sliderImagePath = path.join(__dirname, "../../../data/app/slider/")

const getAppSettings = async (req, res) => {
    let data = await AppInfoModel.findOne();
    respondSuccessWithData(res, data);
}

const updateAppSettings = async (req, res) => {
    console.log(req.body);
    let changes = req.body;
    await AppInfoModel.updateOne({}, {$set: changes})
    await loadDefaults(true);
    io.emit("app-update", changes);
    respondSuccess(res);
}

const getAppVersions = async (req, res) => {
    let data = await AppConfigModel.find();
    respondSuccessWithData(res, data);
}


const getVersionDetails = async (req, res) => {
    let versionName = req.params.versionName;
    let data = await AppConfigModel.findOne({versionName});
    respondSuccessWithData(res, data);
}


const addAppVersion = async (req, res) => {
    let {version, versionName} = req.body;

    if (!version || !versionName) {
        return respondFailed(res, "000");
    }
    let data = await AppConfigModel.findOne({$or: [{version}, {versionName}]});

    if (data) {
        return respondFailed(res, "001");
    }

    let newVer = new AppConfigModel({version, versionName, date: getIndianTime()});
    await newVer.save();

    respondSuccess(res);
}


const updateAppVersion = async (req, res) => {
    let versionName = req.params.versionName;
    let changes = req.body;

    try {

        if (changes.hasOwnProperty("primary")) {
            if (changes.primary === false) {
                return respondFailed(res, "1000")
            }
            await AppConfigModel.updateMany({}, {$set: {primary: false}});
        }

        await AppConfigModel.updateOne({versionName}, {$set: changes});
        await loadDefaults(true)
        return respondSuccess(res);
    } catch (e) {
        console.log(e)
    }
}

const getSliderImages = async (req, res) => {
    let images = await AppInfoModel.findOne();
    respondSuccessWithData(res, images.sliderImages);
}

const uploadSliderImage = async (req, res) => {
    let appInfo = await AppInfoModel.findOne();
    appInfo = appInfo.toObject();
    let sliderObject = appInfo.sliderImages;
    let action = req.body.url;
    if (req.body.url) {
        if (action.startsWith('"') && action.endsWith('"')) {
            action = action.slice(1, -1)
        }
    }
    if (action && action.length !== 0) {
        sliderObject.push({
            img: req.body.filename, action
        });
    } else {
        sliderObject.push({
            img: req.body.filename,
        });
    }
    await AppInfoModel.updateOne({}, {$set: {sliderImages: sliderObject}})
    await loadDefaults(true)
    io.emit("app-update", {sliderImages: sliderObject});
    respondSuccess(res);
}

const deleteImageSlider = async (req, res) => {
    let img = req.params.img;
    let appInfo = await AppInfoModel.findOne();
    appInfo = appInfo.toObject();
    let sliderObject = appInfo.sliderImages;
    let finalObject = [];
    for (let i = 0; i < sliderObject.length; i++) {
        if (sliderObject[i].img !== img) {
            finalObject.push(sliderObject[i]);
        }
    }

    io.emit("app-update", {sliderImages: finalObject});
    await AppInfoModel.updateOne({}, {$set: {sliderImages: finalObject}})
    await loadDefaults(true)
    fs.access(sliderImagePath + img, fs.constants.F_OK, (err) => {
        if (err) {
            return respondSuccess(res);
        }

        fs.unlink(sliderImagePath + img, (err) => {
            if (err) {
                console.error(err);
            }
            respondSuccess(res);
        });
    });
}
module.exports = {
    getAppSettings,
    updateAppSettings,
    getAppVersions,
    addAppVersion,
    getVersionDetails,
    updateAppVersion,
    getSliderImages,
    uploadSliderImage,
    deleteImageSlider
}