import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { io } from 'https://cdn.socket.io/4.7.5/socket.io.esm.min.js'; // Socket.IO 클라이언트 임포트

const socket = io(); // Socket.IO 클라이언트 초기화

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
const passwordNotEnteredModal = document.getElementById('password-not-entered-modal');

const waitingRoomMap = document.getElementById('waiting-room-map');
const waitingRoomMode = document.getElementById('waiting-room-mode');
const passwordNotEnteredOkButton = document.getElementById('password-not-entered-ok-button');
const incorrectPasswordModal = document.getElementById('incorrect-password-modal');
const incorrectPasswordOkButton = document.getElementById('incorrect-password-ok-button');

// Private Room Password Modal Elements
const privateRoomPasswordModal = document.getElementById('private-room-password-modal');
const closePrivateRoomPasswordModalButton = document.getElementById('close-private-room-password-modal');
const privateRoomPasswordInput = document.getElementById('private-room-password-input');
const privateRoomPasswordOkButton = document.getElementById('private-room-password-ok-button');

const currentMenuTitle = document.getElementById('current-menu-title');

// Join Room Modal Elements
const joinRoomModal = document.getElementById('join-room-modal');
const closeJoinRoomModalButton = document.getElementById('close-join-room-modal');
const roomListContainer = document.getElementById('room-list');
const refreshRoomListButton = document.getElementById('refresh-room-list');
const joinSelectedRoomButton = document.getElementById('join-selected-room-button');
const joinRoomIdInput = document.getElementById('join-room-id');
const joinRoomPasswordInput = document.getElementById('join-room-password');

// --- Global Variables ---
let isHost = false;
let players = []; // Array to store player data
let currentRoomId = null; // 현재 접속 중인 방 ID
let selectedRoomId = null; // 선택된 방 ID
let isEditingRoomSettings = false; // 방 설정 수정 중인지 여부를 나타내는 플래그
let currentRoom = null; // 현재 접속 중인 방의 전체 정보
let availableRooms = {}; // 서버로부터 받은 방 목록을 저장

// --- Initialization ---
document.addEventListener('DOMContentLoaded', initializeGame);

function initializeGame() {
    generateRandomNickname();
    setupThreeJSScene();
    setupEventListeners();
    selectedMapDisplay.textContent = 'No map selected'; // Initialize map display
    resizeGameViewport(); // Initial resize
    window.addEventListener('resize', resizeGameViewport); // Add resize listener
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

    // Join Room Modal
    closeJoinRoomModalButton.addEventListener('click', handleCloseJoinRoomModalClick);
    refreshRoomListButton.addEventListener('click', handleRefreshRoomListClick);
    joinSelectedRoomButton.addEventListener('click', handleJoinSelectedRoomClick);
    roomListContainer.addEventListener('click', handleRoomListItemClick); // Event delegation for selecting rooms
    roomListContainer.addEventListener('dblclick', handleRoomListItemDoubleClick); // Event delegation for double click to join

    // Incorrect Password Modal
    incorrectPasswordOkButton.addEventListener('click', () => {
        incorrectPasswordModal.classList.add('hidden');
    });

    // Private Room Password Modal
    closePrivateRoomPasswordModalButton.addEventListener('click', () => {
        privateRoomPasswordModal.classList.add('hidden');
        privateRoomPasswordInput.value = ''; // 입력 필드 초기화
    });

    privateRoomPasswordOkButton.addEventListener('click', () => {
        const roomIdToJoin = selectedRoomId; // 더블클릭으로 선택된 방 ID 사용
        const passwordToJoin = privateRoomPasswordInput.value.trim();
        const nickname = nicknameElement.textContent;

        if (!passwordToJoin) {
            alert('비밀번호를 입력해주세요.'); // TODO: 모달로 변경
            return;
        }

        socket.emit('joinRoom', { roomId: roomIdToJoin, password: passwordToJoin, nickname });
        privateRoomPasswordModal.classList.add('hidden'); // 비밀번호 모달 닫기
        privateRoomPasswordInput.value = ''; // 입력 필드 초기화
    });
}

// --- Socket.IO Event Handlers ---
socket.on('roomCreated', (data) => {
    console.log('Room created:', data);
    currentRoomId = data.roomId; // 방 ID 저장
    setupWaitingRoom(data.room);
});

socket.on('roomUpdate', (room) => {
    console.log('Room updated:', room);
    setupWaitingRoom(room); // 방 정보 업데이트 시 대기실 UI 전체 갱신

    // Ready 버튼 텍스트 업데이트
    const myPlayer = room.players.find(p => p.id === socket.id);
    if (myPlayer) {
        readyButton.textContent = myPlayer.isReady ? 'Unready' : 'Ready';
        if (myPlayer.isReady) {
            readyButton.classList.add('ready');
        } else {
            readyButton.classList.remove('ready');
        }
    }

    // 호스트인 경우 Start 버튼 활성화/비활성화
    if (isHost) {
        const allPlayersReady = room.players.every(p => p.isHost || p.isReady);
        startButton.disabled = !allPlayersReady || room.players.length <= 1; // 호스트 제외 모든 플레이어가 준비되었고, 플레이어가 1명 초과일 때 활성화
    }
});

socket.on('roomJoined', (data) => {
    console.log('Room joined:', data);
    currentRoomId = data.roomId; // 방 ID 저장
    setupWaitingRoom(data.room);
    joinRoomModal.classList.add('hidden'); // 방 참가 성공 시 Join Room 모달 닫기
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
    mainMenuButtons.classList.remove('hidden'); // 메인 메뉴로 돌아가기
});

socket.on('gameStarting', (roomId) => {
    console.log(`Game starting in room: ${roomId}`);
    alert('게임이 곧 시작됩니다!');
    // TODO: 실제 게임 시작 로직 (카운트다운 표시, 게임 씬 로드 등)
    waitingRoomContainer.classList.add('hidden');
    mainMenuButtons.classList.remove('hidden'); // 일단 메인 메뉴로 돌아가기
});

socket.on('gameEnded', (roomId) => {
    console.log(`Game ended in room: ${roomId}`);
    alert('게임 종료!');
    // TODO: 결과 모달 표시
    waitingRoomContainer.classList.add('hidden');
    mainMenuButtons.classList.remove('hidden'); // 일단 메인 메뉴로 돌아가기
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
    multiplayerOptions.classList.add('hidden');
    joinRoomModal.classList.remove('hidden');
    joinRoomPasswordInput.value = ''; // 비밀번호 입력 필드 초기화
    socket.emit('listRooms'); // Request room list from server
}

function handleBackToMainMenuClick() {
    console.log('Back button clicked');
    trainingMultiMenu.classList.add('hidden');
    mainMenuButtons.classList.remove('hidden');
    multiplayerOptions.classList.add('hidden'); // Hide multi options if open
    mapOptions.classList.add('hidden'); // Hide map options if open (shouldn't be, but for robustness)
    currentMenuTitle.classList.add('hidden'); // 현재 탭 문구 숨기기
    currentMenuTitle.textContent = ''; // 텍스트 초기화
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
    let roomTitle = document.getElementById('room-title').value || 'My Room';
    // 한글 20자 제한 (UTF-8 기준)
    if (roomTitle.length > 20) {
        roomTitle = roomTitle.substring(0, 20);
    }
    const isPrivate = document.getElementById('private-room-checkbox').checked;
    const gameMode = document.querySelector('input[name="game-mode"]:checked').value;
    const selectedMap = selectedMapDisplay.textContent;
    const roomPassword = document.getElementById('room-password').value;
    const nickname = nicknameElement.textContent; // 현재 닉네임 가져오기

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
        maxPlayers: 8, // 임시로 8명으로 설정
        isPrivate,
        password: roomPassword,
        mode: gameMode,
        track: selectedMap,
        nickname
    };

    if (isEditingRoomSettings) {
        // 방 설정 수정 모드일 경우
        roomData.roomId = currentRoomId; // 현재 방 ID 추가
        socket.emit('updateRoomSettings', roomData);
    } else {
        // 방 생성 모드일 경우
        socket.emit('createRoom', roomData);
    }

    // 모달 닫기
    createRoomModal.classList.add('hidden');
    mapOptions.classList.add('hidden'); // Hide map options if open
}

function handleCloseCreateRoomModalClick() {
    console.log('Close Create Room Modal button clicked');
    createRoomModal.classList.add('hidden');
    mapOptions.classList.add('hidden'); // Hide map options if open
    isEditingRoomSettings = false; // 모달 닫을 때 플래그 초기화
}

function handleReadyButtonClick() {
    const isReady = readyButton.textContent !== 'Ready'; // 현재 상태가 'Ready'이면 'Unready'로 변경할 예정이므로, 서버에는 true를 보냄
    socket.emit('ready', { roomId: currentRoomId, isReady: !isReady }); // 현재 상태의 반대를 보냄
}

function handleLeaveRoomClick() {
    if (currentRoomId) {
        socket.emit('leaveRoom', currentRoomId);
        currentRoomId = null;
        isHost = false;
        waitingRoomContainer.classList.add('hidden');
        mainMenuButtons.classList.remove('hidden'); // Return to main menu
    }
}

function handleStartButtonClick() {
    if (isHost) {
        socket.emit('startGame', currentRoomId);
    } else {
        alert('방장만 게임을 시작할 수 있습니다.');
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
    isEditingRoomSettings = true; // 방 설정 수정 모드 활성화

    // Populate with current room settings from currentRoom object
    document.getElementById('room-title').value = currentRoom.title;
    document.getElementById('private-room-checkbox').checked = currentRoom.isPrivate;
    document.getElementById('room-password').value = currentRoom.password || ''; // 비밀번호 필드 채우기
    
    // 현재 방의 맵과 게임 모드 정보 채우기
    selectedMapDisplay.textContent = currentRoom.track;

    if (currentRoom.mode === 'personal') {
        document.getElementById('personal-match').checked = true;
    } else if (currentRoom.mode === 'team') {
        document.getElementById('team-match').checked = true;
    }

    // 비밀방 체크박스 상태에 따라 비밀번호 입력 필드 표시/숨김
    if (currentRoom.isPrivate) {
        passwordGroup.classList.remove('hidden');
    } else {
        passwordGroup.classList.add('hidden');
    }

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
    selectedRoomId = null; // Reset selected room
    joinRoomIdInput.value = '';
    joinRoomPasswordInput.value = '';
}

function handleRefreshRoomListClick() {
    socket.emit('listRooms');
}

function handleRoomListItemClick(event) {
    const roomItem = event.target.closest('.room-item');
    if (roomItem) {
        // Remove selected class from all items
        document.querySelectorAll('.room-item').forEach(item => {
            item.classList.remove('selected');
        });
        // Add selected class to clicked item
        roomItem.classList.add('selected');
        selectedRoomId = roomItem.dataset.roomId;
        joinRoomIdInput.value = selectedRoomId; // Populate Room ID input
    }
}

function handleRoomListItemDoubleClick(event) {
    const roomItem = event.target.closest('.room-item');
    if (roomItem) {
        selectedRoomId = roomItem.dataset.roomId;
        const room = availableRooms[selectedRoomId];

        if (room && room.isPrivate) {
            // Private Room일 경우 비밀번호 입력 모달 띄우기
            privateRoomPasswordModal.classList.remove('hidden');
            privateRoomPasswordInput.focus(); // 입력 필드에 포커스
        } else {
            // Public Room이거나 선택된 방이 없는 경우 바로 입장 시도
            handleJoinSelectedRoomClick();
        }
    }
}

function handleJoinSelectedRoomClick() {
    const roomIdToJoin = joinRoomIdInput.value.trim();
    const passwordToJoin = joinRoomPasswordInput.value.trim();
    const nickname = nicknameElement.textContent;

    if (!roomIdToJoin) {
        alert('Please select a room or enter a Room ID.');
        return;
    }

    socket.emit('joinRoom', { roomId: roomIdToJoin, password: passwordToJoin, nickname });
}

function renderRoomList(rooms) {
    roomListContainer.innerHTML = ''; // Clear existing list

    if (Object.keys(rooms).length === 0) {
        roomListContainer.innerHTML = '<p class="no-rooms-message">No rooms available. Create one!</p>';
        return;
    }

    for (const roomId in rooms) {
        const room = rooms[roomId];
        const roomItem = document.createElement('div');
        roomItem.classList.add('room-item');
        roomItem.dataset.roomId = room.id; // Store room ID for easy access

        const privateTag = room.isPrivate ? '<span class="room-item-private">Private</span>' : '';
        const gameModeText = room.mode === 'personal' ? 'Personal Match' : 'Team Match';

        roomItem.innerHTML = `
            <div class="room-item-info">
                <div class="room-item-title">${room.title} ${privateTag}</div>
                <div class="room-item-details">Map: ${room.track} | Mode: ${gameModeText}</div>
            </div>
            <div class="room-item-players">${room.players.length}/${room.maxPlayers}</div>
        `;
        roomListContainer.appendChild(roomItem);
    }
}

// --- Utility Functions ---
function setupWaitingRoom(room) {
    currentRoom = room; // 현재 방 정보 저장
    isHost = (socket.id === room.hostId);

    document.getElementById('waiting-room-title').textContent = room.title;

    waitingRoomMap.textContent = `Map: ${room.track}`;
    waitingRoomMode.textContent = `Mode: ${room.mode === 'personal' ? 'Personal' : 'Team'}`;

    const privateIndicator = document.getElementById('waiting-room-private-indicator');
    privateIndicator.style.display = room.isPrivate ? 'block' : 'none';

    playerList.className = 'player-list'; // Reset class
    if (room.mode === 'team') {
        playerList.classList.add('team-layout');
    } else {
        playerList.classList.add('personal-layout');
    }

    players = room.players; // 서버로부터 받은 실제 플레이어 데이터 사용

    renderPlayerList(room.mode);

    if (isHost) {
        readyButton.classList.add('hidden');
        startButton.classList.remove('hidden');
        roomSettingsButton.classList.remove('hidden');
    } else {
        readyButton.classList.remove('hidden');
        startButton.classList.add('hidden');
        roomSettingsButton.classList.add('hidden');
    }

    // 대기실 UI 표시
    mainMenuButtons.classList.add('hidden');
    trainingMultiMenu.classList.add('hidden');
    waitingRoomContainer.classList.remove('hidden');

    // 강제 리플로우 (브라우저 렌더링 강제)
    void waitingRoomContainer.offsetWidth; // 이 라인은 아무것도 하지 않지만, 브라우저가 레이아웃을 다시 계산하도록 강제합니다.
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
    let statusContent = '';
    if (player.isHost) {
        statusContent = '<span class="player-status host-status">Host</span>'; // 방장에게는 "Host" 표시
    } else {
        statusContent = `<span class="player-status ${player.isReady ? 'ready' : ''}">${player.isReady ? 'Ready' : 'Not Ready'}</span>`;
    }

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

// Function to resize the game viewport based on window size
function resizeGameViewport() {
    const viewport = document.getElementById('game-viewport');
    const designWidth = 1920; // Your game's design width
    const designHeight = 1080; // Your game's design height

    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    const widthRatio = windowWidth / designWidth;
    const heightRatio = windowHeight / designHeight;

    const scale = Math.min(widthRatio, heightRatio);

    viewport.style.transform = `translate(-50%, -50%) scale(${scale})`;
    viewport.style.width = `${designWidth}px`;
    viewport.style.height = `${designHeight}px`;
}