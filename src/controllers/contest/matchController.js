const {MatchModel, RealtimeRoomModel} = require("../../models/contestModel");
const {generateRandomID} = require("../../helpers/appHelper");
const {respondSuccessWithData, respondFailed} = require("../../managers/responseManager");
const {PrimaryUserModel} = require("../../models/userModels");
const {
    insertMatchJoinTransaction, insertMatchRefundTransaction, insertMatchJoinTransactionWithWinning
} = require("../../managers/transactionManager");
const schedule = require('node-schedule');
const {ScheduleJobModel} = require("../../models/appModels");
const {sendNotification} = require("../../managers/notificationManager");
const {getRealtimeMatchPenalty} = require("../app/appService");
const LudoGame = require("../../managers/ludoGameManager")

const scheduledJobs = {};
const scheduledPlayerWaitingJobs = {};
const PLAYER_SEARCH_EXPIRE = 4;
const PLAYER_WAITING_EXPIRE = 1;
const MAX_RETRIES = 12; // 12 times (every 5 seconds for 60 seconds)
const RETRY_INTERVAL = 5000; // 5 seconds

global.matches = {};

/**
 * This Function Returns All the available matches of given gameID */
const getMatches = async (req, res) => {
    let {gameID} = req.params;
    let {number} = req.user;

    if (!gameID) {
        return respondFailed(res, "000");
    }

    // prize += 50;
    // join += 30;
    //
    // let game = new MatchModel({
    //     gameID : "kF6fRQ1Hv3",
    //     matchID : generateRandomID(),
    //     matchName : "Ludo 1v1",
    //     prize : prize,
    //     entryFee : join,
    //     isRealtime : true
    // });
    //
    // await game.save();
    //
    // await MatchModel.updateMany({}, {$set: {joins: 0}, $unset: {player1: '', player2 : ''}});

    let matches = await MatchModel.find({gameID});

    let finalMatches = [];
    for (let i = 0; i < matches.length; i++) {
        let match = matches[i].toObject();
        match.joined = match.player1 === number || match.player2 === number;

        delete match._id;
        delete match.__v;

        finalMatches.push(match);
    }

    return respondSuccessWithData(res, finalMatches);

}

/**
 * When this method gets called then it cancels the match as no one joined and refunds the player money back to its account
 * */
const executePlayerFindingScheduledJob = async (number, matchID, gameID) => {
    let match = await MatchModel.findOne({matchID});
    delete scheduledJobs[matchID];
    if (match.player1 !== number) {
        return
    }
    await MatchModel.updateOne({matchID}, {$set: {joins: 0}, $unset: {player1: '', player1JoinTime: '', roomID: ''}});

    await PrimaryUserModel.updateOne({number}, {$inc: {gBalance: match.entryFee}});

    let user = await PrimaryUserModel.findOne({number});
    io.to(connectedUsers[number]).emit("balance-update", "g", user.gBalance);

    await insertMatchRefundTransaction(number, match.entryFee, matchID);

    io.to(connectedUsers[number]).emit(matchID, "expired");
    io.emit(gameID + "-match-updated", matchID, "joined-2", number);
    sendNotification(number, "Match TimedOut!!!", `Your match has been cancelled as no one joined on time. Match fee ৳${match.entryFee} will be refunded.`);
    await ScheduleJobModel.deleteOne({matchID})
}

const executePlayerWaitingScheduledJob = async (roomID, applyPenalty) => {
    await ScheduleJobModel.deleteOne({roomID})
    delete scheduledPlayerWaitingJobs[roomID];

    let match = await RealtimeRoomModel.findOne({roomID});

    let player1Number = match.player1;
    let player2Number = match.player2;

    let totalPenalty = 0;
    let afterPenalty = match.entryFee;
    if (applyPenalty && matches.hasOwnProperty(roomID) && !matches[roomID].hasOwnProperty("player1")) {
        totalPenalty = match.entryFee * Number("0." + getRealtimeMatchPenalty());
        afterPenalty -= totalPenalty;
    }

    /**
     * That Means Penalty is not 100%; so we need to refund after cutting penalty
     * */
    if (totalPenalty !== match.entryFee) {
        await PrimaryUserModel.updateOne({number: player1Number}, {$inc: {gBalance: afterPenalty}});
        let user1 = await PrimaryUserModel.findOne({number: player1Number});
        io.to(connectedUsers[player1Number]).emit("balance-update", "g", user1.gBalance);
        await insertMatchRefundTransaction(player1Number, afterPenalty, roomID);
    }

    await PrimaryUserModel.updateOne({number: player2Number}, {$inc: {gBalance: match.entryFee}});
    let user2 = await PrimaryUserModel.findOne({number: player2Number});

    io.to(connectedUsers[player2Number]).emit("balance-update", "g", user2.gBalance);

    await insertMatchRefundTransaction(player2Number, match.entryFee, roomID);

    io.to(connectedUsers[player1Number]).emit(roomID, "expired-waiting");
    io.to(connectedUsers[player2Number]).emit(roomID, "expired-waiting");

    await RealtimeRoomModel.deleteOne({roomID});
    let msg = `Your match has been cancelled. because you didnt joined the match on time. We deducted ৳${totalPenalty} (${getRealtimeMatchPenalty()}% of the match fee) as penalty and refunded the remaining balance to your Game Balance.`;
    if (!applyPenalty || afterPenalty === match.entryFee) {
        msg = `Your match has been cancelled as no one joined on time. Match fee ৳${match.entryFee} will be refunded.`;
    }
    if (matches.hasOwnProperty(roomID)) {
        delete matches[roomID];
    }
    sendNotification(player1Number, "Match Cancelled!", msg);
}

const scheduleRealtimeMatchTimeOut = async (number, matchID, gameID, scheduledTime, insertJob) => {
    if (insertJob) {
        let job = new ScheduleJobModel({
            matchID, gameID, number, scheduledTime, scheduledFor: "realtime-match-timeout"
        });
        job.save();
    }
    if (scheduledJobs.hasOwnProperty(matchID)) {
        await ScheduleJobModel.deleteOne({matchID})
        scheduledJobs[matchID].cancel();
        delete scheduledJobs[matchID];
    }

    // Store the scheduled job for later cancellation
    scheduledJobs[matchID] = schedule.scheduleJob(scheduledTime, async () => {
        await executePlayerFindingScheduledJob(number, matchID, gameID);
    });
};

const scheduleRealtimeMatchPlayerWaitingTimeOut = async (matchID, roomID, gameID, scheduledTime, insertJob) => {
    if (insertJob) {
        let job = new ScheduleJobModel({
            matchID, roomID, gameID, scheduledTime, scheduledFor: "realtime-match"
        });
        job.save();
    }
    if (scheduledPlayerWaitingJobs.hasOwnProperty(roomID)) {
        await ScheduleJobModel.deleteOne({roomID})
        scheduledPlayerWaitingJobs[roomID].cancel();
        delete scheduledPlayerWaitingJobs[roomID];
    }

    // Store the scheduled job for later cancellation
    scheduledPlayerWaitingJobs[roomID] = schedule.scheduleJob(scheduledTime, async () => {
        await executePlayerWaitingScheduledJob(roomID, true);
    });
};

const cancelScheduledRealtimeMatch = async (matchID) => {
    const scheduledJob = scheduledJobs[matchID];
    if (scheduledJob) {
        scheduledJob.cancel();
        await ScheduleJobModel.deleteOne({matchID})
        delete scheduledJobs[matchID];
    }
};
const cancelScheduledPlayerWaiting = async (roomID) => {
    const scheduledJob = scheduledPlayerWaitingJobs[roomID];
    if (scheduledJob) {
        scheduledJob.cancel();
        await ScheduleJobModel.deleteOne({roomID})
        delete scheduledPlayerWaitingJobs[roomID];
    }
};
const exitMatch = async (roomID, playerNumber) => {
    let match = await RealtimeRoomModel.findOne({roomID});
    if (match) {
        let pIndex = "player1";
        if (playerNumber === match.player1) {
            pIndex = "player2";
        }
        await matches[roomID].onPlayerWin(pIndex);
    }
    delete matches[roomID];
}
const onReconnect = (roomID, playerNumber) => {
    if (matches.hasOwnProperty(roomID)) {
        matches[roomID].onReconnect(playerNumber)
    }
}

function sendPlayerJoinedMessage(socketNumber, roomID, number, name, dp, attempt = 0) {
    if (attempt >= MAX_RETRIES) {
        return;
    }

    io.to(connectedUsers[socketNumber]).emit(roomID, "joined", number, name, dp, (ack) => {
        if (ack) {
            console.log('Message delivered successfully');
        } else {
            console.log('Message delivery failed, retrying...');
            setTimeout(() => {
                sendPlayerJoinedMessage(socketNumber, roomID, number, name, dp, attempt + 1);
            }, RETRY_INTERVAL);
        }
    });
}

const joinMatch = async (req, res) => {
    let {matchID} = req.params;
    let {number} = req.user;

    if (!matchID) {
        return respondFailed(res, "000");
    }

    let match = await MatchModel.findOne({matchID});

    if (!match) {
        return respondFailed(res, "601");
    }

    match = match.toObject();

    if (match.player1 === number || match.player2 === number) {
        return respondFailed(res, "602");
    }

    if (match.joins === 2) {
        return respondFailed(res, "603");
    }

    let checkMatches = await MatchModel.findOne({$or: [{player1: number}, {player2: number}], time: {$exists: false}});
    let checkRealtimeMatches = await RealtimeRoomModel.findOne({$or: [{player1: number}, {player2: number}]});

    if (checkMatches || checkRealtimeMatches) {
        return respondFailed(res, "604")
    }

    let gBalance = req.user.gBalance;
    let wBalance = req.user.wBalance;
    let entryFee = match.entryFee;

    if (entryFee > gBalance && entryFee > wBalance) {
        return respondFailed(res, "700");
    }

    if (gBalance > entryFee) {
        await PrimaryUserModel.updateOne({number}, {$inc: {gBalance: -entryFee}});
        let finalBalance = gBalance - entryFee;
        io.to(connectedUsers[number]).emit("balance-update", "g", finalBalance);
        await insertMatchJoinTransaction(number, entryFee, matchID);
    } else {
        await PrimaryUserModel.updateOne({number}, {$inc: {wBalance: -entryFee}});
        let finalBalance = wBalance - entryFee;
        io.to(connectedUsers[number]).emit("balance-update", "w", finalBalance);
        await insertMatchJoinTransactionWithWinning(number, entryFee, matchID);
    }

    let gameID = match.gameID;
    if (!match.hasOwnProperty("player1")) {
        const scheduledTime = new Date(Date.now() + PLAYER_SEARCH_EXPIRE * 60 * 1000);

        let roomID = generateRandomID()
        await MatchModel.updateOne({matchID}, {
            $set: {
                joins: 1, player1: number, player1JoinTime: scheduledTime.toISOString(), roomID
            }
        });
        io.emit(gameID + "-match-updated", matchID, "joined-1", number);
        if (!match.hasOwnProperty("time")) {
            await scheduleRealtimeMatchTimeOut(number, matchID, gameID, scheduledTime, true);
        }

        return respondSuccessWithData(res, {justJoined: true, roomID});
    }

    if (!match.hasOwnProperty("player2")) {
        let matchData;
        if (match.hasOwnProperty("time")) {
            await MatchModel.updateOne({matchID}, {$set: {joins: 2, player2: number}});
        } else {
            const scheduledTime = new Date(Date.now() + PLAYER_WAITING_EXPIRE * 60 * 1000);

            await MatchModel.updateOne({matchID}, {
                $set: {joins: 0}, $unset: {player1: '', player1JoinTime: '', roomID: ''}
            });
            let realtimeRoom = new RealtimeRoomModel({
                matchID,
                gameID,
                roomID: match.roomID,
                matchName: match.matchName,
                player2JoinTime: scheduledTime.toISOString(),
                prize: match.prize,
                entryFee: entryFee,
                player1: match.player1,
                player2: number,
            });
            await realtimeRoom.save();


            let player1 = await PrimaryUserModel.findOne({number: match.player1});

            matchData = {matchID, roomID: match.roomID, number: player1.number, name: player1.name, dp: player1.dp};
            await scheduleRealtimeMatchPlayerWaitingTimeOut(matchID, match.roomID, gameID, scheduledTime, true)
            sendPlayerJoinedMessage(match.player1, match.roomID, req.user.number, req.user.name, req.user.dp);
            await cancelScheduledRealtimeMatch(matchID);
        }
        io.emit(gameID + "-match-updated", matchID, "joined-2", number);
        return respondSuccessWithData(res, matchData);
    }

    return respondFailed(res, "603");

}

const matchUpdate = async (...args) => {
    if (args[1] === "match-exit") {
        await exitMatch(args[0], args[2])
        return
    }
    matches[args[0]].matchUpdate(...args)
}

const showGameStatus = (roomID) => {
}
const playerReadyFinal = (roomID, playerNumber) => {
    matches[roomID].playerReady(playerNumber);
    if (matches[roomID].isReadyToStart()) {
        matches[roomID].startMath();
    }
}

const playerReady = async (roomID, playerNumber) => {
    let match = await RealtimeRoomModel.findOne({roomID});
    if (!match) {
        if (matches.hasOwnProperty(roomID)) {
            delete matches[roomID];
        }
        return;
    }
    let playerIndex = match.player1 === playerNumber ? "player1" : "player2";

    if (!matches.hasOwnProperty(roomID)) {
        matches[roomID] = new LudoGame(roomID, match.toObject());
    }

    matches[roomID].addPlayer(playerNumber, playerIndex);

    if (matches[roomID].isReadyToInit()) {
        io.to(connectedUsers[match.player1]).emit(roomID, "init-match", matches[roomID].getPlayerIndex(match.player1));
        io.to(connectedUsers[match.player2]).emit(roomID, "init-match", matches[roomID].getPlayerIndex(match.player2));
        await cancelScheduledPlayerWaiting(roomID);
    }
}

const loadScheduledJobs = async () => {
    const jobs = await ScheduleJobModel.find({});
    for (let job of jobs) {
        job = job.toObject();
        const timeDifference = job.scheduledTime - Date.now();
        if (timeDifference > 0) {
            if (job.scheduledFor === "realtime-match") {
                await scheduleRealtimeMatchPlayerWaitingTimeOut(job.matchID, job.roomID, job.gameID, job.scheduledTime)
                continue;
            }
            await scheduleRealtimeMatchTimeOut(job.number, job.matchID, job.gameID, job.scheduledTime);
            continue;
        }
        if (job.scheduledFor === "realtime-match") {
            await executePlayerWaitingScheduledJob(job.roomID);
            continue
        }
        await executePlayerFindingScheduledJob(job.number, job.matchID, job.gameID);

    }
}

loadScheduledJobs();

module.exports = {
    getMatches, joinMatch, playerReady, matchUpdate, playerReadyFinal, showGameStatus, exitMatch, onReconnect
}