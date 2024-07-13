const {generateRandomID} = require("../helpers/appHelper");
const {PrimaryUserModel} = require("../models/userModels");
const {insertMatchWinTransaction, insertMatchRefundTransaction} = require("./transactionManager");
const {RealtimeRoomModel, AllMatchesHistoryModel} = require("../models/contestModel");
const {getIndianTime} = require("./timeManager");

class LudoGame {
    #HOME_POSITIONS;
    #TURNING_POSITIONS;
    #START_POSITIONS;
    #CONTINUE_POSITIONS;
    #BASE_POSITIONS;
    #PLAYER_PIECES;
    #SAFE_POSITIONS;
    #HOME_ENTRANCE;
    #timeout;
    #matchExpireTimeOut;
    #MATCH;

    constructor(roomId, initTime, match) {
        this.#MATCH = match;
        this.DICE_THROW_ASK_TIMEOUT = 12000;
        this.MATCH_EXPIRE_TIMEOUT = 30000;
        this.roomId = roomId;
        this.initTime = initTime;
        this.startTime = null;
        this.players = {};
        this.playersReady = [];
        this.playersByTurn = {};
        this.#HOME_POSITIONS = {
            player1: "58", player2: "64"
        };
        this.#TURNING_POSITIONS = {
            player1: "51", player2: "25"
        };
        this.#START_POSITIONS = {
            player1: "1", player2: "27"
        };
        this.#CONTINUE_POSITIONS = {
            player2: "52"
        };
        this.#BASE_POSITIONS = {
            player1: ["player1_position_1", "player1_position_2", "player1_position_3", "player1_position_4"],
            player2: ["player2_position_1", "player2_position_2", "player2_position_3", "player2_position_4"]
        };
        this.#PLAYER_PIECES = {
            player1: ["player1_piece_1", "player1_piece_2", "player1_piece_3", "player1_piece_4"],
            player2: ["player2_piece_1", "player2_piece_2", "player2_piece_3", "player2_piece_4"]
        };
        this.#SAFE_POSITIONS = ["1", "9", "9", "14", "22", "27", "35", "40", "48",];
        this.#HOME_ENTRANCE = {
            player1: ["53", "54", "55", "56", "57"], player2: ["59", "60", "61", "62", "63"]
        };
        this.pieces = {
            "player1_piece_1": {
                position: "player1_position_1"
            }, "player1_piece_2": {
                position: "player1_position_2"
            }, "player1_piece_3": {
                position: "player1_position_3"
            }, "player1_piece_4": {
                position: "player1_position_4"
            }, "player2_piece_1": {
                position: "player2_position_1"
            }, "player2_piece_2": {
                position: "player2_position_2"
            }, "player2_piece_3": {
                position: "player2_position_3"
            }, "player2_piece_4": {
                position: "player2_position_4"
            },
        };
        this.TURN = 0;
        this.state = 0;// 0 -> Not Started; 1 -> Playing; 2 -> End (Win!);
        this.#timeout = null;
        this.#matchExpireTimeOut = null;
        this.diceNumber = null;
        this.responseCode = generateRandomID();
    }

    startMath() {
        if (this.state === 1) {
            return;
        }
        this.state = 1;
        this.startMatchExpire();
        console.log("Match Started")
        this.checkForDiceRoll("1")
    }

    startMatchExpire() {
        if (this.#matchExpireTimeOut) {
            clearTimeout(this.#matchExpireTimeOut);
            this.#matchExpireTimeOut = null;
        }
        this.#matchExpireTimeOut = setTimeout(async () => {
            await this.cancelMatch();
        }, this.MATCH_EXPIRE_TIMEOUT);
    }

    async cancelMatch() {
        console.log("Match Cancelled");
        this.state = 2;
        this.publishUpdate("match-cancelled", this.generateResponseCode());
        await PrimaryUserModel.updateOne({number : this.playersByTurn[0]}, {$inc: {gBalance: this.#MATCH.entryFee}});
        await PrimaryUserModel.updateOne({number : this.playersByTurn[1]}, {$inc: {gBalance: this.#MATCH.entryFee}});
        await insertMatchRefundTransaction(this.playersByTurn[0], this.#MATCH.entryFee, this.roomId);
        await insertMatchRefundTransaction(this.playersByTurn[1], this.#MATCH.entryFee, this.roomId);
        await RealtimeRoomModel.deleteOne({roomID: this.roomId});
        let match = new AllMatchesHistoryModel({
            matchID: this.#MATCH.matchID,
            gameID: this.#MATCH.gameID,
            roomID: this.roomId,
            matchName: this.#MATCH.matchName,
            prize: this.#MATCH.prize,
            entryFee: this.#MATCH.entryFee,
            matchInitTime: this.initTime,
            matchStartTime: this.startTime,
            matchEndTime: getIndianTime(),
            player1: this.playersByTurn[0],
            player2: this.playersByTurn[1],
            winner: "null"
        })
        await match.save();
        if (matches.hasOwnProperty(this.roomId)) {
            delete matches[this.roomId];
        }
        this.cleanup();
    }

    matchUpdate(...args) {
        this.startMatchExpire();
        let msg = args[1];
        let responseCode = args[2];
        if (responseCode !== this.responseCode) {
            return;
        }
        if (msg === "dice-throw") {
            this.onDiceRoll(args[3], responseCode); // Number & Response Code
        } else if (msg === "piece-move") {
            this.onPieceMove(args[3], args[4]); // Piece ID & new Position
        } else if (msg === "piece-increment") {
            this.onPieceIncrement(args[3]); // Piece ID & new Position
        }
        console.log(msg)
    }

    generateResponseCode() {
        this.responseCode = generateRandomID();
        return this.responseCode;
    }

    getPlayerIndex(playerNumber) {
        return this.players[playerNumber].index;
    }

    getPiecesOfPlayer(index) {
        return Object.keys(this.pieces)
            .filter(pieceKey => pieceKey.startsWith(index))
            .reduce((result, pieceKey) => {
                result[pieceKey] = this.pieces[pieceKey];
                return result;
            }, {});
    }

    getPlayer(playerNumber) {
        return this.players[playerNumber];
    }

    getPlayerByPiece(pieceID) {
        let player1 = this.players[Object.keys(this.players)[0]];
        console.log(pieceID.split("_")[0])
        return player1.index === pieceID.split("_")[0] ? player1 : this.players[Object.keys(this.players)[1]];
    }

    getPieceByID(pieceID) {
        return this.pieces[pieceID]
    }

    flipDiceTurn() {
        if (this.TURN === 0) {
            this.TURN = 1;
            return;
        }
        this.TURN = 0;
    }

    clearTurnTimeout() {
        if (this.#timeout) {
            clearTimeout(this.#timeout);
            this.#timeout = null;
        }
    }


    checkForDiceRoll(from) {
        if (this.state === 2) {
            return;
        }
        this.clearTurnTimeout();
        console.log(from, "Current Turn", this.TURN, "Number", this.playersByTurn[this.TURN]);

        this.publishUpdate("ask-throw-dice", this.generateResponseCode(), this.playersByTurn[this.TURN], this.TURN)
        this.#timeout = setTimeout(() => {
            this.flipDiceTurn();
            this.checkForDiceRoll("2");
        }, this.DICE_THROW_ASK_TIMEOUT);
    }

    publishUpdate(...args) {
        console.log("Publish Update", ...args)
        io.to(connectedUsers[this.playersReady[0]]).emit(this.roomId, ...args);
        io.to(connectedUsers[this.playersReady[1]]).emit(this.roomId, ...args);
    }

    /**
     * Player must contain
     * playerNumber
     * */
    onDiceRoll(playerNumber, responseCode) {
        if (this.responseCode !== responseCode) {
            return;
        }
        this.clearTurnTimeout();
        this.diceNumber = this.generateDiceNumber(playerNumber);
        let currentTurn = this.TURN;
        if (this.diceNumber !== 6) {
            this.flipDiceTurn();
        }
        console.log(currentTurn + " :)")
        let player = this.getPlayer(playerNumber);
        console.log("d", this.diceNumber)
        let eligiblePieces = this.getEligiblePieces(player, this.diceNumber);
        console.log(eligiblePieces)
        if (eligiblePieces.length === 1 && !this.#BASE_POSITIONS[player.index].includes(eligiblePieces[0].position)) {
            this.publishUpdate("dice-rolled-inc", this.generateResponseCode(), currentTurn, this.diceNumber, eligiblePieces[0].id)
            this.incrementPosition(player, eligiblePieces[0]);
            return;
        }
        this.publishUpdate("dice-rolled", this.generateResponseCode(), currentTurn, this.diceNumber)
        if (eligiblePieces.length === 0) {
            if (this.diceNumber === 6) {
                this.flipDiceTurn();
            }
            this.checkForDiceRoll("3");
            return;
        }
        this.#timeout = setTimeout(() => {
            this.checkForDiceRoll("4");
        }, 7000);
    }

    incrementPosition(player, piece) {
        for (let i = 0; i < this.diceNumber; i++) {
            if (this.#TURNING_POSITIONS[player.index] === piece.position) {
                this.pieces[piece.id].position = this.#HOME_ENTRANCE[player.index][0];
            } else if (this.#CONTINUE_POSITIONS.hasOwnProperty(player.index) && this.#CONTINUE_POSITIONS[player.index] === piece.position) {
                this.pieces[piece.id].position = "1";
            } else {
                this.pieces[piece.id].position = String(Number(this.pieces[piece.id].position) + 1);
            }
        }
        this.checkForEvents(piece, player);
        setTimeout(() => {
            this.checkForDiceRoll("5");
        }, 1000);
    }

    checkForEvents(piece, player) {
        if (this.#SAFE_POSITIONS.includes(piece.position)) {
            return;
        }
        if (this.#HOME_POSITIONS[player.index] === piece.position) {
            let samePieces = this.getPiecesByPositionAndPlayer(piece.position, player.index);
            if (Object.keys(samePieces).length === 4) {
                setTimeout(async () => {
                    await this.onPlayerWin(player.index);
                }, 1000);
                return
            }
            this.TURN = player.turn;
            return;
        }
        let pieces = this.getPiecesByPositionAndPlayer(piece.position, player.index === "player1" ? "player2" : "player1");
        if (Object.keys(pieces).length === 1) {
            let pieceID = Object.keys(pieces)[0];
            this.TURN = player.turn;
            this.pieces[pieceID].position = pieceID.replace("piece", "position");
            console.log("Piece Killed ", pieceID)
        }
    }

    async onPlayerWin(player) {
        this.state = 2;
        this.publishUpdate("player-win", this.generateResponseCode(), player);
        let number = this.#MATCH[player];
        await PrimaryUserModel.updateOne({number}, {$inc: {wBalance: this.#MATCH.prize}});
        await insertMatchWinTransaction(number, this.#MATCH.prize, this.roomId);
        await RealtimeRoomModel.deleteOne({roomID: this.roomId});
        let match = new AllMatchesHistoryModel({
            matchID: this.#MATCH.matchID,
            gameID: this.#MATCH.gameID,
            roomID: this.roomId,
            matchName: this.#MATCH.matchName,
            prize: this.#MATCH.prize,
            entryFee: this.#MATCH.entryFee,
            matchInitTime: this.initTime,
            matchStartTime: this.startTime,
            matchEndTime: getIndianTime(),
            player1: this.playersByTurn[0],
            player2: this.playersByTurn[1],
            winner: player
        })
        await match.save();
        if (matches.hasOwnProperty(this.roomId)) {
            delete matches[this.roomId];
        }
        this.cleanup();
    }

    cleanup() {
        // Clear any remaining timeouts
        this.clearTurnTimeout();

        // Reset or release other resources if necessary
        this.players = {};
        this.playersReady = [];
        this.playersByTurn = {};
        this.pieces = {};
        console.log("Cleanup Complete");
    }

    onPieceMove(pieceID, position) {
        this.pieces[pieceID].position = position;
        this.publishUpdate("move-piece", this.generateResponseCode(), pieceID, position)
        this.checkForDiceRoll("6");
    }

    onPieceIncrement(pieceID) {
        console.log(pieceID, this.getPlayerByPiece(pieceID));
        this.incrementPosition(this.getPlayerByPiece(pieceID), this.getPieceByID(pieceID))
        this.publishUpdate("increment-piece", this.generateResponseCode(), pieceID, this.diceNumber)
    }

    getEligiblePieces(player, dice) {
        let pieces = [];
        let playerIndex = player.index;
        for (let i = 1; i <= 4; i++) {
            let pieceID = playerIndex + "_piece_" + i;
            let piece = this.getPieceByID(pieceID);
            if (this.#HOME_POSITIONS[playerIndex] === piece.position) {
                continue;
            }
            if (this.#BASE_POSITIONS[playerIndex].includes(piece.position) && dice !== 6) {
                continue;
            }
            if (this.#HOME_ENTRANCE[playerIndex].includes(piece.position) && dice > (Number(this.#HOME_POSITIONS[playerIndex]) - Number(piece.position))) {
                continue;
            }
            piece.id = pieceID;
            pieces.push(piece);
        }
        return pieces;
    }

    generateDiceNumber(playerNumber) {
        let diceExcludeList = this.getDiceExcludeList(playerNumber);
        console.log(diceExcludeList);
        let validNumbers = [];
        for (let i = 1; i <= 6; i++) {
            if (!diceExcludeList.includes(i)) {
                validNumbers.push(i);
            }
        }
        console.log(validNumbers);
        return validNumbers[Math.floor(Math.random() * validNumbers.length)];
    }

    getDiceExcludeList(playerNumber) {
        let excludeList = [];
        let playerIndex = this.getPlayerIndex(playerNumber);
        let pieces = this.getPiecesOfPlayer(playerIndex);
        Object.entries(pieces).forEach(([pieceKey, pieceValue]) => {
            console.log("ok", pieceValue, pieceKey)
            if (this.#BASE_POSITIONS[playerIndex].includes(pieceValue.position) || this.#HOME_POSITIONS[playerIndex] === pieceValue.position || this.#HOME_ENTRANCE[playerIndex].includes(pieceValue.position)) {
                console.log(pieceKey, pieceValue)
                return;
            }
            for (let i = 1; i < 7; i++) {
                let pos = pieceValue.position;
                if (playerIndex === "player2" && Number(pos) + i > 52) {
                    pos = String((Number(pos) + i) - 52);
                } else {
                    pos = String(Number(pos) + i);
                }
                let playerPieces = this.getPiecesByPositionAndPlayer(pos, playerIndex);
                if (Object.keys(playerPieces).length !== 0 && !excludeList.includes(i)) {
                    excludeList.push(i);
                }
            }
        });
        return excludeList;
    }

    getPiecesByPositionAndPlayer(pos, index) {
        return Object.keys(this.pieces)
            .filter(pieceKey => this.pieces[pieceKey].position === pos && pieceKey.startsWith(index))
            .reduce((result, pieceKey) => {
                result[pieceKey] = this.pieces[pieceKey];
                return result;
            }, {});
    }

    addPlayer(playerNumber, playerIndex) {
        if (this.players.hasOwnProperty(playerNumber)) {
            return;
        }
        let turn = playerIndex === "player1" ? 0 : 1;
        this.playersByTurn[turn] = playerNumber;
        this.players[playerNumber] = {
            index: playerIndex, turn
        };
    }

    isReadyToInit() {
        return Object.keys(this.players).length === 2;
    }

    playerReady(playerNumber) {
        if (this.playersReady.includes(playerNumber) && this.isReadyToStart() && this.state === 1) {
            this.onReconnect(playerNumber);
            return
        }
        this.playersReady.push(playerNumber);
    }

    isReadyToStart() {
        return this.playersReady.length === 2;
    }

    onReconnect(playerNumber) {
        console.log(this.pieces);
        io.to(connectedUsers[playerNumber]).emit(this.roomId, "onReConnect", this.pieces);
    }

}

module.exports = LudoGame;
