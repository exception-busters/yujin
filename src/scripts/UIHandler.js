// UIHandler.js
import { io } from 'https://cdn.socket.io/4.7.5/socket.io.esm.min.js';

export default class UIHandler {
    constructor(socket, audioManager) {
        this.socket = socket;
        this.audioManager = audioManager; // audioManager 저장
        this.isHost = false;
        this.players = [];
        this.currentRoomId = null;
        this.selectedRoomId = null;
        this.isEditingRoomSettings = false;
        this.currentRoom = null;
        this.availableRooms = {};

        // DOM Elements (from main.js)
        this.nicknameElement = document.getElementById('nickname');
        this.menuContainer = document.getElementById('menu-container');
        this.mainMenuButtons = document.getElementById('main-menu-buttons');
        this.trainingMultiMenu = document.getElementById('training-multi-menu');
        this.multiplayerOptions = document.getElementById('multiplayer-options');
        this.createRoomModal = document.getElementById('create-room-modal');
        this.privateRoomCheckbox = document.getElementById('private-room-checkbox');
        this.passwordGroup = document.getElementById('password-group');
        this.mapSelectButton = document.getElementById('map-select-button');
        this.mapOptions = document.getElementById('map-options');
        this.selectedMapDisplay = document.getElementById('selected-map-display');
        this.createRoomFinalButton = document.getElementById('create-room-final-button');
        this.closeCreateRoomModalButton = document.getElementById('close-create-room-modal');
        this.mapOptionItems = document.querySelectorAll('.map-option-item');
        this.waitingRoomContainer = document.getElementById('waiting-room-container');
        this.playerList = document.getElementById('player-list');
        this.readyButton = document.getElementById('ready-button');
        this.leaveRoomButton = document.getElementById('leave-room-button');
        this.startButton = document.getElementById('start-button');
        this.notReadyModal = document.getElementById('not-ready-modal');
        this.notReadyOkButton = document.getElementById('not-ready-ok-button');
        this.roomSettingsButton = document.getElementById('room-settings-button');
        this.mapNotSelectedModal = document.getElementById('map-not-selected-modal');
        this.mapNotSelectedOkButton = document.getElementById('map-not-selected-ok-button');
        this.passwordNotEnteredModal = document.getElementById('password-not-entered-modal');
        this.passwordNotEnteredOkButton = document.getElementById('password-not-entered-ok-button');
        this.incorrectPasswordModal = document.getElementById('incorrect-password-modal');
        this.incorrectPasswordOkButton = document.getElementById('incorrect-password-ok-button');
        this.privateRoomPasswordModal = document.getElementById('private-room-password-modal');
        this.closePrivateRoomPasswordModalButton = document.getElementById('close-private-room-password-modal');
        this.privateRoomPasswordInput = document.getElementById('private-room-password-input');
        this.privateRoomPasswordOkButton = document.getElementById('private-room-password-ok-button');
        this.currentMenuTitle = document.getElementById('current-menu-title');
        this.joinRoomModal = document.getElementById('join-room-modal');
        this.closeJoinRoomModalButton = document.getElementById('close-join-room-modal');
        this.roomListContainer = document.getElementById('room-list');
        this.refreshRoomListButton = document.getElementById('refresh-room-list');
        this.joinSelectedRoomButton = document.getElementById('join-selected-room-button');
        this.joinRoomIdInput = document.getElementById('join-room-id');
        this.joinRoomPasswordInput = document.getElementById('join-room-password');
        this.waitingRoomMap = document.getElementById('waiting-room-map');
        this.waitingRoomMode = document.getElementById('waiting-room-mode');

        // Option Menu DOM Elements
        this.optionMenu = document.getElementById('option-menu');
        this.audioButton = document.getElementById('audio-button');
        this.audioSettingsModal = document.getElementById('audio-settings-modal');
        this.closeAudioSettingsModalButton = document.getElementById('close-audio-settings-modal');
        this.micSelect = document.getElementById('mic-select');
        this.micTestButton = document.getElementById('mic-test-button');
        this.micSensitivitySlider = document.getElementById('mic-sensitivity');
        this.micTestWindow = document.getElementById('mic-test-window');
        this.closeMicTestWindowButton = document.getElementById('close-mic-test-window');
        this.totalPowerBar = document.getElementById('total-power-bar');
        this.lowPowerBar = document.getElementById('low-power-bar');
        this.highPowerBar = document.getElementById('high-power-bar');
        this.lobbyBgmVolumeSlider = document.getElementById('lobby-bgm-volume');
        this.lobbyBgmVolumeValue = document.getElementById('lobby-bgm-volume-value');
        this.micSensitivityValue = document.getElementById('mic-sensitivity-value');
    }

    initializeUI() {
        this.generateRandomNickname();
        this.setupEventListeners();
        this.selectedMapDisplay.textContent = 'No map selected';
        this.resizeGameViewport();
        window.addEventListener('resize', this.resizeGameViewport.bind(this));
    }

    generateRandomNickname() {
        const adjectives = ['Swift', 'Crazy', 'Lazy', 'Racing', 'Flying'];
        const nouns = ['Lion', 'Tiger', 'Eagle', 'Shark', 'Wolf'];
        const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)];
        const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
        this.nicknameElement.textContent = `${randomAdjective}${randomNoun}`;
    }

    setupEventListeners() {
        this.getById('start-game').addEventListener('click', this.handleStartGameClick.bind(this));
        this.getById('training-button').addEventListener('click', this.handleTrainingClick.bind(this));
        this.getById('multi-button').addEventListener('click', this.handleMultiClick.bind(this));
        this.getById('create-room-button').addEventListener('click', this.handleCreateRoomClick.bind(this));
        this.getById('join-room-button').addEventListener('click', this.handleJoinRoomClick.bind(this));
        this.getById('back-to-main-menu').addEventListener('click', this.handleBackToMainMenuClick.bind(this));
        this.privateRoomCheckbox.addEventListener('change', this.handlePrivateRoomChange.bind(this));
        this.mapSelectButton.addEventListener('click', this.handleMapSelectClick.bind(this));
        this.mapOptionItems.forEach(item => item.addEventListener('click', this.handleMapOptionClick.bind(this)));
        document.addEventListener('click', this.handleDocumentClick.bind(this));
        this.createRoomFinalButton.addEventListener('click', this.handleCreateRoomFinalClick.bind(this));
        this.closeCreateRoomModalButton.addEventListener('click', this.handleCloseCreateRoomModalClick.bind(this));
        this.readyButton.addEventListener('click', this.handleReadyButtonClick.bind(this));
        this.leaveRoomButton.addEventListener('click', this.handleLeaveRoomClick.bind(this));
        this.startButton.addEventListener('click', this.handleStartButtonClick.bind(this));
        this.notReadyOkButton.addEventListener('click', this.handleNotReadyOkClick.bind(this));
        this.mapNotSelectedOkButton.addEventListener('click', this.handleMapNotSelectedOkClick.bind(this));
        this.passwordNotEnteredOkButton.addEventListener('click', this.handlePasswordNotEnteredOkClick.bind(this));
        this.roomSettingsButton.addEventListener('click', this.handleRoomSettingsClick.bind(this));
        this.playerList.addEventListener('click', this.handlePlayerListClick.bind(this));
        this.closeJoinRoomModalButton.addEventListener('click', this.handleCloseJoinRoomModalClick.bind(this));
        this.refreshRoomListButton.addEventListener('click', this.handleRefreshRoomListClick.bind(this));
        this.joinSelectedRoomButton.addEventListener('click', this.handleJoinSelectedRoomClick.bind(this));
        this.roomListContainer.addEventListener('click', this.handleRoomListItemClick.bind(this));
        this.roomListContainer.addEventListener('dblclick', this.handleRoomListItemDoubleClick.bind(this));
        this.incorrectPasswordOkButton.addEventListener('click', () => this.incorrectPasswordModal.classList.add('hidden'));
        this.closePrivateRoomPasswordModalButton.addEventListener('click', () => {
            this.privateRoomPasswordModal.classList.add('hidden');
            this.privateRoomPasswordInput.value = '';
        });
        this.privateRoomPasswordOkButton.addEventListener('click', this.handlePrivateRoomPasswordOkClick.bind(this));

        // Option Menu Event Listeners
        this.getById('option').addEventListener('click', this.handleOptionClick.bind(this));
        this.getById('back-to-main-menu-from-option').addEventListener('click', this.handleBackToMainMenuClick.bind(this));
        this.audioButton.addEventListener('click', this.handleAudioButtonClick.bind(this));
        this.closeAudioSettingsModalButton.addEventListener('click', this.handleCloseAudioSettingsModal.bind(this));
        this.micSelect.addEventListener('change', this.handleMicSelectChange.bind(this));
        this.micSensitivitySlider.addEventListener('input', this.handleMicSensitivityChange.bind(this));
        this.closeMicTestWindowButton.addEventListener('click', this.handleCloseMicTestWindow.bind(this));
        this.lobbyBgmVolumeSlider.addEventListener('input', this.handleLobbyBgmVolumeChange.bind(this));
    }

    getById(id) {
        return document.getElementById(id);
    }

    // --- Event Handlers ---
    handleStartGameClick() {
        console.log('Start Game button clicked');
        this.mainMenuButtons.classList.add('hidden');
        this.trainingMultiMenu.classList.remove('hidden');
        this.currentMenuTitle.textContent = 'Start Game';
        this.currentMenuTitle.classList.remove('hidden');
    }

    handleTrainingClick() {
        console.log('Training button clicked');
        alert('Training 모드는 아직 구현되지 않았습니다.');
    }

    handleMultiClick() {
        console.log('Multi button clicked');
        this.multiplayerOptions.classList.toggle('hidden');
    }

    handleCreateRoomClick() {
        console.log('Create Room button clicked');
        this.multiplayerOptions.classList.add('hidden');
        this.createRoomModal.classList.remove('hidden');
        this.getById('room-title').value = '';
        this.privateRoomCheckbox.checked = false;
        this.passwordGroup.classList.add('hidden');
        this.getById('room-password').value = '';
        this.getById('personal-match').checked = true;
        this.selectedMapDisplay.textContent = 'No map selected';
    }

    handleJoinRoomClick() {
        console.log('Join Room button clicked');
        this.multiplayerOptions.classList.add('hidden');
        this.joinRoomModal.classList.remove('hidden');
        this.joinRoomPasswordInput.value = '';
        this.socket.emit('listRooms');
    }

    handleBackToMainMenuClick() {
        console.log('Back button clicked');
        this.trainingMultiMenu.classList.add('hidden');
        this.optionMenu.classList.add('hidden');
        this.mainMenuButtons.classList.remove('hidden');
        this.multiplayerOptions.classList.add('hidden');
        this.mapOptions.classList.add('hidden');
        this.currentMenuTitle.classList.add('hidden');
        this.currentMenuTitle.textContent = '';
    }

    handlePrivateRoomChange() {
        this.passwordGroup.classList.toggle('hidden', !this.privateRoomCheckbox.checked);
    }

    handleMapSelectClick(event) {
        event.stopPropagation();
        this.mapOptions.classList.toggle('hidden');
    }

    handleMapOptionClick(event) {
        const mapName = event.currentTarget.dataset.mapName;
        this.selectedMapDisplay.textContent = mapName;
        this.mapOptions.classList.add('hidden');
    }

    handleDocumentClick(event) {
        if (!this.mapSelectButton.contains(event.target) && !this.mapOptions.contains(event.target)) {
            this.mapOptions.classList.add('hidden');
        }
    }

    handleCreateRoomFinalClick() {
        let roomTitle = this.getById('room-title').value || 'My Room';
        if (roomTitle.length > 20) {
            roomTitle = roomTitle.substring(0, 20);
        }
        const isPrivate = this.privateRoomCheckbox.checked;
        const gameMode = document.querySelector('input[name="game-mode"]:checked').value;
        const selectedMap = this.selectedMapDisplay.textContent;
        const roomPassword = this.getById('room-password').value;
        const nickname = this.nicknameElement.textContent;

        if (selectedMap === 'No map selected') {
            this.mapNotSelectedModal.classList.remove('hidden');
            return;
        }

        if (isPrivate && roomPassword.length === 0) {
            this.passwordNotEnteredModal.classList.remove('hidden');
            return;
        }

        const roomData = {
            roomTitle,
            maxPlayers: 8,
            isPrivate,
            password: roomPassword,
            mode: gameMode,
            track: selectedMap,
            nickname
        };

        if (this.isEditingRoomSettings) {
            roomData.roomId = this.currentRoomId;
            this.socket.emit('updateRoomSettings', roomData);
        } else {
            this.socket.emit('createRoom', roomData);
        }

        this.createRoomModal.classList.add('hidden');
        this.mapOptions.classList.add('hidden');
    }

    handleCloseCreateRoomModalClick() {
        console.log('Close Create Room Modal button clicked');
        this.createRoomModal.classList.add('hidden');
        this.mapOptions.classList.add('hidden');
        this.isEditingRoomSettings = false;
    }

    handleReadyButtonClick() {
        const isReady = this.readyButton.textContent !== 'Ready';
        this.socket.emit('ready', { roomId: this.currentRoomId, isReady: !isReady });
    }

    handleLeaveRoomClick() {
        if (this.currentRoomId) {
            this.socket.emit('leaveRoom', this.currentRoomId);
            this.currentRoomId = null;
            this.isHost = false;
            this.waitingRoomContainer.classList.add('hidden');
            this.mainMenuButtons.classList.remove('hidden');
            this.menuContainer.classList.remove('hidden');
        }
    }

    handleStartButtonClick() {
        console.log('handleStartButtonClick called.');
        const allReady = this.players.every(p => p.isHost || p.isReady);

        if (!this.isHost) {
            console.log('Game cannot be started: User is not host.');
            alert('방장만 게임을 시작할 수 있습니다.');
            return;
        }

        if (this.players.length <= 1) {
            console.log('Game cannot be started: Not enough players.');
            alert('대기실에 최소 2명의 플레이어가 있어야 게임이 시작됩니다!');
        } else if (!allReady) {
            console.log('Game cannot be started: Not all players are ready.');
            this.notReadyModal.classList.remove('hidden');
        } else {
            console.log('All players are ready and current user is host. Starting game...');
            window.location.href = 'game.html';
            this.socket.emit('startGame', this.currentRoomId);
        }
    }

    handleNotReadyOkClick() {
        this.notReadyModal.classList.add('hidden');
    }

    handleMapNotSelectedOkClick() {
        this.mapNotSelectedModal.classList.add('hidden');
    }

    handlePasswordNotEnteredOkClick() {
        this.passwordNotEnteredModal.classList.add('hidden');
    }

    handleRoomSettingsClick() {
        if (!this.isHost) {
            alert('방장만 방 설정을 수정할 수 있습니다.');
            return;
        }
        const modalTitle = this.createRoomModal.querySelector('h2');
        const finalButton = this.createRoomModal.querySelector('#create-room-final-button');
        modalTitle.textContent = 'Room Information';
        finalButton.textContent = 'Save Changes';
        this.isEditingRoomSettings = true;

        this.getById('room-title').value = this.currentRoom.title;
        this.privateRoomCheckbox.checked = this.currentRoom.isPrivate;
        this.getById('room-password').value = this.currentRoom.password || '';
        this.selectedMapDisplay.textContent = this.currentRoom.track;
        this.getById(this.currentRoom.mode === 'personal' ? 'personal-match' : 'team-match').checked = true;
        this.passwordGroup.classList.toggle('hidden', !this.currentRoom.isPrivate);
        this.createRoomModal.classList.remove('hidden');
    }

    handlePlayerListClick(event) {
        if (event.target.classList.contains('btn-kick')) {
            const playerIdToKick = event.target.dataset.playerId;
            if (this.isHost && this.currentRoomId) {
                this.socket.emit('kickPlayer', { roomId: this.currentRoomId, playerIdToKick });
            } else {
                alert('방장만 플레이어를 강퇴할 수 있습니다.');
            }
        }
    }

    handleCloseJoinRoomModalClick() {
        this.joinRoomModal.classList.add('hidden');
        this.selectedRoomId = null;
        this.joinRoomIdInput.value = '';
        this.joinRoomPasswordInput.value = '';
    }

    handleRefreshRoomListClick() {
        this.socket.emit('listRooms');
    }

    handleRoomListItemClick(event) {
        const roomItem = event.target.closest('.room-item');
        if (roomItem) {
            document.querySelectorAll('.room-item').forEach(item => item.classList.remove('selected'));
            roomItem.classList.add('selected');
            this.selectedRoomId = roomItem.dataset.roomId;
            this.joinRoomIdInput.value = this.selectedRoomId;
        }
    }

    handleRoomListItemDoubleClick(event) {
        const roomItem = event.target.closest('.room-item');
        if (roomItem) {
            this.selectedRoomId = roomItem.dataset.roomId;
            const room = this.availableRooms[this.selectedRoomId];
            if (room && room.isPrivate) {
                this.privateRoomPasswordModal.classList.remove('hidden');
                this.privateRoomPasswordInput.focus();
            } else {
                this.handleJoinSelectedRoomClick();
            }
        }
    }

    handlePrivateRoomPasswordOkClick() {
        const roomIdToJoin = this.selectedRoomId;
        const passwordToJoin = this.privateRoomPasswordInput.value.trim();
        const nickname = this.nicknameElement.textContent;
        if (!passwordToJoin) {
            alert('비밀번호를 입력해주세요.');
            return;
        }
        this.socket.emit('joinRoom', { roomId: roomIdToJoin, password: passwordToJoin, nickname });
        this.privateRoomPasswordModal.classList.add('hidden');
        this.privateRoomPasswordInput.value = '';
    }

    handleJoinSelectedRoomClick() {
        const roomIdToJoin = this.joinRoomIdInput.value.trim();
        const passwordToJoin = this.joinRoomPasswordInput.value.trim();
        const nickname = this.nicknameElement.textContent;
        if (!roomIdToJoin) {
            alert('방을 선택하거나 Room ID를 입력해주세요.');
            return;
        }
        this.socket.emit('joinRoom', { roomId: roomIdToJoin, password: passwordToJoin, nickname });
    }

    handleOptionClick() {
        console.log('Option button clicked');
        this.mainMenuButtons.classList.add('hidden');
        this.optionMenu.classList.remove('hidden');
        this.currentMenuTitle.textContent = 'Option';
        this.currentMenuTitle.classList.remove('hidden');
    }

    handleAudioButtonClick() {
        console.log('Audio button clicked');
        this.optionMenu.classList.add('hidden');
        this.audioSettingsModal.classList.remove('hidden');
        this.audioSettingsModal.style.pointerEvents = 'auto';
        this.audioSettingsModal.style.opacity = '1';
        console.log('Audio settings modal opened, ensuring interactivity');
        this.audioManager.populateMicDevices();
    }

    handleCloseAudioSettingsModal() {
        this.audioSettingsModal.classList.add('hidden');
        this.optionMenu.classList.remove('hidden');
        this.audioManager.stopMicTest();
        console.log('Audio settings modal closed');
    }

    handleMicSelectChange() {
        this.audioManager.handleMicSelectChange();
    }

    handleMicTestButtonClick(event) {
        event.stopPropagation();
        this.audioManager.handleMicTestButtonClick(event);
    }

    handleMicSensitivityChange() {
        this.audioManager.handleMicSensitivityChange();
    }

    handleCloseMicTestWindow(event) {
        this.audioManager.handleCloseMicTestWindow(event);
    }

    handleLobbyBgmVolumeChange() {
        this.audioManager.handleLobbyBgmVolumeChange();
    }

    // --- Utility Functions ---
    setupWaitingRoom(room) {
        console.log('Setting up waiting room:', room);
        if (!this.waitingRoomMap || !this.waitingRoomMode) {
            console.error('waitingRoomMap or waitingRoomMode is not defined:', { waitingRoomMap: this.waitingRoomMap, waitingRoomMode: this.waitingRoomMode });
            return;
        }
        this.currentRoom = room;
        this.isHost = (this.socket.id === room.hostId);
        this.getById('waiting-room-title').textContent = room.title;
        this.waitingRoomMap.textContent = `Map: ${room.track}`;
        this.waitingRoomMode.textContent = `Mode: ${room.mode === 'personal' ? 'Personal' : 'Team'}`;
        const privateIndicator = this.getById('waiting-room-private-indicator');
        privateIndicator.style.display = room.isPrivate ? 'block' : 'none';
        this.playerList.className = 'player-list';
        this.playerList.classList.add(room.mode === 'team' ? 'team-layout' : 'personal-layout');
        this.players = room.players;
        this.renderPlayerList(room.mode);
        this.readyButton.classList.toggle('hidden', this.isHost);
        this.startButton.classList.toggle('hidden', !this.isHost);
        this.roomSettingsButton.classList.toggle('hidden', !this.isHost);
        this.mainMenuButtons.classList.add('hidden');
        this.trainingMultiMenu.classList.add('hidden');
        this.menuContainer.classList.add('hidden');
        this.waitingRoomContainer.classList.remove('hidden');
        this.waitingRoomContainer.style.display = 'flex';
        console.log('waiting-room-container display:', this.waitingRoomContainer.style.display);
        void this.waitingRoomContainer.offsetWidth;
    }

    renderPlayerList(mode) {
        this.playerList.innerHTML = '';
        if (mode === 'personal') {
            for (let i = 0; i < 8; i++) {
                const player = this.players[i];
                const playerSlot = document.createElement('div');
                playerSlot.className = 'player-slot';
                playerSlot.innerHTML = player ? this.createPlayerCardHTML(player) : '<div class="player-card empty-slot"><p>Empty</p></div>';
                this.playerList.appendChild(playerSlot);
            }
        } else {
            for (let i = 0; i < 4; i++) {
                const teamSlot = document.createElement('div');
                teamSlot.className = 'team-slot';
                const player1 = this.players[i * 2];
                const player2 = this.players[i * 2 + 1];
                const p1Wrapper = document.createElement('div');
                p1Wrapper.className = 'player-wrapper';
                p1Wrapper.innerHTML = player1 ? this.createPlayerCardHTML(player1) : '<div class="player-card empty-slot"><p>Empty</p></div>';
                teamSlot.appendChild(p1Wrapper);
                const p2Wrapper = document.createElement('div');
                p2Wrapper.className = 'player-wrapper';
                p2Wrapper.innerHTML = player2 ? this.createPlayerCardHTML(player2) : '<div class="player-card empty-slot"><p>Empty</p></div>';
                teamSlot.appendChild(p2Wrapper);
                this.playerList.appendChild(teamSlot);
            }
        }
    }

    createPlayerCardHTML(player) {
        const statusContent = player.isHost
            ? '<span class="player-status host-status">Host</span>'
            : `<span class="player-status ${player.isReady ? 'ready' : ''}">${player.isReady ? 'Ready' : 'Not Ready'}</span>`;
        return `
            <div class="player-card">
                <img src="${player.profilePic}" alt="Profile Pic" class="player-profile-pic">
                <div class="player-info">
                    <span class="player-nickname">${player.nickname}</span>
                    ${statusContent}
                </div>
            </div>
            ${this.isHost && !player.isHost ? `<button class="btn btn-kick" data-player-id="${player.id}">X</button>` : ''}
        `;
    }

    renderRoomList(rooms) {
        this.roomListContainer.innerHTML = '';
        if (Object.keys(rooms).length === 0) {
            this.roomListContainer.innerHTML = '<p class="no-rooms-message">방이 없습니다. 방을 만들어 보세요!</p>';
            return;
        }
        for (const roomId in rooms) {
            const room = rooms[roomId];
            const roomItem = document.createElement('div');
            roomItem.classList.add('room-item');
            roomItem.dataset.roomId = room.id;
            const privateTag = room.isPrivate ? '<span class="room-item-private">비공개</span>' : '';
            const gameModeText = room.mode === 'personal' ? '개인 매치' : '팀 매치';
            roomItem.innerHTML = `
                <div class="room-item-info">
                    <div class="room-item-title">${room.title} ${privateTag}</div>
                    <div class="room-item-details">맵: ${room.track} | 모드: ${gameModeText}</div>
                </div>
                <div class="room-item-players">${room.players.length}/${room.maxPlayers}</div>
            `;
            this.roomListContainer.appendChild(roomItem);
        }
    }

    resizeGameViewport() {
        const viewport = this.getById('game-viewport');
        const designWidth = 1920;
        const designHeight = 1080;
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        const scale = Math.min(windowWidth / designWidth, windowHeight / designHeight);
        viewport.style.transform = `translate(-50%, -50%) scale(${scale})`;
        viewport.style.width = `${designWidth}px`;
        viewport.style.height = `${designHeight}px`;
    }
}