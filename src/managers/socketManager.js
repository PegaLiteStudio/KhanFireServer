const socketIO = require('socket.io');

let io;
exports.socketConnection = (server) => {
    io = socketIO(server);
    io.on('connection', (socket) => {
        console.log('a device connected');
        console.log(socket.id)

        socket.on('disconnect', () => {
            console.log('a device disconnected');
        });
    });
};
