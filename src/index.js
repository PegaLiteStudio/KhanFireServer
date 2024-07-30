require('dotenv').config();

const express = require('express')
const app = express()

const http = require('http');
const socketIO = require('socket.io');

const compression = require('compression');
const server = http.createServer(app);
const io = socketIO(server, {
    pingInterval: 5000, // Send ping every 5 seconds
    pingTimeout: 5000, // Disconnect if no pong received within 5 seconds
});

global.io = io;

const appRoute = require('./routes/appRoutes')
const contestRoute = require('./routes/contestRoutes')
const userRoute = require('./routes/userRoutes')
const adminRoute = require('./routes/adminRoutes')
const superAdminRoute = require('./routes/superAdminRoutes')
const databaseManager = require("./managers/databaseManager");
const admin = require("firebase-admin");
const {loadDefaults} = require("./controllers/app/appService");

global.connectedUsers = {};

app.use(express.json())
app.use(express.urlencoded({extended: true}))
app.use(compression({
    level: 6, threshold: 0
}));

app.use('/app', appRoute);
app.use('/contest', contestRoute);
app.use('/user', userRoute);
app.use('/admin', adminRoute);
app.use('/superAdmin', superAdminRoute);

app.use(function (req, res) {
    return res.status(404).send({status: false, message: "Path Not Found"})
});


const serviceAccount = require("../key/khanfire-key.json");
const {
    playerReady,
    playerReadyFinal,
    matchUpdate,
    showGameStatus,
    onReconnect
} = require("./controllers/contest/matchController");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

io.on('connection', (socket) => {

    // Store connected users
    const {number} = socket.handshake.query;
    if (number) {
        connectedUsers[number] = socket.id;
    }

    socket.on('disconnect', () => {
        if (number && connectedUsers[number]) {
            if (connectedUsers[number] === socket.id) {
                delete connectedUsers[number];
            }
        }
    });

    // Event listeners
    socket.on('player-ready', (roomID, playerNumber) => {
        playerReady(roomID, playerNumber, socket);
    });

    socket.on('reConnect', (roomID, playerNumber) => {
        onReconnect(roomID, playerNumber);
    });

    socket.on('match-response', async (...args) => {
        await matchUpdate(...args);
    });

    socket.on('show', (roomID) => {
        showGameStatus(roomID);
    });

    socket.on('player-ready-final', (roomID, playerNumber) => {
        playerReadyFinal(roomID, playerNumber);
    });
});
const port = process.env.PORT || 3000;
server.listen(port, async () => {
    databaseManager.connect();
    await loadDefaults();
    console.log("Server running on Port " + port);
});
