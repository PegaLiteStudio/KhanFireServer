const {respondFailed, respondSuccess, respondSuccessWithData} = require("../../managers/responseManager");
const {AdminModel} = require("../../models/adminModels");

const getAdmins = async (req, res) => {
    let admins = await AdminModel.find();
    let adminList = [];

    if (admins) {
        for (let i = 0; i < admins.length; i++) {
            let admin = admins[i];
            adminList.push({
                name: admin.name,
                number: admin.number,
                isActive: admin.status

            })
        }
    }
    respondSuccessWithData(res, adminList)
}

const addAdmin = async (req, res) => {
    let {name, number, pass} = req.body;

    if (!name || !number || !pass) {
        return respondFailed(res, "000");
    }

    let checkAdmin = await AdminModel.findOne({number});

    if (checkAdmin) {
        return respondFailed(res, "101")
    }

    let admin = new AdminModel({name, number, pass});
    await admin.save();
    return respondSuccess(res);
}

const getAdminDetails = async (req, res) => {
    let {number} = req.params;
    if (!number) {
        return respondFailed(res, "000");
    }
    let admin = await AdminModel.findOne({number});
    if (!admin) {
        return respondSuccess(res);
    }
    respondSuccessWithData(res, admin);

}

const editAdmin = async (req, res) => {
    let changes = req.body;
    let number = req.params.number;
    if (!changes) {
        return respondFailed(res, "000");
    }
    let admin = await AdminModel.findOne({number});
    if (!admin) {
        return respondSuccess(res);
    }


    if (changes.hasOwnProperty("balance")) {
        changes.balance += admin.balance;
    } else if (changes.hasOwnProperty("balance-remove")) {
        if (admin.balance < changes["balance-remove"]) {
            changes.balance = 0;
        } else {
            changes.balance = admin.balance - changes["balance-remove"];
        }
    }   

    await AdminModel.updateOne({number}, {$set: changes})
    console.log(changes)
    io.to(connectedUsers["admin-" + number]).emit("update", changes);
    respondSuccess(res);

}
module.exports = {
    getAdmins, addAdmin, getAdminDetails, editAdmin
}