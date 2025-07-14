import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { io } from 'https://cdn.socket.io/4.7.5/socket.io.esm.min.js';

const socket = io();

// --- DOM Elements ---
const nicknameElement = document.getElementById('nickname');
const menuContainer = document.getElementById('menu-container');
const mainMenuButtons = document.getElementById('main-menu-buttons');
const trainingMultiMenu = document.getElementById('training-multi-menu');
const multiplayerOptions = document.getElementById('multiplayer-options');
const createRoomModal = document.getElementById('create-room-modal');
const privateRoomCheckbox = document.getElementById('private-room-checkbox');
const passwordGroup = document.getElementById('password-group');
const mapSelectButton = document.getElementById('map-select-button');
const mapOptions = document.getElementById('map-options');
const selectedMapDisplay = document.getElementById('selected-map-display');
const createRoomFinalButton = document.getElementById('create-room-final-button');
const closeCreateRoomModalButton = document.getElementById('close-create-room-modal');
const mapOptionItems = document.querySelectorAll('.map-option-item');
const waitingRoomContainer = document.getElementById('waiting-room-container');
const playerList = document.getElementById('player-list');
const readyButton = document.getElementById('ready-button');
const leaveRoomButton = document.getElementById('leave-room-button');
const startButton = document.getElementById('start-button');
const notReadyModal = document.getElementById('not-ready-modal');
const notReadyOkButton = document.getElementById('not-ready-ok-button');
const roomSettingsButton = document.getElementById('room-settings-button');
const mapNotSelectedModal = document.getElementById('map-not-selected-modal');
const mapNotSelectedOkButton = document.getElementById('map-not-selected-ok-button');
const passwordNotEnteredModal = document.getElementById('password-not-entered-modal');
const passwordNotEnteredOkButton = document.getElementById('password-not-entered-ok-button');
const incorrectPasswordModal = document.getElementById('incorrect-password-modal');
const incorrectPasswordOkButton = document.getElementById('incorrect-password-ok-button');
const privateRoomPasswordModal = document.getElementById('private-room-password-modal');
const closePrivateRoomPasswordModalButton = document.getElementById('close-private-room-password-modal');
const privateRoomPasswordInput = document.getElementById('private-room-password-input');
const privateRoomPasswordOkButton = document.getElementById('private-room-password-ok-button');
const currentMenuTitle = document.getElementById('current-menu-title');
const joinRoomModal = document.getElementById('join-room-modal');
const closeJoinRoomModalButton = document.getElementById('close-join-room-modal');
const roomListContainer = document.getElementById('room-list');
const refreshRoomListButton = document.getElementById('refresh-room-list');
const joinSelectedRoomButton = document.getElementById('join-selected-room-button');
const joinRoomIdInput = document.getElementById('join-room-id');
const joinRoomPasswordInput = document.getElementById('join-room-password');
const waitingRoomMap = document.getElementById('waiting-room-map');
const waitingRoomMode = document.getElementById('waiting-room-mode');

// --- Option Menu DOM Elements ---
const optionMenu = document.getElementById('option-menu');
const audioButton = document.getElementById('audio-button');
const audioSettingsModal = document.getElementById('audio-settings-modal');
const closeAudioSettingsModalButton = document.getElementById('close-audio-settings-modal');
const micSelect = document.getElementById('mic-select');
const micTestButton = document.getElementById('mic-test-button');
const micSensitivitySlider = document.getElementById('mic-sensitivity');
const micTestWindow = document.getElementById('mic-test-window');
const closeMicTestWindowButton = document.getElementById('close-mic-test-window');
const totalPowerBar = document.getElementById('total-power-bar');
const lowPowerBar = document.getElementById('low-power-bar');
const highPowerBar = document.getElementById('high-power-bar');

// --- Global Variables ---
let isHost = false;
let players = [];
let currentRoomId = null;
let selectedRoomId = null;
let isEditingRoomSettings = false;
let currentRoom = null;
let availableRooms = {};
let audioContext = null;
let microphoneStream = null;
let analyserNode = null;
let isTesting = false;
let sensitivity = 1.0;
let lobbyBgm = document.getElementById('lobby-bgm');
let volumeSettings = {
  lobbyBgm: parseFloat(localStorage.getItem('lobbyBgmVolume')) || 0.5 // 기본 볼륨 0.5
};

// --- Initialization ---
document.addEventListener('DOMContentLoaded', initializeGame);

function initializeGame() {
  generateRandomNickname();
  setupThreeJSScene();
  setupEventListeners();
  setupOptionEventListeners();
  selectedMapDisplay.textContent = 'No map selected';
  resizeGameViewport();
  initializeAudio(); // 오디오 초기화 추가
  window.addEventListener('resize', resizeGameViewport);
}

function generateRandomNickname() {
    const adjectives = ['Swift', 'Crazy', 'Lazy', 'Racing', 'Flying'];
    const nouns = ['Lion', 'Tiger', 'Eagle', 'Shark', 'Wolf'];
    const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
    nicknameElement.textContent = `${randomAdjective}${randomNoun}`;
}

function setupThreeJSScene() {
    console.log('Cannon.js loaded:', CANNON);
    if (CANNON.RaycastVehicle) {
        console.log('RaycastVehicle is available.');
    } else {
        console.error('RaycastVehicle is not available in Cannon.js');
    }

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ canvas: document.querySelector('#bg') });

    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    camera.position.z = 5;

    const starGeometry = new THREE.BufferGeometry();
    const starMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 0.02 });
    const starVertices = [];
    for (let i = 0; i < 10000; i++) {
        const x = (Math.random() - 0.5) * 2000;
        const y = (Math.random() - 0.5) * 2000;
        const z = (Math.random() - 0.5) * 2000;
        starVertices.push(x, y, z);
    }
    starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
    const stars = new THREE.Points(starGeometry, starMaterial);
    scene.add(stars);

    function animate() {
        requestAnimationFrame(animate);
        stars.rotation.x += 0.0001;
        stars.rotation.y += 0.0001;
        renderer.render(scene, camera);
    }
    animate();

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
}

function setupEventListeners() {
    document.getElementById('start-game').addEventListener('click', handleStartGameClick);
    document.getElementById('training-button').addEventListener('click', handleTrainingClick);
    document.getElementById('multi-button').addEventListener('click', handleMultiClick);
    document.getElementById('create-room-button').addEventListener('click', handleCreateRoomClick);
    document.getElementById('join-room-button').addEventListener('click', handleJoinRoomClick);
    document.getElementById('back-to-main-menu').addEventListener('click', handleBackToMainMenuClick);
    privateRoomCheckbox.addEventListener('change', handlePrivateRoomChange);
    mapSelectButton.addEventListener('click', handleMapSelectClick);
    mapOptionItems.forEach(item => item.addEventListener('click', handleMapOptionClick));
    document.addEventListener('click', handleDocumentClick);
    createRoomFinalButton.addEventListener('click', handleCreateRoomFinalClick);
    closeCreateRoomModalButton.addEventListener('click', handleCloseCreateRoomModalClick);
    readyButton.addEventListener('click', handleReadyButtonClick);
    leaveRoomButton.addEventListener('click', handleLeaveRoomClick);
    startButton.addEventListener('click', handleStartButtonClick);
    notReadyOkButton.addEventListener('click', handleNotReadyOkClick);
    mapNotSelectedOkButton.addEventListener('click', handleMapNotSelectedOkClick);
    passwordNotEnteredOkButton.addEventListener('click', handlePasswordNotEnteredOkClick);
    roomSettingsButton.addEventListener('click', handleRoomSettingsClick);
    playerList.addEventListener('click', handlePlayerListClick);
    closeJoinRoomModalButton.addEventListener('click', handleCloseJoinRoomModalClick);
    refreshRoomListButton.addEventListener('click', handleRefreshRoomListClick);
    joinSelectedRoomButton.addEventListener('click', handleJoinSelectedRoomClick);
    roomListContainer.addEventListener('click', handleRoomListItemClick);
    roomListContainer.addEventListener('dblclick', handleRoomListItemDoubleClick);
    incorrectPasswordOkButton.addEventListener('click', () => incorrectPasswordModal.classList.add('hidden'));
    closePrivateRoomPasswordModalButton.addEventListener('click', () => {
        privateRoomPasswordModal.classList.add('hidden');
        privateRoomPasswordInput.value = '';
    });
    privateRoomPasswordOkButton.addEventListener('click', () => {
        const roomIdToJoin = selectedRoomId;
        const passwordToJoin = privateRoomPasswordInput.value.trim();
        const nickname = nicknameElement.textContent;
        if (!passwordToJoin) {
            alert('비밀번호를 입력해주세요.');
            return;
        }
        socket.emit('joinRoom', { roomId: roomIdToJoin, password: passwordToJoin, nickname });
        privateRoomPasswordModal.classList.add('hidden');
        privateRoomPasswordInput.value = '';
    });
}

function setupOptionEventListeners() {
  document.getElementById('option').addEventListener('click', handleOptionClick);
  document.getElementById('back-to-main-menu-from-option').addEventListener('click', handleBackToMainMenuClick);
  audioButton.addEventListener('click', handleAudioButtonClick);
  closeAudioSettingsModalButton.addEventListener('click', handleCloseAudioSettingsModal);
  micSelect.addEventListener('change', handleMicSelectChange);
  micTestButton.addEventListener('click', handleMicTestButtonClick);
  micSensitivitySlider.addEventListener('input', handleMicSensitivityChange);
  closeMicTestWindowButton.addEventListener('click', handleCloseMicTestWindow);
  // 로비 BGM 볼륨 슬라이더 이벤트 리스너
  document.getElementById('lobby-bgm-volume').addEventListener('input', handleLobbyBgmVolumeChange);
}

// --- 로비 BGM 볼륨 변경 핸들러 ---
function handleLobbyBgmVolumeChange() {
  volumeSettings.lobbyBgm = parseFloat(document.getElementById('lobby-bgm-volume').value);
  lobbyBgm.volume = volumeSettings.lobbyBgm;
  document.getElementById('lobby-bgm-volume-value').textContent = volumeSettings.lobbyBgm.toFixed(2);
  saveVolumeSettings();
  console.log('로비 BGM 볼륨 변경:', volumeSettings.lobbyBgm);
}

// --- Socket.IO Event Handlers ---
socket.on('roomCreated', (data) => {
    console.log('roomCreated event received:', data);
    currentRoomId = data.roomId;
    isHost = true;
    try {
        setupWaitingRoom(data.room);
        console.log('Waiting room setup initiated for room:', data.room);
    } catch (error) {
        console.error('Error in setupWaitingRoom:', error);
    }
});

socket.on('roomUpdate', (room) => {
    console.log('Room updated:', room);
    setupWaitingRoom(room);
    const myPlayer = room.players.find(p => p.id === socket.id);
    if (myPlayer) {
        readyButton.textContent = myPlayer.isReady ? 'Unready' : 'Ready';
        readyButton.classList.toggle('ready', myPlayer.isReady);
    }
    if (isHost) {
        const allPlayersReady = room.players.every(p => p.isHost || p.isReady);
        startButton.disabled = !allPlayersReady || room.players.length <= 1;
    }
});

socket.on('roomJoined', (data) => {
    console.log('Room joined:', data);
    currentRoomId = data.roomId;
    setupWaitingRoom(data.room);
    joinRoomModal.classList.add('hidden');
});

socket.on('joinRoomError', (message) => {
    console.error('Join room error:', message);
    if (message === 'Incorrect password.') {
        incorrectPasswordModal.classList.remove('hidden');
    } else {
        alert(`방 참가 실패: ${message}`);
    }
});

socket.on('youWereKicked', (roomId) => {
    console.log(`You were kicked from room ${roomId}`);
    alert('방에서 강퇴당했습니다.');
    waitingRoomContainer.classList.add('hidden');
    mainMenuButtons.classList.remove('hidden');
});

socket.on('gameStarting', (roomId) => {
    console.log(`Game starting in room: ${roomId}`);
    alert('게임이 곧 시작됩니다!');
    waitingRoomContainer.classList.add('hidden');
    mainMenuButtons.classList.remove('hidden');
});

socket.on('gameEnded', (roomId) => {
    console.log(`Game ended in room: ${roomId}`);
    alert('게임 종료!');
    waitingRoomContainer.classList.add('hidden');
    mainMenuButtons.classList.remove('hidden');
});

socket.on('roomListUpdate', (updatedRooms) => {
    console.log('Room list updated:', updatedRooms);
    availableRooms = updatedRooms.reduce((acc, room) => {
        acc[room.id] = room;
        return acc;
    }, {});
    renderRoomList(updatedRooms);
});

// --- Event Handlers ---
function handleStartGameClick() {
    console.log('Start Game button clicked');
    mainMenuButtons.classList.add('hidden');
    trainingMultiMenu.classList.remove('hidden');
    currentMenuTitle.textContent = 'Start Game';
    currentMenuTitle.classList.remove('hidden');
}

function handleTrainingClick() {
    console.log('Training button clicked');
    alert('Training 모드는 아직 구현되지 않았습니다.');
}

function handleMultiClick() {
    console.log('Multi button clicked');
    multiplayerOptions.classList.toggle('hidden');
}

function handleCreateRoomClick() {
    console.log('Create Room button clicked');
    multiplayerOptions.classList.add('hidden');
    createRoomModal.classList.remove('hidden');
    document.getElementById('room-title').value = '';
    privateRoomCheckbox.checked = false;
    passwordGroup.classList.add('hidden');
    document.getElementById('room-password').value = '';
    document.getElementById('personal-match').checked = true;
    selectedMapDisplay.textContent = 'No map selected';
}

function handleJoinRoomClick() {
    console.log('Join Room button clicked');
    multiplayerOptions.classList.add('hidden');
    joinRoomModal.classList.remove('hidden');
    joinRoomPasswordInput.value = '';
    socket.emit('listRooms');
}

function handleBackToMainMenuClick() {
    console.log('Back button clicked');
    trainingMultiMenu.classList.add('hidden');
    optionMenu.classList.add('hidden');
    mainMenuButtons.classList.remove('hidden');
    multiplayerOptions.classList.add('hidden');
    mapOptions.classList.add('hidden');
    currentMenuTitle.classList.add('hidden');
    currentMenuTitle.textContent = '';
}

function handlePrivateRoomChange() {
    passwordGroup.classList.toggle('hidden', !privateRoomCheckbox.checked);
}

function handleMapSelectClick(event) {
    event.stopPropagation();
    mapOptions.classList.toggle('hidden');
}

function handleMapOptionClick() {
    const mapName = this.dataset.mapName;
    selectedMapDisplay.textContent = mapName;
    mapOptions.classList.add('hidden');
}

function handleDocumentClick(event) {
    if (!mapSelectButton.contains(event.target) && !mapOptions.contains(event.target)) {
        mapOptions.classList.add('hidden');
    }
}

function handleCreateRoomFinalClick() {
    let roomTitle = document.getElementById('room-title').value || 'My Room';
    if (roomTitle.length > 20) {
        roomTitle = roomTitle.substring(0, 20);
    }
    const isPrivate = privateRoomCheckbox.checked;
    const gameMode = document.querySelector('input[name="game-mode"]:checked').value;
    const selectedMap = selectedMapDisplay.textContent;
    const roomPassword = document.getElementById('room-password').value;
    const nickname = nicknameElement.textContent;

    if (selectedMap === 'No map selected') {
        mapNotSelectedModal.classList.remove('hidden');
        return;
    }

    if (isPrivate && roomPassword.length === 0) {
        passwordNotEnteredModal.classList.remove('hidden');
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

    if (isEditingRoomSettings) {
        roomData.roomId = currentRoomId;
        socket.emit('updateRoomSettings', roomData);
    } else {
        socket.emit('createRoom', roomData);
    }

    createRoomModal.classList.add('hidden');
    mapOptions.classList.add('hidden');
}

function handleCloseCreateRoomModalClick() {
    console.log('Close Create Room Modal button clicked');
    createRoomModal.classList.add('hidden');
    mapOptions.classList.add('hidden');
    isEditingRoomSettings = false;
}

function handleReadyButtonClick() {
    const isReady = readyButton.textContent !== 'Ready';
    socket.emit('ready', { roomId: currentRoomId, isReady: !isReady });
}

function handleLeaveRoomClick() {
    if (currentRoomId) {
        socket.emit('leaveRoom', currentRoomId);
        currentRoomId = null;
        isHost = false;
        waitingRoomContainer.classList.add('hidden');
        mainMenuButtons.classList.remove('hidden');
        menuContainer.classList.remove('hidden');
    }
}

function handleStartButtonClick() {
    console.log('handleStartButtonClick called.');
    const allReady = players.every(p => p.isHost || p.isReady);

    if (!isHost) {
        console.log('Game cannot be started: User is not host.');
        alert('방장만 게임을 시작할 수 있습니다.');
        return;
    }

    if (players.length <= 1) {
        console.log('Game cannot be started: Not enough players.');
        alert('대기실에 최소 2명의 플레이어가 있어야 게임이 시작됩니다!');
    } else if (!allReady) {
        console.log('Game cannot be started: Not all players are ready.');
        notReadyModal.classList.remove('hidden');
    } else {
        console.log('All players are ready and current user is host. Starting game...');
        window.location.href = 'game.html';
        socket.emit('startGame', currentRoomId);
    }
}

function handleNotReadyOkClick() {
    notReadyModal.classList.add('hidden');
}

function handleMapNotSelectedOkClick() {
    mapNotSelectedModal.classList.add('hidden');
}

function handlePasswordNotEnteredOkClick() {
    passwordNotEnteredModal.classList.add('hidden');
}

function handleRoomSettingsClick() {
    if (!isHost) {
        alert('방장만 방 설정을 수정할 수 있습니다.');
        return;
    }
    const modalTitle = createRoomModal.querySelector('h2');
    const finalButton = createRoomModal.querySelector('#create-room-final-button');
    modalTitle.textContent = 'Room Information';
    finalButton.textContent = 'Save Changes';
    isEditingRoomSettings = true;

    document.getElementById('room-title').value = currentRoom.title;
    privateRoomCheckbox.checked = currentRoom.isPrivate;
    document.getElementById('room-password').value = currentRoom.password || '';
    selectedMapDisplay.textContent = currentRoom.track;
    document.getElementById(currentRoom.mode === 'personal' ? 'personal-match' : 'team-match').checked = true;
    passwordGroup.classList.toggle('hidden', !currentRoom.isPrivate);
    createRoomModal.classList.remove('hidden');
}

function handlePlayerListClick(event) {
    if (event.target.classList.contains('btn-kick')) {
        const playerIdToKick = event.target.dataset.playerId;
        if (isHost && currentRoomId) {
            socket.emit('kickPlayer', { roomId: currentRoomId, playerIdToKick });
        } else {
            alert('방장만 플레이어를 강퇴할 수 있습니다.');
        }
    }
}

function handleCloseJoinRoomModalClick() {
    joinRoomModal.classList.add('hidden');
    selectedRoomId = null;
    joinRoomIdInput.value = '';
    joinRoomPasswordInput.value = '';
}

function handleRefreshRoomListClick() {
    socket.emit('listRooms');
}

function handleRoomListItemClick(event) {
    const roomItem = event.target.closest('.room-item');
    if (roomItem) {
        document.querySelectorAll('.room-item').forEach(item => item.classList.remove('selected'));
        roomItem.classList.add('selected');
        selectedRoomId = roomItem.dataset.roomId;
        joinRoomIdInput.value = selectedRoomId;
    }
}

function handleRoomListItemDoubleClick(event) {
    const roomItem = event.target.closest('.room-item');
    if (roomItem) {
        selectedRoomId = roomItem.dataset.roomId;
        const room = availableRooms[selectedRoomId];
        if (room && room.isPrivate) {
            privateRoomPasswordModal.classList.remove('hidden');
            privateRoomPasswordInput.focus();
        } else {
            handleJoinSelectedRoomClick();
        }
    }
}

function handleJoinSelectedRoomClick() {
    const roomIdToJoin = joinRoomIdInput.value.trim();
    const passwordToJoin = joinRoomPasswordInput.value.trim();
    const nickname = nicknameElement.textContent;
    if (!roomIdToJoin) {
        alert('방을 선택하거나 Room ID를 입력해주세요.');
        return;
    }
    socket.emit('joinRoom', { roomId: roomIdToJoin, password: passwordToJoin, nickname });
}

// --- Option Menu Event Handlers ---
function handleOptionClick() {
    console.log('Option button clicked');
    mainMenuButtons.classList.add('hidden');
    optionMenu.classList.remove('hidden');
    currentMenuTitle.textContent = 'Option';
    currentMenuTitle.classList.remove('hidden');
}

function handleAudioButtonClick() {
    console.log('Audio button clicked');
    optionMenu.classList.add('hidden');
    audioSettingsModal.classList.remove('hidden');
    audioSettingsModal.style.pointerEvents = 'auto';
    audioSettingsModal.style.opacity = '1';
    console.log('Audio settings modal opened, ensuring interactivity');
    populateMicDevices();
}

function handleCloseAudioSettingsModal() {
    audioSettingsModal.classList.add('hidden');
    optionMenu.classList.remove('hidden');
    stopMicTest();
    console.log('Audio settings modal closed');
}

function handleMicSelectChange() {
    if (isTesting) {
        stopMicTest();
        startMicTest();
    }
}

function handleMicTestButtonClick(event) {
    event.stopPropagation(); // 이벤트 버블링 방지
    if (isTesting) {
        stopMicTest();
        micTestButton.textContent = '마이크 테스트';
        micTestWindow.classList.add('hidden');
        audioSettingsModal.classList.remove('hidden');
        audioSettingsModal.style.pointerEvents = 'auto';
        audioSettingsModal.style.opacity = '1';
        console.log('Mic test stopped, audio-settings-modal reactivated');
    } else {
        startMicTest();
        micTestButton.textContent = '테스트 중지';
        micTestWindow.classList.remove('hidden');
        audioSettingsModal.classList.remove('hidden');
        audioSettingsModal.style.pointerEvents = 'auto';
        audioSettingsModal.style.opacity = '1';
        audioSettingsModal.style.zIndex = '1000';
        micTestWindow.style.zIndex = '1001';
        console.log('Mic test started, audio-settings-modal kept active');
    }
}

function handleMicSensitivityChange() {
    sensitivity = parseFloat(micSensitivitySlider.value);
    document.getElementById('mic-sensitivity-value').textContent = sensitivity.toFixed(2);
    console.log('Mic sensitivity changed:', sensitivity);
}

function handleCloseMicTestWindow(event) {
    event.stopPropagation(); // 이벤트 버블링 방지
    stopMicTest();
    micTestButton.textContent = '마이크 테스트';
    micTestWindow.classList.add('hidden');
    audioSettingsModal.classList.remove('hidden');
    audioSettingsModal.style.pointerEvents = 'auto';
    audioSettingsModal.style.opacity = '1';
    audioSettingsModal.style.zIndex = '1000';
    console.log('Mic test window closed, audio-settings-modal reactivated');
}

// --- Web Audio API Functions ---
async function populateMicDevices() {
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioInputs = devices.filter(device => device.kind === 'audioinput');
        micSelect.innerHTML = '<option value="">마이크 선택</option>';
        audioInputs.forEach(device => {
            const option = document.createElement('option');
            option.value = device.deviceId;
            option.text = device.label || `마이크 ${micSelect.options.length + 1}`;
            micSelect.appendChild(option);
        });
    } catch (err) {
        console.error('마이크 장치 목록 가져오기 오류:', err);
        alert('마이크 장치에 접근할 수 없습니다. 권한을 확인해주세요.');
    }
}

async function startMicTest() {
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: { deviceId: micSelect.value ? { exact: micSelect.value } : undefined }
        });
        microphoneStream = stream;
        isTesting = true;

        const source = audioContext.createMediaStreamSource(stream);
        analyserNode = audioContext.createAnalyser();
        analyserNode.fftSize = 2048;

        const lowFilter = audioContext.createBiquadFilter();
        lowFilter.type = 'bandpass';
        lowFilter.frequency.setValueAtTime(160, audioContext.currentTime); // Center of 120-200Hz
        lowFilter.Q.setValueAtTime(160 / (200 - 120), audioContext.currentTime); // Bandwidth

        const highFilter = audioContext.createBiquadFilter();
        highFilter.type = 'bandpass';
        highFilter.frequency.setValueAtTime(475, audioContext.currentTime); // Center of 250-700Hz
        highFilter.Q.setValueAtTime(475 / (700 - 250), audioContext.currentTime);

        const lowAnalyser = audioContext.createAnalyser();
        lowAnalyser.fftSize = 2048;
        const highAnalyser = audioContext.createAnalyser();
        highAnalyser.fftSize = 2048;

        source.connect(analyserNode);
        source.connect(lowFilter);
        lowFilter.connect(lowAnalyser);
        source.connect(highFilter);
        highFilter.connect(highAnalyser);

        const bufferLength = analyserNode.frequencyBinCount;
        const dataArray = new Float32Array(bufferLength);
        const lowDataArray = new Float32Array(lowAnalyser.frequencyBinCount);
        const highDataArray = new Float32Array(highAnalyser.frequencyBinCount);

        function updatePowerBars() {
            if (!isTesting) return;

            analyserNode.getFloatTimeDomainData(dataArray);
            let totalRms = 0;
            for (let i = 0; i < bufferLength; i++) {
                totalRms += dataArray[i] * dataArray[i];
            }
            totalRms = Math.sqrt(totalRms / bufferLength) * sensitivity * 100;
            const totalDb = 20 * Math.log10(totalRms + 1e-10);
            updatePowerBar(totalPowerBar, totalDb);
            console.log('Total power updated:', { totalDb, sensitivity });

            lowAnalyser.getFloatTimeDomainData(lowDataArray);
            let lowRms = 0;
            for (let i = 0; i < lowAnalyser.frequencyBinCount; i++) {
                lowRms += lowDataArray[i] * lowDataArray[i];
            }
            lowRms = Math.sqrt(lowRms / lowAnalyser.frequencyBinCount) * sensitivity * 100;
            const lowDb = 20 * Math.log10(lowRms + 1e-10);
            updatePowerBar(lowPowerBar, lowDb);
            console.log('Low power updated:', { lowDb, sensitivity });

            highAnalyser.getFloatTimeDomainData(highDataArray);
            let highRms = 0;
            for (let i = 0; i < highAnalyser.frequencyBinCount; i++) {
                highRms += highDataArray[i] * highDataArray[i];
            }
            highRms = Math.sqrt(highRms / highAnalyser.frequencyBinCount) * sensitivity * 100;
            const highDb = 20 * Math.log10(highRms + 1e-10);
            updatePowerBar(highPowerBar, highDb);
            console.log('High power updated:', { highDb, sensitivity });

            requestAnimationFrame(updatePowerBars);
        }

        updatePowerBars();
    } catch (err) {
        console.error('마이크 테스트 시작 오류:', err);
        alert('마이크 테스트를 시작할 수 없습니다. 마이크 권한을 확인해주세요.');
        stopMicTest();
    }
}

function updatePowerBar(bar, db) {
    const maxDb = 0;
    const minDb = -60;
    const normalizedDb = Math.min(Math.max(db, minDb), maxDb);
    const percentage = ((normalizedDb - minDb) / (maxDb - minDb)) * 100;
    bar.style.width = `${percentage}%`;
    if (db > -10) {
        bar.classList.add('peak');
        setTimeout(() => bar.classList.remove('peak'), 200);
    }
}

function stopMicTest() {
    if (microphoneStream) {
        microphoneStream.getTracks().forEach(track => track.stop());
        microphoneStream = null;
    }
    if (audioContext) {
        audioContext.close();
        audioContext = null;
    }
    isTesting = false;
    totalPowerBar.style.width = '0%';
    lowPowerBar.style.width = '0%';
    highPowerBar.style.width = '0%';
    micTestButton.textContent = '마이크 테스트';
    micTestWindow.classList.add('hidden');
}

// --- Utility Functions ---
function setupWaitingRoom(room) {
    console.log('Setting up waiting room:', room);
    if (!waitingRoomMap || !waitingRoomMode) {
        console.error('waitingRoomMap or waitingRoomMode is not defined:', { waitingRoomMap, waitingRoomMode });
        return;
    }
    currentRoom = room;
    isHost = (socket.id === room.hostId);
    document.getElementById('waiting-room-title').textContent = room.title;
    waitingRoomMap.textContent = `Map: ${room.track}`;
    waitingRoomMode.textContent = `Mode: ${room.mode === 'personal' ? 'Personal' : 'Team'}`;
    const privateIndicator = document.getElementById('waiting-room-private-indicator');
    privateIndicator.style.display = room.isPrivate ? 'block' : 'none';
    playerList.className = 'player-list';
    playerList.classList.add(room.mode === 'team' ? 'team-layout' : 'personal-layout');
    players = room.players;
    renderPlayerList(room.mode);
    readyButton.classList.toggle('hidden', isHost);
    startButton.classList.toggle('hidden', !isHost);
    roomSettingsButton.classList.toggle('hidden', !isHost);
    mainMenuButtons.classList.add('hidden');
    trainingMultiMenu.classList.add('hidden');
    menuContainer.classList.add('hidden');
    waitingRoomContainer.classList.remove('hidden');
    waitingRoomContainer.style.display = 'flex';
    console.log('waiting-room-container display:', waitingRoomContainer.style.display);
    void waitingRoomContainer.offsetWidth;
}

function renderPlayerList(mode) {
    playerList.innerHTML = '';
    if (mode === 'personal') {
        for (let i = 0; i < 8; i++) {
            const player = players[i];
            const playerSlot = document.createElement('div');
            playerSlot.className = 'player-slot';
            playerSlot.innerHTML = player ? createPlayerCardHTML(player) : '<div class="player-card empty-slot"><p>Empty</p></div>';
            playerList.appendChild(playerSlot);
        }
    } else {
        for (let i = 0; i < 4; i++) {
            const teamSlot = document.createElement('div');
            teamSlot.className = 'team-slot';
            const player1 = players[i * 2];
            const player2 = players[i * 2 + 1];
            const p1Wrapper = document.createElement('div');
            p1Wrapper.className = 'player-wrapper';
            p1Wrapper.innerHTML = player1 ? createPlayerCardHTML(player1) : '<div class="player-card empty-slot"><p>Empty</p></div>';
            teamSlot.appendChild(p1Wrapper);
            const p2Wrapper = document.createElement('div');
            p2Wrapper.className = 'player-wrapper';
            p2Wrapper.innerHTML = player2 ? createPlayerCardHTML(player2) : '<div class="player-card empty-slot"><p>Empty</p></div>';
            teamSlot.appendChild(p2Wrapper);
            playerList.appendChild(teamSlot);
        }
    }
}

function createPlayerCardHTML(player) {
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
        ${isHost && !player.isHost ? `<button class="btn btn-kick" data-player-id="${player.id}">X</button>` : ''}
    `;
}

function renderRoomList(rooms) {
    roomListContainer.innerHTML = '';
    if (Object.keys(rooms).length === 0) {
        roomListContainer.innerHTML = '<p class="no-rooms-message">방이 없습니다. 방을 만들어 보세요!</p>';
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
        roomListContainer.appendChild(roomItem);
    }
}

function resizeGameViewport() {
    const viewport = document.getElementById('game-viewport');
    const designWidth = 1920;
    const designHeight = 1080;
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    const scale = Math.min(windowWidth / designWidth, windowHeight / designHeight);
    viewport.style.transform = `translate(-50%, -50%) scale(${scale})`;
    viewport.style.width = `${designWidth}px`;
    viewport.style.height = `${designHeight}px`;
}

// --- 오디오 초기화 ---
function initializeAudio() {
  // 초기 볼륨 적용
  lobbyBgm.volume = volumeSettings.lobbyBgm;

  // 로비 BGM 자동 재생
  lobbyBgm.play().catch(err => {
    console.error('로비 BGM 재생 오류:', err);
    // 브라우저의 자동 재생 정책으로 인해 실패 시, 사용자 인터랙션 후 재생
    document.addEventListener('click', () => {
      lobbyBgm.play().catch(err => console.error('로비 BGM 재생 실패:', err));
    }, { once: true });
  });

  console.log('로비 BGM 초기화 완료, 볼륨:', volumeSettings.lobbyBgm);
}

// --- 볼륨 설정 저장 ---
function saveVolumeSettings() {
  localStorage.setItem('lobbyBgmVolume', volumeSettings.lobbyBgm);
  console.log('로비 BGM 볼륨 저장:', volumeSettings.lobbyBgm);
}