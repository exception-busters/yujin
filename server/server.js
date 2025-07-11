const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const cors = require('cors');

const app = express();
app.use(cors());
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3000;

// Serve static files from the current directory
app.use(express.static(path.join(__dirname, '..')));

let rooms = {}; // Stores active rooms: { roomId: { hostId, players: [{ id, nickname, isReady, isHost }], maxPlayers, isPrivate, password, mode, track } }

io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    // Handle room creation
    socket.on('createRoom', ({ roomTitle, maxPlayers, isPrivate, password, mode, track, nickname }) => {
        // 방 제목 20자 제한 (서버 측 유효성 검사)
        const limitedRoomTitle = roomTitle.length > 20 ? roomTitle.substring(0, 20) : roomTitle;

        const roomId = `room-${Math.random().toString(36).substr(2, 9)}`;
        rooms[roomId] = {
            id: roomId,
            title: limitedRoomTitle,
            hostId: socket.id,
            players: [{ id: socket.id, nickname, isReady: false, isHost: true, profilePic: '/assets/default_Profile.png' }],
            maxPlayers,
            isPrivate,
            password,
            mode, // 'individual' or 'team'
            track
        };
        socket.join(roomId);
        socket.emit('roomCreated', { roomId, room: rooms[roomId] });
        io.to(roomId).emit('roomUpdate', rooms[roomId]);
        console.log(`Room created: ${roomId} by ${nickname}`);
        });

    // Handle room settings update
    socket.on('updateRoomSettings', ({ roomId, roomTitle, isPrivate, password, mode, track }) => {
        console.log(`Received updateRoomSettings for room ${roomId}:`, { roomTitle, isPrivate, password, mode, track });
        const room = rooms[roomId];
        if (room && socket.id === room.hostId) {
            // 방 제목 20자 제한 (서버 측 유효성 검사)
            const limitedRoomTitle = roomTitle.length > 20 ? roomTitle.substring(0, 20) : roomTitle;
            room.title = limitedRoomTitle;
            room.isPrivate = isPrivate;
            room.password = password;
            room.mode = mode;
            room.track = track;
            io.to(roomId).emit('roomUpdate', room);
            io.emit('roomListUpdate', Object.values(rooms)); // Update room list for all clients
            console.log(`Room ${roomId} settings updated by host ${socket.id}. New room state:`, room);
        } else {
            socket.emit('updateRoomSettingsError', 'Only the host can update room settings.');
        }
    });

    socket.on('listRooms', () => {
        socket.emit('roomListUpdate', Object.values(rooms));
    });

    // Handle joining a room
    socket.on('joinRoom', ({ roomId, password, nickname }) => {
        const room = rooms[roomId];
        if (!room) {
            socket.emit('joinRoomError', 'Room not found.');
            return;
        }
        if (room.isPrivate && room.password !== password) {
            socket.emit('joinRoomError', 'Incorrect password.');
            return;
        }
        if (room.players.length >= room.maxPlayers) {
            socket.emit('joinRoomError', 'Room is full.');
            return;
        }

        // Check if player already in room
        if (room.players.some(player => player.id === socket.id)) {
            socket.emit('joinRoomError', 'You are already in this room.');
            return;
        }

        room.players.push({ id: socket.id, nickname, isReady: false, isHost: false, profilePic: '/assets/default_Profile.png' });
        socket.join(roomId);
        socket.emit('roomJoined', { roomId, room: rooms[roomId] });
        io.to(roomId).emit('roomUpdate', rooms[roomId]);
        io.emit('roomListUpdate', Object.values(rooms)); // Notify all clients about room list change
        console.log(`${nickname} joined room: ${roomId}`);
    });

    // Handle player ready status
    socket.on('ready', ({ roomId, isReady }) => {
        const room = rooms[roomId];
        if (room) {
            const player = room.players.find(p => p.id === socket.id);
            if (player) {
                player.isReady = isReady;
                io.to(roomId).emit('roomUpdate', room);
                console.log(`${player.nickname} in room ${roomId} is now ${isReady ? 'ready' : 'not ready'}`);
            }
        }
    });

    // Handle game start (only host can start)
    socket.on('startGame', (roomId) => {
        const room = rooms[roomId];
        if (room && socket.id === room.hostId) {
            // Check if all players are ready (excluding host if host doesn't need to be ready)
            const allReady = room.players.every(p => p.isReady || p.isHost);
            if (allReady && room.players.length > 0) { // Ensure at least one player
                io.to(roomId).emit('gameStarting', roomId); // Notify clients game is starting
                console.log(`Game starting in room: ${roomId}`);
                // In a real game, you'd transition to game scene here
                // For now, we'll just delete the room after a short delay
                setTimeout(() => {
                    io.to(roomId).emit('gameEnded', roomId); // Simulate game end
                    delete rooms[roomId];
                    io.emit('roomListUpdate', Object.values(rooms)); // Notify all clients about room list change
                    console.log(`Room ${roomId} deleted after game.`);
                }, 5000); // Simulate game duration
            } else {
                socket.emit('startGameError', 'Not all players are ready or no players in room.');
            }
        } else {
            socket.emit('startGameError', 'Only the host can start the game.');
        }
    });

    // Handle leaving a room
    socket.on('leaveRoom', (roomId) => {
        const room = rooms[roomId];
        if (room) {
            room.players = room.players.filter(player => player.id !== socket.id);
            socket.leave(roomId);
            if (room.players.length === 0) {
                delete rooms[roomId];
                io.emit('roomListUpdate', Object.values(rooms)); // Notify all clients about room list change
                console.log(`Room ${roomId} deleted as it's empty.`);
            } else {
                // If host leaves, assign new host or delete room
                if (room.hostId === socket.id) {
                    room.hostId = room.players[0] ? room.players[0].id : null;
                    if (room.players[0]) {
                        room.players[0].isHost = true; // Update new host's isHost property
                    }
                    if (!room.hostId) {
                        delete rooms[roomId];
                        io.emit('roomListUpdate', Object.values(rooms));
                        console.log(`Room ${roomId} deleted as host left and no other players.`);
                    }
                }
                io.to(roomId).emit('roomUpdate', room);
                console.log(`${socket.id} left room: ${roomId}`);
            }
        }
    });

    // Handle kicking a player (only host can kick)
    socket.on('kickPlayer', ({ roomId, playerIdToKick }) => {
        const room = rooms[roomId];
        if (room && socket.id === room.hostId) { // Check if kicker is the host
            const kickedPlayerSocket = io.sockets.sockets.get(playerIdToKick);
            if (kickedPlayerSocket) {
                room.players = room.players.filter(player => player.id !== playerIdToKick);
                kickedPlayerSocket.leave(roomId);
                kickedPlayerSocket.emit('youWereKicked', roomId); // Notify kicked player
                io.to(roomId).emit('roomUpdate', room); // Update remaining players
                console.log(`Player ${playerIdToKick} kicked from room ${roomId} by host ${socket.id}`);

                // If the kicked player was the host (shouldn't happen with current UI, but for robustness)
                if (room.hostId === playerIdToKick) {
                    room.hostId = room.players[0] ? room.players[0].id : null;
                    if (room.players[0]) {
                        room.players[0].isHost = true; // Update new host's isHost property
                    }
                    if (!room.hostId) {
                        delete rooms[roomId];
                        io.emit('roomListUpdate', Object.values(rooms));
                        console.log(`Room ${roomId} deleted as host was kicked and no other players.`);
                    }
                }
            }
        } else {
            socket.emit('kickPlayerError', 'Only the host can kick players.');
        }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
        // Remove player from any room they might be in
        for (const roomId in rooms) {
            const room = rooms[roomId];
            const initialPlayerCount = room.players.length;
            room.players = room.players.filter(player => player.id !== socket.id);

            if (room.players.length < initialPlayerCount) { // Player was in this room
                if (room.players.length === 0) {
                    delete rooms[roomId];
                    io.emit('roomListUpdate', Object.values(rooms));
                    console.log(`Room ${roomId} deleted as it's empty after disconnect.`);
                } else {
                    // If host disconnects, assign new host
                    if (room.hostId === socket.id) {
                        room.hostId = room.players[0] ? room.players[0].id : null;
                        if (room.players[0]) {
                            room.players[0].isHost = true; // Update new host's isHost property
                        }
                        if (!room.hostId) {
                            delete rooms[roomId];
                            io.emit('roomListUpdate', Object.values(rooms));
                            console.log(`Room ${roomId} deleted as host disconnected and no other players.`);
                        }
                    }
                    io.to(roomId).emit('roomUpdate', room);
                    console.log(`${socket.id} disconnected from room: ${roomId}`);
                }
            }
        }
    });
});

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});