import * as THREE from 'three';
import * as CANNON from 'cannon-es';

// --- DOM Elements ---
const nicknameElement = document.getElementById('nickname');
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
const waitingRoomMap = document.getElementById('waiting-room-map');
const waitingRoomMode = document.getElementById('waiting-room-mode');
const passwordNotEnteredModal = document.getElementById('password-not-entered-modal');
const passwordNotEnteredOkButton = document.getElementById('password-not-entered-ok-button');

// --- Global Variables ---
let isHost = false;
let players = []; // Array to store player data

// --- Initialization ---
document.addEventListener('DOMContentLoaded', initializeGame);

function initializeGame() {
    generateRandomNickname();
    setupThreeJSScene();
    setupEventListeners();
    selectedMapDisplay.textContent = 'No map selected'; // Initialize map display
}

function generateRandomNickname() {
    const adjectives = ['Swift', 'Crazy', 'Lazy', 'Racing', 'Flying'];
    const nouns = ['Lion', 'Tiger', 'Eagle', 'Shark', 'Wolf'];
    const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
    nicknameElement.textContent = `${randomAdjective}${randomNoun}`;
}

function setupThreeJSScene() {
    // 1. Cannon.js 라이브러리 로드 및 RaycastVehicle 확인
    console.log('Cannon.js loaded:', CANNON);
    if (CANNON.RaycastVehicle) {
        console.log('RaycastVehicle is available.');
    } else {
        console.error('RaycastVehicle is not available in Cannon.js');
    }

    // 2. Three.js Scene 설정
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({
        canvas: document.querySelector('#bg'),
    });

    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    camera.position.z = 5;

    // 3. 간단한 배경 (예: 별)
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

    // 4. 애니메이션 루프
    function animate() {
        requestAnimationFrame(animate);

        // 배경 별들을 천천히 회전
        stars.rotation.x += 0.0001;
        stars.rotation.y += 0.0001;

        renderer.render(scene, camera);
    }

    animate();

    // 5. 창 크기 조절 대응
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);

        // Recalculate map options position if visible
        if (!mapOptions.classList.contains('hidden')) {
            const rect = mapSelectButton.getBoundingClientRect();
            mapOptions.style.left = `${rect.right + 20}px`;
            mapOptions.style.top = `${rect.top}px`;
        }
    });
}

function setupEventListeners() {
    // Main Menu Buttons
    document.getElementById('start-game').addEventListener('click', handleStartGameClick);
    document.getElementById('training-button').addEventListener('click', handleTrainingClick);
    document.getElementById('multi-button').addEventListener('click', handleMultiClick);
    document.getElementById('create-room-button').addEventListener('click', handleCreateRoomClick);
    document.getElementById('join-room-button').addEventListener('click', handleJoinRoomClick);
    document.getElementById('back-to-main-menu').addEventListener('click', handleBackToMainMenuClick);

    // Create Room Modal
    privateRoomCheckbox.addEventListener('change', handlePrivateRoomChange);
    mapSelectButton.addEventListener('click', handleMapSelectClick);
    mapOptionItems.forEach(item => {
        item.addEventListener('click', handleMapOptionClick);
    });
    document.addEventListener('click', handleDocumentClick);
    createRoomFinalButton.addEventListener('click', handleCreateRoomFinalClick);
    closeCreateRoomModalButton.addEventListener('click', handleCloseCreateRoomModalClick);

    // Waiting Room Buttons
    readyButton.addEventListener('click', handleReadyButtonClick);
    leaveRoomButton.addEventListener('click', handleLeaveRoomClick);
    startButton.addEventListener('click', handleStartButtonClick);
    notReadyOkButton.addEventListener('click', handleNotReadyOkClick);
    mapNotSelectedOkButton.addEventListener('click', handleMapNotSelectedOkClick);
    passwordNotEnteredOkButton.addEventListener('click', handlePasswordNotEnteredOkClick);
    roomSettingsButton.addEventListener('click', handleRoomSettingsClick);
    playerList.addEventListener('click', handlePlayerListClick); // Event delegation for kicking players
}

// --- Event Handlers ---
function handleStartGameClick() {
    console.log('Start Game button clicked');
    mainMenuButtons.classList.add('hidden');
    trainingMultiMenu.classList.remove('hidden');
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
    multiplayerOptions.classList.add('hidden'); // Hide multi options
    createRoomModal.classList.remove('hidden'); // Show create room modal

    // Reset form fields
    document.getElementById('room-title').value = '';
    document.getElementById('private-room-checkbox').checked = false;
    passwordGroup.classList.add('hidden');
    document.getElementById('room-password').value = '';
    document.getElementById('personal-match').checked = true; // Default to personal match
    selectedMapDisplay.textContent = 'No map selected';
}

function handleJoinRoomClick() {
    console.log('Join Room button clicked');
    alert('방 참가 기능은 아직 구현되지 않았습니다.');
}

function handleBackToMainMenuClick() {
    console.log('Back button clicked');
    trainingMultiMenu.classList.add('hidden');
    mainMenuButtons.classList.remove('hidden');
    multiplayerOptions.classList.add('hidden'); // Hide multi options if open
    mapOptions.classList.add('hidden'); // Hide map options if open (shouldn't be, but for robustness)
}

function handlePrivateRoomChange() {
    if (privateRoomCheckbox.checked) {
        passwordGroup.classList.remove('hidden');
    } else {
        passwordGroup.classList.add('hidden');
    }
}

function handleMapSelectClick(event) {
    event.stopPropagation(); // Prevent document click from immediately closing

    // Position map options dynamically
    const rect = event.target.getBoundingClientRect();
    mapOptions.style.left = `${rect.right + 20}px`;
    mapOptions.style.top = `${rect.top}px`;

    mapOptions.classList.toggle('hidden');
}

function handleMapOptionClick() {
    const mapName = this.dataset.mapName; // Get map name from data attribute
    selectedMapDisplay.textContent = mapName;
    mapOptions.classList.add('hidden'); // Close map options after selection
}

function handleDocumentClick(event) {
    if (!mapSelectButton.contains(event.target) && !mapOptions.contains(event.target)) {
        mapOptions.classList.add('hidden');
    }
}

function handleCreateRoomFinalClick() {
    const roomTitle = document.getElementById('room-title').value || 'My Room';
    const isPrivate = document.getElementById('private-room-checkbox').checked;
    const gameMode = document.querySelector('input[name="game-mode"]:checked').value;
    const selectedMap = selectedMapDisplay.textContent;
    const roomPassword = document.getElementById('room-password').value;

    if (selectedMap === 'No map selected') {
        mapNotSelectedModal.classList.remove('hidden');
        return;
    }

    if (isPrivate && roomPassword.length === 0) {
        passwordNotEnteredModal.classList.remove('hidden');
        return;
    }

    // Hide menu and modal, show waiting room
    mainMenuButtons.classList.add('hidden'); // Ensure main menu is hidden
    trainingMultiMenu.classList.add('hidden'); // Ensure training/multi menu is hidden
    createRoomModal.classList.add('hidden');
    waitingRoomContainer.classList.remove('hidden');

    // Setup waiting room
    setupWaitingRoom(roomTitle, isPrivate, gameMode, true, selectedMap);
}

function handleCloseCreateRoomModalClick() {
    console.log('Close Create Room Modal button clicked');
    createRoomModal.classList.add('hidden');
    mapOptions.classList.add('hidden'); // Hide map options if open
}

function handleReadyButtonClick() {
    readyButton.textContent = readyButton.textContent === 'Ready' ? 'Unready' : 'Ready';
    readyButton.classList.toggle('ready');
    // In a real app, send ready status to the server
}

function handleLeaveRoomClick() {
    waitingRoomContainer.classList.add('hidden');
    mainMenuButtons.classList.remove('hidden'); // Return to main menu
    // In a real app, notify the server that you've left
}

function handleStartButtonClick() {
    const allReady = players.every(p => p.isHost || p.isReady);
    if (allReady) {
        alert('Starting the game!');
        // Start game logic here
    } else {
        notReadyModal.classList.remove('hidden');
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
    const modalTitle = createRoomModal.querySelector('h2');
    const finalButton = createRoomModal.querySelector('#create-room-final-button');

    modalTitle.textContent = 'Room Information';
    finalButton.textContent = 'Save Changes';

    // Populate with current room settings
    document.getElementById('room-title').value = document.getElementById('waiting-room-title').textContent;
    document.getElementById('private-room-checkbox').checked = document.getElementById('waiting-room-private-indicator').style.display !== 'none';
    // ... populate other settings like map, mode etc.

    createRoomModal.classList.remove('hidden');
}

function handlePlayerListClick(event) {
    if (event.target.classList.contains('btn-kick')) {
        const playerId = event.target.dataset.playerId;
        console.log(`Kicking player ${playerId}`);
        // In a real app, send kick request to the server
        players = players.filter(p => p.id != playerId);
        renderPlayerList(playerList.classList.contains('team-layout') ? 'team' : 'personal');
    }
}

// --- Utility Functions ---
function getMockPlayers() {
    return [
        { id: 1, nickname: nicknameElement.textContent, isHost: true, isReady: false, profilePic: 'assets/default_Profile.png' },
        { id: 2, nickname: 'Racer2', isHost: false, isReady: true, profilePic: 'assets/default_Profile.png' },
        { id: 3, nickname: 'Speedy', isHost: false, isReady: false, profilePic: 'assets/default_Profile.png' },
        { id: 4, nickname: 'DriftKing', isHost: false, isReady: true, profilePic: 'assets/default_Profile.png' },
    ];
}

function setupWaitingRoom(title, isPrivate, mode, isUserHost, selectedMap) {
    isHost = isUserHost;
    document.getElementById('waiting-room-title').textContent = title;
    waitingRoomMap.textContent = `Map: ${selectedMap}`;
    waitingRoomMode.textContent = `Mode: ${mode === 'personal' ? 'Personal' : 'Team'}`;
    const privateIndicator = document.getElementById('waiting-room-private-indicator');
    privateIndicator.style.display = isPrivate ? 'block' : 'none';

    playerList.className = 'player-list'; // Reset class
    if (mode === 'team') {
        playerList.classList.add('team-layout');
    } else {
        playerList.classList.add('personal-layout');
    }

    players = getMockPlayers(); // Use the new function for mock data

    renderPlayerList(mode);

    if (isHost) {
        readyButton.classList.add('hidden');
        startButton.classList.remove('hidden');
    } else {
        readyButton.classList.remove('hidden');
        startButton.classList.add('hidden');
    }
}

function renderPlayerList(mode) {
    playerList.innerHTML = ''; // Clear previous list

    if (mode === 'personal') {
        for (let i = 0; i < 8; i++) {
            const player = players[i];
            const playerSlot = document.createElement('div');
            playerSlot.className = 'player-slot';
            if (player) {
                playerSlot.innerHTML = createPlayerCardHTML(player);
            } else {
                playerSlot.innerHTML = '<div class="player-card empty-slot"><p>Empty</p></div>';
            }
            playerList.appendChild(playerSlot);
        }
    } else { // Team mode
        for (let i = 0; i < 4; i++) {
            const teamSlot = document.createElement('div');
            teamSlot.className = 'team-slot';
            const player1 = players[i * 2];
            const player2 = players[i * 2 + 1];

            // Player 1
            const p1Wrapper = document.createElement('div');
            p1Wrapper.className = 'player-wrapper';
            if (player1) {
                p1Wrapper.innerHTML = createPlayerCardHTML(player1);
            } else {
                p1Wrapper.innerHTML = '<div class="player-card empty-slot"><p>Empty</p></div>';
            }
            teamSlot.appendChild(p1Wrapper);

            // Player 2
            const p2Wrapper = document.createElement('div');
            p2Wrapper.className = 'player-wrapper';
            if (player2) {
                p2Wrapper.innerHTML = createPlayerCardHTML(player2);
            } else {
                p2Wrapper.innerHTML = '<div class="player-card empty-slot"><p>Empty</p></div>';
            }
            teamSlot.appendChild(p2Wrapper);

            playerList.appendChild(teamSlot);
        }
    }
}

function createPlayerCardHTML(player) {
    // The wrapper div is now the position reference for the kick button
    return `
        <div class="player-card">
            <img src="${player.profilePic}" alt="Profile Pic" class="player-profile-pic">
            <div class="player-info">
                <span class="player-nickname">${player.nickname} ${player.isHost ? '(Host)' : ''}</span>
                <span class="player-status ${player.isReady ? 'ready' : ''}">${player.isReady ? 'Ready' : 'Not Ready'}</span>
            </div>
        </div>
        ${isHost && !player.isHost ? `<button class="btn btn-kick" data-player-id="${player.id}">X</button>` : ''}
    `;
}