const mongoose = require('mongoose');

const mongoDBUri = process.env.MONGO_URI

const connect = () => {
    mongoose.connect(mongoDBUri, {
    }).then(() => console.log("MongoDB is connected"))
        .catch(err => {
            console.log(err);
            process.exit(1);
        });
}

module.exports = {
    connect
}