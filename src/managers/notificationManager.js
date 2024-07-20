const admin = require("firebase-admin");

const sendNotification = (to, title, body, image) => {

    if (to === "all") {
        to = "app"
    }

    const message = {
        topic: to, notification: {
            title, body, image
        }, android: {
            priority: 'high', notification: {
                icon: "app_icon", sound: "default", color: "#bb2231"
            }
        },
    };

    admin.messaging().send(message).then((response) => {
        console.log(response)
    }).catch((err) => {
        console.log(err)
    })

}

module.exports = {
    sendNotification
}