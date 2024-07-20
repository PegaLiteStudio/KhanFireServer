const {respondSuccess, respondSuccessWithData} = require("../../managers/responseManager");
const fs = require("fs");
const path = require("path");
const {sendNotification} = require("../../managers/notificationManager");
const notificationImagePath = path.join(__dirname, "../../../data/app/notification/")

const uploadNotificationImage = (req, res) => {
    return respondSuccess(res);
}
const getNotificationImages = (req, res) => {
    try {
        let images = [];
        let files = fs.readdirSync(notificationImagePath);
        files.forEach(file => {
            images.push({
                img: file, action: "notification://"
            })
        });
        respondSuccessWithData(res, images)
    } catch (err) {
        respondSuccessWithData(res, [])
    }
}

const sendNotificationFromAdmin = (req, res) => {
    let {to, title, message, image} = req.body;
    sendNotification(to, title, message, image);
    return respondSuccess(res);
}
module.exports = {
    uploadNotificationImage, getNotificationImages, sendNotificationFromAdmin
}