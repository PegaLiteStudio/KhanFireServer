const {respondFailed, respondSuccess, throwError, respondSuccessWithData} = require("../../managers/responseManager");
const {PrimaryUserModel} = require("../../models/userModels");
const {getIndianTime, getGreeting} = require("../../managers/timeManager");
const {generateRandomID} = require("../../helpers/appHelper");
const {getJWT} = require("../../helpers/authHelper");
const {GameModel, MatchModel, RealtimeRoomModel} = require("../../models/contestModel");

const userRegistration = async (req, res) => {
    let {name, email, number, pass, deviceID} = req.body;

    if (!name || !number || !email || !deviceID) {
        return respondFailed(res, "000");
    }

    if (name.length < 3 || name.length > 30) {
        return respondFailed(res, "002");
    }

    if (number.length !== 11) {
        return respondFailed(res, "001");
    }
    if (email.length < 7 || email.length > 70 || !email.toLowerCase()
        .match(/^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/)) {
        return respondFailed(res, "005");
    }

    try {
        const user = await PrimaryUserModel.findOne({$or: [{number}, {email}]});

        if (user) {
            return respondFailed(res, "101");
        }
        const device = await PrimaryUserModel.findOne({deviceID});

        if (device) {
            return respondFailed(res, "202")
        }

        if (!pass) {
            return respondSuccess(res);
        }

        if (pass.length < 6 || pass.length > 30) {
            return respondFailed(res, "004");
        }

        let primaryUserModel = new PrimaryUserModel({
            name, email, number, pass, deviceID, referCode: generateRandomID(8).toUpperCase(), regTime: getIndianTime()
        });

        await primaryUserModel.save();

        respondSuccessWithData(res, {token: getJWT(number, pass, deviceID)});


    } catch (err) {
        throwError(res, err);
    }
}

const mainLogin = async (number, pass, deviceID, res, callback) => {
    try {
        if (!number || !pass || !deviceID) {
            callback(null);
            return respondFailed(res, "000");
        }
        let user = await PrimaryUserModel.findOne({number});

        if (!user) {
            callback(null);
            return respondFailed(res, "102");
        }

        user = user.toObject();

        if (user.pass !== pass) {
            callback(null);
            return respondFailed(res, "004");
        }

        if (user.hasOwnProperty("status") && user.status === "banned") {
            callback(null);
            return respondFailed(res, "201");
        }

        if (user.hasOwnProperty("deviceID")) {
            if (user.deviceID !== deviceID) {
                return respondFailed(res, "203");
            }
        } else {
            await PrimaryUserModel.updateOne({number}, {$set: {deviceID}});
        }

        callback(user);

    } catch (err) {
        callback(null);
        throwError(res, err);
    }
}

const userLogin = async (req, res) => {
    let {number, pass, deviceID} = req.body;

    await mainLogin(number, pass, deviceID, res, (user) => {
        if (user) {
            respondSuccessWithData(res, {token: getJWT(number, pass, deviceID)});
        }
    });
}

const getMinutesDifference = (expireTime) => {
    let timeLeft = expireTime - new Date();

    let secondsDifference = timeLeft / 1000;

    return secondsDifference / 60;
}
const userSessionLogin = async (req, res) => {

    let {number} = req.user;
    // let primaryUserModel = new GameModel({
    //     gameName: "Ludo Fire 3",
    //     gameID: generateRandomID(),
    //     icon: "data:image/jpeg;base64,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",
    //     img: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSeqPVvW_5uQ7jFzcH5un1gblFPB9gkgQQVx9a8ECBHWA&s",
    //     date: getIndianTime()
    //
    // });
    //
    // await primaryUserModel.save();

    let allGames = await GameModel.find();
    let games = [];
    for (let i = 0; i < allGames.length; i++) {
        let game = allGames[i].toObject();
        game.activeMatches = await MatchModel.find({gameID: game.gameID}).count();

        delete game._id;
        delete game.date;
        delete game.__v;

        games.push(game);
    }

    let checkMatches = await MatchModel.findOne({$or: [{player1: number}, {player2: number}], time: {$exists: false}});
    let checkRealtimeMatches = await RealtimeRoomModel.findOne({$or: [{player1: number}, {player2: number}]});

    let isRealtimeMatchJoined;
    if (checkMatches) {
        isRealtimeMatchJoined = {
            gameID: checkMatches.gameID,
            matchID: checkMatches.matchID,
            roomID: checkMatches.roomID,
            matchName: checkMatches.matchName,
            expiringIn: getMinutesDifference(new Date(checkMatches.player1JoinTime)).toFixed(2)
        }
    } else if (checkRealtimeMatches) {

        let opponentPlayer;

        if (checkRealtimeMatches.player1 === number) {
            opponentPlayer = await PrimaryUserModel.findOne({number: checkRealtimeMatches.player2});
        } else {
            opponentPlayer = await PrimaryUserModel.findOne({number: checkRealtimeMatches.player1});
        }

        isRealtimeMatchJoined = {
            gameID: checkRealtimeMatches.gameID,
            matchID: checkRealtimeMatches.matchID,
            matchName: checkRealtimeMatches.matchName,
            roomID: checkRealtimeMatches.roomID,
            name: opponentPlayer.name,
            number: opponentPlayer.number,
            expiringIn: getMinutesDifference(new Date(checkRealtimeMatches.player2JoinTime)).toFixed(2),
            dp: opponentPlayer.dp
        }
    }


    let user = req.user;

    respondSuccessWithData(res, {
        userInfo: {
            name: user.name,
            number: user.number,
            email: user.email,
            gBalance: user.gBalance,
            wBalance: user.wBalance,
            tWinnings: user.tWinnings,
            referCode: user.referCode,
            totalReferRegistration: user.totalReferRegistration,
            totalReferEarnings: user.totalReferEarnings,
            dp: req.user.dp,
            bg: req.user.bg
        },
        isRealtimeMatchJoined,
        greeting: getGreeting(),
        games
    })
}


module.exports = {
    userRegistration, userLogin, mainLogin, userSessionLogin
}