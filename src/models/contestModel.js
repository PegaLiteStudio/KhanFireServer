const mongoose = require("mongoose");

const gameSchema = new mongoose.Schema({
    gameName: {type: String, unique: true},
    gameID: {type: String, unique: true},
    icon: {type: String},
    img: {type: String},
    date: {type: String},
    isRealtimeGame: {type: Boolean},
    gameType: {type: String}
});


const matchSchema = new mongoose.Schema({
    matchID: {type: String, unique: true, required: true},
    roomID: {type: String},
    gameID: {type: String, required: true},
    matchName: {type: String, required: true},
    prize: {type: Number, required: true},
    entryFee: {type: Number, required: true},
    joins: {type: Number, default: 0},
    time: {type: String},
    isRealtime: {type: Boolean},
    player1: {type: String},
    player1JoinTime: {type: String},
    player2: {type: String}
});

const realtimeRoomSchema = new mongoose.Schema({
    matchID: {type: String, required: true},
    gameID: {type: String, required: true},
    roomID: {type: String, unique: true, required: true},
    matchName: {type: String, required: true},
    prize: {type: Number, required: true},
    entryFee: {type: Number, required: true},
    player2JoinTime: {type: String},
    player2: {type: String},
    player1: {type: String},
    startTime: {type: String},
    player1Ready: {type: Boolean},
    player2Ready: {type: Boolean},
});

const allMatchesHistory = new mongoose.Schema({
    matchID: {type: String, required: true},
    gameID: {type: String, required: true},
    roomID: {type: String, unique: true, required: true},
    matchName: {type: String, required: true},
    prize: {type: Number, required: true},
    entryFee: {type: Number, required: true},
    matchInitTime: {type: String},
    matchStartTime: {type: String},
    matchEndTime: {type: String},
    player2: {type: String},
    player1: {type: String},
    winner: {type: String},
})

const GameModel = new mongoose.model("games", gameSchema);
const MatchModel = new mongoose.model("matches", matchSchema);
const RealtimeRoomModel = new mongoose.model("realtime-rooms", realtimeRoomSchema);
const AllMatchesHistoryModel = new mongoose.model("all-matches-history", allMatchesHistory);

module.exports = {
    GameModel, MatchModel, RealtimeRoomModel, AllMatchesHistoryModel
}