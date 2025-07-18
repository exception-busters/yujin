const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
app.use(express.static(path.join(__dirname, 'public')));
app.use('/node_modules', express.static('node_modules'));
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 3000;

// Serve static files from the current directory
app.use(express.static(path.join(__dirname, '..')));

// 게임 상태 관리
let rooms = {}; // 로비 방 정보
const gameRooms = {}; // 게임 룸 정보 { roomId: { players: Map, gameStarted: boolean } }
const carColors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff, 0x00ffff, 0xffffff, 0x808080];

io.on('connection', (socket) => {
    console.log(`🔗 User connected: ${socket.id}`);

    // 자동차 상태 업데이트 이벤트
    socket.on('carUpdate', ({ roomId, playerId, position, quaternion, velocity }) => {
        if (gameRooms[roomId] && gameRooms[roomId].players.has(playerId)) {
            // 서버에서 플레이어 상태 업데이트
            const player = gameRooms[roomId].players.get(playerId);
            player.position = position;
            player.quaternion = quaternion;
            if (velocity) {
                player.velocity = velocity;
            }
            player.lastUpdate = Date.now();
            
            // 같은 방의 다른 플레이어들에게만 전송 (자신 제외)
            socket.to(roomId).emit('carUpdate', { playerId, position, quaternion, velocity });
        }
    });

    // 방 생성
    socket.on('createRoom', ({ roomTitle, maxPlayers, isPrivate, password, mode, track, nickname }) => {
        const limitedRoomTitle = roomTitle.length > 20 ? roomTitle.substring(0, 20) : roomTitle;

        const roomId = `room-${Math.random().toString(36).substring(2, 9)}`;
        rooms[roomId] = {
            id: roomId,
            title: limitedRoomTitle,
            hostId: socket.id,
            players: [{ id: socket.id, nickname, isReady: false, isHost: true, profilePic: '/assets/default_Profile.png' }],
            maxPlayers,
            isPrivate,
            password,
            mode,
            track
        };
        socket.join(roomId);
        socket.emit('roomCreated', { roomId, room: rooms[roomId] });
        io.to(roomId).emit('roomUpdate', rooms[roomId]);
        io.emit('roomListUpdate', Object.values(rooms));
        console.log(`📋 Room created: ${roomId} by ${nickname}`);
    });

    // 방 설정 업데이트
    socket.on('updateRoomSettings', ({ roomId, roomTitle, isPrivate, password, mode, track }) => {
        const room = rooms[roomId];
        if (room && socket.id === room.hostId) {
            const limitedRoomTitle = roomTitle.length > 20 ? roomTitle.substring(0, 20) : roomTitle;
            room.title = limitedRoomTitle;
            room.isPrivate = isPrivate;
            room.password = password;
            room.mode = mode;
            room.track = track;
            io.to(roomId).emit('roomUpdate', room);
            io.emit('roomListUpdate', Object.values(rooms));
            console.log(`⚙️ Room ${roomId} settings updated by host ${socket.id}`);
        } else {
            socket.emit('updateRoomSettingsError', 'Only the host can update room settings.');
        }
    });

    socket.on('listRooms', () => {
        socket.emit('roomListUpdate', Object.values(rooms));
    });

    // 방 참여
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
        if (room.players.some(player => player.id === socket.id)) {
            socket.emit('joinRoomError', 'You are already in this room.');
            return;
        }
        room.players.push({ id: socket.id, nickname, isReady: false, isHost: false, profilePic: '/assets/default_Profile.png' });
        socket.join(roomId);
        socket.roomId = roomId;
        socket.emit('roomJoined', { roomId, room: rooms[roomId] });
        io.to(roomId).emit('roomUpdate', rooms[roomId]);
        io.emit('roomListUpdate', Object.values(rooms));
        console.log(`👤 ${nickname} joined room: ${roomId}`);
    });

    // 플레이어 준비 상태
    socket.on('ready', ({ roomId, isReady }) => {
        const room = rooms[roomId];
        if (room) {
            const player = room.players.find(p => p.id === socket.id);
            if (player) {
                player.isReady = isReady;
                io.to(roomId).emit('roomUpdate', room);
                console.log(`✅ ${player.nickname} in room ${roomId} is now ${isReady ? 'ready' : 'not ready'}`);
            }
        }
    });

    // 게임 참여 - 멀티플레이어 자동차 게임
    socket.on('joinGame', ({ roomId, playerId, nickname }) => {
        socket.join(roomId);
        socket.data = { roomId, playerId };
        console.log(`🎮 ${nickname}(${playerId}) joined game room ${roomId}`);

        // 게임 룸 초기화
        if (!gameRooms[roomId]) {
            gameRooms[roomId] = {
                players: new Map(),
                gameStarted: false,
                allPlayersReady: false
            };
        }

        // 차량 겹침 방지를 위한 스폰 위치 계산
        const playerCount = gameRooms[roomId].players.size;
        const spacing = 8; // 차량 간 간격
        const rows = Math.ceil(Math.sqrt(playerCount + 1));
        const cols = Math.ceil((playerCount + 1) / rows);
        
        const row = Math.floor(playerCount / cols);
        const col = playerCount % cols;
        
        const initialX = (col - cols / 2) * spacing;
        const initialZ = (row - rows / 2) * spacing;
        const initialPosition = { x: initialX, y: 4, z: initialZ };
        const initialQuaternion = { x: 0, y: 0, z: 0, w: 1 };

        // 플레이어 정보 저장
        const playerData = {
            playerId,
            nickname,
            position: initialPosition,
            quaternion: initialQuaternion,
            velocity: { x: 0, y: 0, z: 0 },
            color: carColors[playerCount % carColors.length],
            isReady: false,
            lastUpdate: Date.now()
        };

        gameRooms[roomId].players.set(playerId, playerData);

        // 기존 플레이어들 정보를 새 플레이어에게 전송
        const existingPlayers = {};
        gameRooms[roomId].players.forEach((player, id) => {
            existingPlayers[id] = {
                playerId: id,
                nickname: player.nickname,
                position: player.position,
                quaternion: player.quaternion,
                velocity: player.velocity,
                color: player.color
            };
        });
        socket.emit('existingPlayers', existingPlayers);

        // 다른 플레이어들에게 새 플레이어 알림
        socket.to(roomId).emit('newPlayer', {
            playerId,
            nickname,
            position: initialPosition,
            quaternion: initialQuaternion,
            velocity: { x: 0, y: 0, z: 0 },
            color: carColors[playerCount % carColors.length]
        });

        console.log(`🚗 Player ${playerId} spawned at position:`, initialPosition);

        // 플레이어 준비 완료 처리
        setTimeout(() => {
            if (gameRooms[roomId] && gameRooms[roomId].players.has(playerId)) {
                gameRooms[roomId].players.get(playerId).isReady = true;
                console.log(`✅ Player ${playerId} is ready in game room ${roomId}`);
                
                // 모든 플레이어가 준비되었는지 확인
                const allReady = Array.from(gameRooms[roomId].players.values()).every(player => player.isReady);
                
                if (allReady && gameRooms[roomId].players.size > 1 && !gameRooms[roomId].gameStarted) {
                    gameRooms[roomId].allPlayersReady = true;
                    console.log(`🏁 All players ready in room ${roomId}, starting countdown`);
                    
                    // 카운트다운 시작
                    io.to(roomId).emit('startCountdown');
                    
                    // 6초 후 게임 시작
                    setTimeout(() => {
                        if (gameRooms[roomId]) {
                            gameRooms[roomId].gameStarted = true;
                            io.to(roomId).emit('gameStart');
                            console.log(`🚀 Game started in room ${roomId}`);
                        }
                    }, 6000);
                }
            }
        }, 1000); // 1초 후 자동으로 준비 완료
    });

    // 게임 시작 (호스트만 가능)
    socket.on('startGame', (roomId) => {
        const room = rooms[roomId];
        if (room && socket.id === room.hostId) {
            const allReady = room.players.every(p => p.isReady || p.isHost);
            if (allReady && room.players.length > 1) {
                io.to(roomId).emit('gameStarting', roomId);
                console.log(`🎮 Game starting in room: ${roomId}`);

                // 5초 후 게임 종료 및 방 삭제 (테스트용)
                setTimeout(() => {
                    io.to(roomId).emit('gameEnded', roomId);
                    delete rooms[roomId];
                    io.emit('roomListUpdate', Object.values(rooms));
                    console.log(`🏁 Room ${roomId} deleted after game`);
                }, 300000); // 5분 후 자동 종료
            } else {
                socket.emit('startGameError', 'Not all players are ready or no players in room.');
            }
        } else {
            socket.emit('startGameError', 'Only the host can start the game.');
        }
    });

    // 방 나가기
    socket.on('leaveRoom', (roomId) => {
        const room = rooms[roomId];
        if (room) {
            room.players = room.players.filter(player => player.id !== socket.id);
            socket.leave(roomId);
            if (room.players.length === 0) {
                delete rooms[roomId];
                io.emit('roomListUpdate', Object.values(rooms));
                console.log(`🗑️ Room ${roomId} deleted as it's empty`);
            } else {
                if (room.hostId === socket.id) {
                    room.hostId = room.players[0] ? room.players[0].id : null;
                    if (room.players[0]) {
                        room.players[0].isHost = true;
                    }
                    if (!room.hostId) {
                        delete rooms[roomId];
                        io.emit('roomListUpdate', Object.values(rooms));
                        console.log(`🗑️ Room ${roomId} deleted as host left and no other players`);
                    }
                }
                io.to(roomId).emit('roomUpdate', room);
                console.log(`👋 ${socket.id} left room: ${roomId}`);
            }
        }
    });

    // 강제 퇴장 (호스트만 가능)
    socket.on('kickPlayer', ({ roomId, playerIdToKick }) => {
        const room = rooms[roomId];
        if (room && socket.id === room.hostId) {
            const kickedPlayerSocket = io.sockets.sockets.get(playerIdToKick);
            if (kickedPlayerSocket) {
                room.players = room.players.filter(player => player.id !== playerIdToKick);
                kickedPlayerSocket.leave(roomId);
                kickedPlayerSocket.emit('youWereKicked', roomId);
                io.to(roomId).emit('roomUpdate', room);
                console.log(`👢 Player ${playerIdToKick} kicked from room ${roomId} by host ${socket.id}`);

                if (room.hostId === playerIdToKick) {
                    room.hostId = room.players[0] ? room.players[0].id : null;
                    if (room.players[0]) {
                        room.players[0].isHost = true;
                    }
                    if (!room.hostId) {
                        delete rooms[roomId];
                        io.emit('roomListUpdate', Object.values(rooms));
                        console.log(`🗑️ Room ${roomId} deleted as host was kicked and no other players`);
                    }
                }
            }
        } else {
            socket.emit('kickPlayerError', 'Only the host can kick players.');
        }
    });

    // 연결 끊김 처리
    socket.on('disconnect', () => {
        console.log(`🔌 User disconnected: ${socket.id}`);

        // 게임 중인 플레이어 제거
        if (socket.data && socket.data.roomId && socket.data.playerId) {
            const roomId = socket.data.roomId;
            const playerId = socket.data.playerId;
            
            if (gameRooms[roomId] && gameRooms[roomId].players.has(playerId)) {
                gameRooms[roomId].players.delete(playerId);
                io.to(roomId).emit('playerLeft', playerId);
                console.log(`🚗 Player ${playerId} left game in room ${roomId}`);
                
                if (gameRooms[roomId].players.size === 0) {
                    delete gameRooms[roomId];
                    console.log(`🗑️ Game room ${roomId} deleted as it's empty`);
                }
            }
        }

        // 로비 플레이어 제거
        for (const roomId in rooms) {
            const room = rooms[roomId];
            const initialPlayerCount = room.players.length;
            room.players = room.players.filter(player => player.id !== socket.id);

            if (room.players.length < initialPlayerCount) {
                if (room.players.length === 0) {
                    delete rooms[roomId];
                    io.emit('roomListUpdate', Object.values(rooms));
                    console.log(`🗑️ Room ${roomId} deleted as it's empty after disconnect`);
                } else {
                    if (room.hostId === socket.id) {
                        room.hostId = room.players[0] ? room.players[0].id : null;
                        if (room.players[0]) {
                            room.players[0].isHost = true;
                        }
                        if (!room.hostId) {
                            delete rooms[roomId];
                            io.emit('roomListUpdate', Object.values(rooms));
                            console.log(`🗑️ Room ${roomId} deleted as host disconnected and no other players`);
                        }
                    }
                    io.to(roomId).emit('roomUpdate', room);
                    console.log(`👋 ${socket.id} disconnected from room: ${roomId}`);
                }
            }
        }
    });
});

// 주기적으로 비활성 플레이어 정리 (5분 이상 업데이트 없음)
setInterval(() => {
    const now = Date.now();
    const timeout = 5 * 60 * 1000; // 5분

    for (const roomId in gameRooms) {
        const room = gameRooms[roomId];
        const playersToRemove = [];

        room.players.forEach((player, playerId) => {
            if (now - player.lastUpdate > timeout) {
                playersToRemove.push(playerId);
            }
        });

        playersToRemove.forEach(playerId => {
            room.players.delete(playerId);
            io.to(roomId).emit('playerLeft', playerId);
            console.log(`🧹 Removed inactive player ${playerId} from room ${roomId}`);
        });

        if (room.players.size === 0) {
            delete gameRooms[roomId];
            console.log(`🧹 Cleaned up empty game room ${roomId}`);
        }
    }
}, 60000); // 1분마다 실행

server.listen(PORT, () => {
    console.log(`🚀 멀티플레이어 자동차 게임 서버가 포트 ${PORT}에서 실행 중입니다.`);
    console.log(`🌐 http://localhost:${PORT} 에서 접속 가능합니다.`);
});