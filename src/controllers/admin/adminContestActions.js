const {GameModel} = require("../../models/contestModel");
const {respondSuccessWithData} = require("../../managers/responseManager");
const getGames = async (req, res) => {
    let games = await GameModel.find();
    respondSuccessWithData(res, games);
}

module.exports = {
    getGames
}