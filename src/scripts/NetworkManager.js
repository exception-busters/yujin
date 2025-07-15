// NetworkManager.js
import { io } from 'https://cdn.socket.io/4.7.5/socket.io.esm.min.js';

export default class NetworkManager {
    constructor(uiHandler, audioManager) {
        this.socket = io();
        this.uiHandler = uiHandler;
        this.audioManager = audioManager;
        this.setupSocketListeners();
    }

    setupSocketListeners() {
        this.socket.on('roomCreated', (data) => {
            console.log('roomCreated event received:', data);
            this.uiHandler.currentRoomId = data.roomId;
            this.uiHandler.isHost = true;
            try {
                this.uiHandler.setupWaitingRoom(data.room);
                console.log('Waiting room setup initiated for room:', data.room);
            } catch (error) {
                console.error('Error in setupWaitingRoom:', error);
            }
        });

        this.socket.on('roomUpdate', (room) => {
            console.log('Room updated:', room);
            this.uiHandler.setupWaitingRoom(room);
            const myPlayer = room.players.find(p => p.id === this.socket.id);
            if (myPlayer) {
                this.uiHandler.readyButton.textContent = myPlayer.isReady ? 'Unready' : 'Ready';
                this.uiHandler.readyButton.classList.toggle('ready', myPlayer.isReady);
            }
            if (this.uiHandler.isHost) {
                const allPlayersReady = room.players.every(p => p.isHost || p.isReady);
                this.uiHandler.startButton.disabled = !allPlayersReady || room.players.length <= 1;
            }
        });

        this.socket.on('roomJoined', (data) => {
            console.log('Room joined:', data);
            this.uiHandler.currentRoomId = data.roomId;
            this.uiHandler.setupWaitingRoom(data.room);
            this.uiHandler.joinRoomModal.classList.add('hidden');
        });

        this.socket.on('joinRoomError', (message) => {
            console.error('Join room error:', message);
            if (message === 'Incorrect password.') {
                this.uiHandler.incorrectPasswordModal.classList.remove('hidden');
            } else {
                alert(`방 참가 실패: ${message}`);
            }
        });

        this.socket.on('youWereKicked', (roomId) => {
            console.log(`You were kicked from room ${roomId}`);
            alert('방에서 강퇴당했습니다.');
            this.uiHandler.waitingRoomContainer.classList.add('hidden');
            this.uiHandler.mainMenuButtons.classList.remove('hidden');
        });

        this.socket.on('gameStarting', (roomId) => {
            console.log(`Game starting in room: ${roomId}`);
            alert('게임이 곧 시작됩니다!');
            this.uiHandler.waitingRoomContainer.classList.add('hidden');
            this.uiHandler.mainMenuButtons.classList.remove('hidden');
            window.location.href = 'game.html'; // 게임 시작 시 game.html로 이동
        });

        this.socket.on('gameEnded', (roomId) => {
            console.log(`Game ended in room: ${roomId}`);
            alert('게임 종료!');
            this.uiHandler.waitingRoomContainer.classList.add('hidden');
            this.uiHandler.mainMenuButtons.classList.remove('hidden');
        });

        this.socket.on('roomListUpdate', (updatedRooms) => {
            console.log('Room list updated:', updatedRooms);
            this.uiHandler.availableRooms = updatedRooms.reduce((acc, room) => {
                acc[room.id] = room;
                return acc;
            }, {});
            this.uiHandler.renderRoomList(updatedRooms);
        });
    }

    emit(event, data) {
        this.socket.emit(event, data);
    }
}