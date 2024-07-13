const mongoose = require("mongoose");


const adminSchema = new mongoose.Schema({
    number: {type: String, required: true, unique: true},
    pass: {type: String, required: true},
    deviceID: {type: String},
    name: {type: String, required: true},
    balance: {type: Number, default: 0},
    permissions: {type: Object, default: {}},
    status: {type: Boolean, default: true}
});

const AdminModel = new mongoose.model("admins", adminSchema);

module.exports = {
    AdminModel
}