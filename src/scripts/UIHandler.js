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
        this.noiseGateToggle = document.getElementById('noise-gate-toggle');
        this.noiseGateIntensitySlider = document.getElementById('noise-gate-intensity');
        this.noiseGateIntensityValue = document.getElementById('noise-gate-intensity-value');

        // Graphic Settings DOM Elements
        this.graphicButton = document.getElementById('graphic-button');
        this.graphicSettings = document.getElementById('graphic-settings');
        this.graphicQualityRadios = document.querySelectorAll('input[name="graphic-quality"]');

        // Main Menu Buttons for hover sound
        this.mainMenuButtonsList = document.querySelectorAll('#main-menu-buttons .btn-primary');

        // Other button groups for hover sound
        this.trainingMultiButtons = document.querySelectorAll('#training-multi-menu button');
        this.optionMenuButtons = document.querySelectorAll('#option-menu button');
        this.waitingRoomButtons = document.querySelectorAll('#waiting-room-container button');
        this.modalButtons = document.querySelectorAll('.modal-content button, .modal-content input[type="radio"], .modal-content input[type="checkbox"], .modal-content .map-option-item');

        // All clickable elements for click sound
        this.allClickableElements = document.querySelectorAll(
            '#main-menu-buttons button,'
            + '#training-multi-menu button,'
            + '#option-menu button,'
            + '#waiting-room-container button,'
            + '.modal-content button,'
            + '.modal-content input[type="radio"],'
            + '.modal-content input[type="checkbox"],'
            + '.modal-content .map-option-item,'
            + '.room-item' // Add room items for click sound
        );
    }

    initializeUI() {
        this.generateRandomNickname();
        this.setupEventListeners();

        // UI 요소가 존재하는 경우에만 설정 (로비에서만)
        if (this.selectedMapDisplay) {
            this.selectedMapDisplay.textContent = 'No map selected';
        }

        this.resizeGameViewport();
        window.addEventListener('resize', this.resizeGameViewport.bind(this));

        // 노이즈 게이트 초기 상태 설정 (UI 요소가 존재하는 경우에만)
        if (this.noiseGateToggle) {
            this.noiseGateToggle.checked = localStorage.getItem('noiseGateEnabled') === 'true';
        }
        if (this.noiseGateIntensitySlider) {
            this.noiseGateIntensitySlider.value = localStorage.getItem('noiseGateIntensity') || -45;
        }
        if (this.noiseGateIntensityValue) {
            this.noiseGateIntensityValue.textContent = `${this.noiseGateIntensitySlider?.value || -45} dB`;
        }

        // 그래픽 품질 초기 상태 설정 (UI 요소가 존재하는 경우에만)
        if (this.graphicQualityRadios && this.graphicQualityRadios.length > 0) {
            const savedQuality = localStorage.getItem('graphicQuality') || 'medium';
            this.graphicQualityRadios.forEach(radio => {
                if (radio.value === savedQuality) {
                    radio.checked = true;
                }
            });
        }
    }

    generateRandomNickname() {
        const adjectives = ['Swift', 'Crazy', 'Lazy', 'Racing', 'Flying'];
        const nouns = ['Lion', 'Tiger', 'Eagle', 'Shark', 'Wolf'];
        const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)];
        const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];

        // 닉네임 요소가 존재하는 경우에만 설정 (로비에서만)
        if (this.nicknameElement) {
            this.nicknameElement.textContent = `${randomAdjective}${randomNoun}`;
        }
    }

    setupEventListeners() {
        console.log('🔧 UIHandler 이벤트 리스너 설정 시작');

        // UI 요소가 존재하는 경우에만 이벤트 리스너 추가 (로비에서만)
        const startGameBtn = this.getById('start-game');
        if (startGameBtn) {
            startGameBtn.addEventListener('click', this.handleStartGameClick.bind(this));
            console.log('✅ Start Game 버튼 이벤트 리스너 설정 완료');
        } else {
            console.log('❌ Start Game 버튼을 찾을 수 없음');
        }

        const trainingBtn = this.getById('training-button');
        if (trainingBtn) trainingBtn.addEventListener('click', this.handleTrainingClick.bind(this));

        const multiBtn = this.getById('multi-button');
        if (multiBtn) multiBtn.addEventListener('click', this.handleMultiClick.bind(this));

        const createRoomBtn = this.getById('create-room-button');
        if (createRoomBtn) createRoomBtn.addEventListener('click', this.handleCreateRoomClick.bind(this));

        const joinRoomBtn = this.getById('join-room-button');
        if (joinRoomBtn) joinRoomBtn.addEventListener('click', this.handleJoinRoomClick.bind(this));

        const backToMainBtn = this.getById('back-to-main-menu');
        if (backToMainBtn) backToMainBtn.addEventListener('click', this.handleBackToMainMenuClick.bind(this));

        if (this.privateRoomCheckbox) {
            this.privateRoomCheckbox.addEventListener('change', this.handlePrivateRoomChange.bind(this));
        }

        if (this.mapSelectButton) {
            this.mapSelectButton.addEventListener('click', this.handleMapSelectClick.bind(this));
        }

        if (this.mapOptionItems && this.mapOptionItems.length > 0) {
            this.mapOptionItems.forEach(item => item.addEventListener('click', this.handleMapOptionClick.bind(this)));
        }
        document.addEventListener('click', this.handleDocumentClick.bind(this));

        if (this.createRoomFinalButton) {
            this.createRoomFinalButton.addEventListener('click', this.handleCreateRoomFinalClick.bind(this));
        }
        if (this.closeCreateRoomModalButton) {
            this.closeCreateRoomModalButton.addEventListener('click', this.handleCloseCreateRoomModalClick.bind(this));
        }
        if (this.readyButton) {
            this.readyButton.addEventListener('click', this.handleReadyButtonClick.bind(this));
        }
        if (this.leaveRoomButton) {
            this.leaveRoomButton.addEventListener('click', this.handleLeaveRoomClick.bind(this));
        }
        if (this.startButton) {
            this.startButton.addEventListener('click', this.handleStartButtonClick.bind(this));
        }
        if (this.notReadyOkButton) {
            this.notReadyOkButton.addEventListener('click', this.handleNotReadyOkClick.bind(this));
        }
        if (this.mapNotSelectedOkButton) {
            this.mapNotSelectedOkButton.addEventListener('click', this.handleMapNotSelectedOkClick.bind(this));
        }
        if (this.passwordNotEnteredOkButton) {
            this.passwordNotEnteredOkButton.addEventListener('click', this.handlePasswordNotEnteredOkClick.bind(this));
        }
        if (this.roomSettingsButton) {
            this.roomSettingsButton.addEventListener('click', this.handleRoomSettingsClick.bind(this));
        }
        if (this.playerList) {
            this.playerList.addEventListener('click', this.handlePlayerListClick.bind(this));
        }
        if (this.closeJoinRoomModalButton) {
            this.closeJoinRoomModalButton.addEventListener('click', this.handleCloseJoinRoomModalClick.bind(this));
        }
        if (this.refreshRoomListButton) {
            this.refreshRoomListButton.addEventListener('click', this.handleRefreshRoomListClick.bind(this));
        }
        if (this.joinSelectedRoomButton) {
            this.joinSelectedRoomButton.addEventListener('click', this.handleJoinSelectedRoomClick.bind(this));
        }
        if (this.roomListContainer) {
            this.roomListContainer.addEventListener('click', this.handleRoomListItemClick.bind(this));
            this.roomListContainer.addEventListener('dblclick', this.handleRoomListItemDoubleClick.bind(this));
        }
        if (this.incorrectPasswordOkButton) {
            this.incorrectPasswordOkButton.addEventListener('click', () => this.incorrectPasswordModal.classList.add('hidden'));
        }
        if (this.closePrivateRoomPasswordModalButton) {
            this.closePrivateRoomPasswordModalButton.addEventListener('click', () => {
                this.privateRoomPasswordModal.classList.add('hidden');
                this.privateRoomPasswordInput.value = '';
            });
        }
        if (this.privateRoomPasswordOkButton) {
            this.privateRoomPasswordOkButton.addEventListener('click', this.handlePrivateRoomPasswordOkClick.bind(this));
        }

        // Option Menu Event Listeners (게임 화면에서는 존재하지 않을 수 있음)
        const optionBtn = this.getById('option');
        if (optionBtn) optionBtn.addEventListener('click', this.handleOptionClick.bind(this));

        const backToMainFromOptionBtn = this.getById('back-to-main-menu-from-option');
        if (backToMainFromOptionBtn) backToMainFromOptionBtn.addEventListener('click', this.handleBackToMainMenuClick.bind(this));

        if (this.audioButton) {
            this.audioButton.addEventListener('click', this.handleAudioButtonClick.bind(this));
        }
        if (this.closeAudioSettingsModalButton) {
            this.closeAudioSettingsModalButton.addEventListener('click', this.handleCloseAudioSettingsModal.bind(this));
        }
        if (this.micSelect) {
            this.micSelect.addEventListener('change', this.handleMicSelectChange.bind(this));
        }
        if (this.micSensitivitySlider) {
            this.micSensitivitySlider.addEventListener('input', this.handleMicSensitivityChange.bind(this));
        }
        if (this.closeMicTestWindowButton) {
            this.closeMicTestWindowButton.addEventListener('click', this.handleCloseMicTestWindow.bind(this));
        }
        if (this.lobbyBgmVolumeSlider) {
            this.lobbyBgmVolumeSlider.addEventListener('input', this.handleLobbyBgmVolumeChange.bind(this));
        }
        if (this.noiseGateToggle) {
            this.noiseGateToggle.addEventListener('change', this.handleNoiseGateToggleChange.bind(this));
        }
        if (this.noiseGateIntensitySlider) {
            this.noiseGateIntensitySlider.addEventListener('input', this.handleNoiseGateIntensityChange.bind(this));
        }
        if (this.graphicButton) {
            this.graphicButton.addEventListener('click', this.handleGraphicButtonClick.bind(this));
        }
        if (this.graphicQualityRadios && this.graphicQualityRadios.length > 0) {
            this.graphicQualityRadios.forEach(radio => {
                radio.addEventListener('change', this.handleGraphicQualityChange.bind(this));
            });
        }

        // Add hover sound to main menu buttons (게임 화면에서는 존재하지 않을 수 있음)
        if (this.mainMenuButtonsList && this.mainMenuButtonsList.length > 0) {
            this.mainMenuButtonsList.forEach(button => {
                button.addEventListener('mouseover', () => this.audioManager.playHoverSound());
            });
        }

        // Add hover sound to other button groups (게임 화면에서는 존재하지 않을 수 있음)
        if (this.trainingMultiButtons && this.trainingMultiButtons.length > 0) {
            this.trainingMultiButtons.forEach(button => {
                button.addEventListener('mouseover', () => this.audioManager.playHoverSound());
            });
        }
        if (this.optionMenuButtons && this.optionMenuButtons.length > 0) {
            this.optionMenuButtons.forEach(button => {
                button.addEventListener('mouseover', () => this.audioManager.playHoverSound());
            });
        }
        if (this.waitingRoomButtons && this.waitingRoomButtons.length > 0) {
            this.waitingRoomButtons.forEach(button => {
                button.addEventListener('mouseover', () => this.audioManager.playHoverSound());
            });
        }
        if (this.modalButtons && this.modalButtons.length > 0) {
            this.modalButtons.forEach(button => {
                button.addEventListener('mouseover', () => this.audioManager.playHoverSound());
            });
        }

        // Add click sound to all clickable elements (게임 화면에서는 존재하지 않을 수 있음)
        if (this.allClickableElements && this.allClickableElements.length > 0) {
            this.allClickableElements.forEach(element => {
                element.addEventListener('click', () => this.audioManager.playClickSound());
            });
        }
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
        // 게임 화면에서는 mapSelectButton과 mapOptions가 존재하지 않을 수 있음
        if (this.mapSelectButton && this.mapOptions) {
            if (!this.mapSelectButton.contains(event.target) && !this.mapOptions.contains(event.target)) {
                this.mapOptions.classList.add('hidden');
            }
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

            // 방장도 URL 파라미터와 함께 게임 페이지로 이동
            const playerId = this.socket.id;
            const nickname = this.nicknameElement ? this.nicknameElement.textContent : 'Host';
            const roomId = this.currentRoomId;

            const url = `game.html?roomId=${roomId}&playerId=${playerId}&nickname=${encodeURIComponent(nickname)}`;
            console.log('Host redirecting to game with URL:', url);

            this.socket.emit('startGame', this.currentRoomId);
            window.location.href = url;
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

    handleNoiseGateToggleChange() {
        this.audioManager.handleNoiseGateToggleChange(this.noiseGateToggle.checked);
        localStorage.setItem('noiseGateEnabled', this.noiseGateToggle.checked);
    }

    handleNoiseGateIntensityChange() {
        this.noiseGateIntensityValue.textContent = `${this.noiseGateIntensitySlider.value} dB`;
        this.audioManager.handleNoiseGateIntensityChange(parseFloat(this.noiseGateIntensitySlider.value));
        localStorage.setItem('noiseGateIntensity', this.noiseGateIntensitySlider.value);
    }

    handleGraphicButtonClick() {
        console.log('Graphic button clicked');
        this.audioSettingsModal.classList.add('hidden');
        this.graphicSettings.classList.remove('hidden');
        // Hide other option menus if any
        // this.generalSettings.classList.add('hidden');
    }

    handleGraphicQualityChange(event) {
        const selectedQuality = event.target.value;
        localStorage.setItem('graphicQuality', selectedQuality);
        console.log('Graphic quality changed to:', selectedQuality);
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
        const designWidth = 1920;
        const designHeight = 1080;
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        const scale = Math.min(windowWidth / designWidth, windowHeight / designHeight);

        // 게임 viewport 스케일링 (게임 화면에서만)
        const viewport = this.getById('game-viewport');
        if (viewport) {
            viewport.style.transform = `translate(-50%, -50%) scale(${scale})`;
            viewport.style.width = `${designWidth}px`;
            viewport.style.height = `${designHeight}px`;
        }

        // 로비 UI 스케일 컨테이너 스케일링 (로비에서만)
        const uiContainer = this.getById('ui-scale-container');
        if (uiContainer) {
            uiContainer.style.transform = `translate(-50%, -50%) scale(${scale})`;
            console.log(`📐 로비 UI 스케일링 적용: ${scale.toFixed(3)}x (${windowWidth}x${windowHeight})`);
        }

        // 게임 UI 반응형 스케일링 (CSS 변수 사용)
        const gameCanvas = document.querySelector('canvas.webgl');
        if (gameCanvas) {
            // 1920x1080 기준으로 스케일 계산
            const designWidth = 1920;
            const designHeight = 1080;
            const uiScale = Math.min(windowWidth / designWidth, windowHeight / designHeight);

            // CSS 변수로 스케일 값 설정
            document.documentElement.style.setProperty('--ui-scale', uiScale);

            console.log(`📐 게임 UI 반응형 스케일링 적용: ${uiScale.toFixed(3)}x (${windowWidth}x${windowHeight})`);
            console.log('🔍 모든 UI 요소가 브라우저 가장자리에 고정되면서 스케일링됩니다');
        }
    }
}