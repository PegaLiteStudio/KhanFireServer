const mongoose = require("mongoose");


const superAdminSchema = new mongoose.Schema({
    id: {type: String},
    key: {type: String, required: true},
    isActive: {type: Boolean},
    invalidAttempts: {type: Number},
    maxInvalidAttempts: {type: Number},
    deviceID : {type : String},
});

const SuperAdminModel = new mongoose.model("super-admin", superAdminSchema);

module.exports = {
    SuperAdminModel
}