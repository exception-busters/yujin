// ingame.js - 멀티플레이어 자동차 게임 메인 로직
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import * as CANNON from 'cannon-es';
import { GLTFLoader } from 'https://unpkg.com/three@0.165.0/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'https://unpkg.com/three@0.165.0/examples/jsm/loaders/DRACOLoader.js';
import { io } from 'https://cdn.socket.io/4.7.5/socket.io.esm.min.js';
import Car from './car.js';

class MultiplayerCarGame {
    constructor() {
        // 플레이어 정보
        this.roomId = null;
        this.playerId = null;
        this.nickname = null;

        // 게임 상태
        this.isGameStarted = false;
        this.cars = new Map(); // playerId -> Car 객체 매핑

        // Three.js 컴포넌트
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;

        // Cannon.js 물리 엔진
        this.world = null;
        this.chassisMaterial = null;

        // 네트워크
        this.socket = null;

        // 타이밍
        this.clock = new THREE.Clock();
        this.lastCallTime = 0;

        // 로더
        this.gltfLoader = null;
        this.dracoLoader = null;

        // Stats (성능 모니터링)
        this.stats = null;
    }

    async init() {
        console.log('🎮 멀티플레이어 자동차 게임 초기화 시작');

        // 1. URL 파라미터 파싱
        this._parseUrlParams();

        // 2. Three.js 씬 설정
        this._setupScene();

        // 3. 물리 엔진 설정
        this._setupPhysics();

        // 4. 네트워크 연결
        this._setupNetwork();

        // 5. 로더 설정
        this._setupLoaders();

        // 6. 맵 로드
        await this._loadMap();

        // 7. 내 자동차 생성
        await this._createMyCar();

        // 8. 게임 루프 시작
        this._startGameLoop();

        // 9. 이벤트 리스너 설정
        this._setupEventListeners();

        // 10. 서버에 게임 참여 알림
        this._joinGameRoom();

        console.log('✅ 멀티플레이어 자동차 게임 초기화 완료');
    }

    // 1. URL 파라미터 파싱
    _parseUrlParams() {
        const urlParams = new URLSearchParams(window.location.search);
        this.roomId = urlParams.get('roomId');
        this.playerId = urlParams.get('playerId');
        this.nickname = urlParams.get('nickname');

        if (!this.roomId || !this.playerId || !this.nickname) {
            console.error('❌ 필수 URL 파라미터가 누락되었습니다:', {
                roomId: this.roomId,
                playerId: this.playerId,
                nickname: this.nickname
            });
            alert('게임 접속 정보가 올바르지 않습니다. 로비로 돌아갑니다.');
            window.location.href = '/';
            return;
        }

        console.log('📋 플레이어 정보:', {
            roomId: this.roomId,
            playerId: this.playerId,
            nickname: this.nickname
        });
    }

    // 2. Three.js 씬 설정
    _setupScene() {
        const canvas = document.querySelector('canvas.webgl');

        // 씬 생성
        this.scene = new THREE.Scene();

        // 렌더러 설정
        this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        // 카메라 설정
        this.camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 10000);
        this.camera.position.set(0, 10, 15);
        this.scene.add(this.camera);

        // 컨트롤 설정 (초기에는 비활성화)
        this.controls = new OrbitControls(this.camera, canvas);
        this.controls.enabled = false;

        // 조명 설정
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
        dirLight.position.set(-60, 100, -10);
        dirLight.castShadow = true;
        dirLight.shadow.camera.top = 50;
        dirLight.shadow.camera.bottom = -50;
        dirLight.shadow.camera.left = -50;
        dirLight.shadow.camera.right = 50;
        dirLight.shadow.camera.near = 0.1;
        dirLight.shadow.camera.far = 200;
        dirLight.shadow.mapSize.width = 4096;
        dirLight.shadow.mapSize.height = 4096;
        this.scene.add(dirLight);

        // Stats 설정 (성능 모니터링)
        if (typeof Stats !== 'undefined') {
            this.stats = new Stats();
            this.stats.showPanel(0);
            this.stats.dom.id = 'stats-panel';
            document.body.appendChild(this.stats.dom);
        }

        console.log('✅ Three.js 씬 설정 완료');
    }

    // 3. 물리 엔진 설정
    _setupPhysics() {
        // Cannon.js 월드 생성
        this.world = new CANNON.World({ gravity: new CANNON.Vec3(0, -9.82, 0) });
        this.world.broadphase = new CANNON.SAPBroadphase(this.world);
        this.world.allowSleep = true;

        // 재료 정의
        const groundMaterial = new CANNON.Material('ground');
        this.chassisMaterial = new CANNON.Material('chassis');

        // 재료 간 상호작용 정의
        const groundChassisContactMaterial = new CANNON.ContactMaterial(
            groundMaterial,
            this.chassisMaterial,
            {
                friction: 0.5,
                restitution: 0,
                contactEquationStiffness: 1e7,
                contactEquationRelaxation: 3
            }
        );
        this.world.addContactMaterial(groundChassisContactMaterial);

        // 바닥 생성
        const floorShape = new CANNON.Box(new CANNON.Vec3(1000, 0.1, 1000));
        const floorBody = new CANNON.Body({
            mass: 0,
            material: groundMaterial,
            shape: floorShape,
            collisionFilterGroup: 1,
            collisionFilterMask: 1
        });
        floorBody.position.set(0, -0.1, 0);
        this.world.addBody(floorBody);

        console.log('✅ 물리 엔진 설정 완료');
    }

    // 4. 네트워크 연결
    _setupNetwork() {
        this.socket = io();

        // 소켓 이벤트 리스너 설정
        this.socket.on('connect', () => {
            console.log('🔗 서버에 연결됨:', this.socket.id);
        });

        this.socket.on('disconnect', () => {
            console.log('🔌 서버 연결 끊김');
        });

        // 게임 관련 이벤트
        this.socket.on('existingPlayers', (players) => this._handleExistingPlayers(players));
        this.socket.on('newPlayer', (player) => this._handleNewPlayer(player));
        this.socket.on('playerLeft', (playerId) => this._handlePlayerLeft(playerId));
        this.socket.on('carUpdate', (data) => this._handleCarUpdate(data));
        this.socket.on('startCountdown', () => this._startCountdown());
        this.socket.on('gameStart', () => this._handleGameStart());

        console.log('✅ 네트워크 연결 설정 완료');
    }

    // 5. 로더 설정
    _setupLoaders() {
        this.dracoLoader = new DRACOLoader();
        this.dracoLoader.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/');

        this.gltfLoader = new GLTFLoader();
        this.gltfLoader.setDRACOLoader(this.dracoLoader);

        console.log('✅ 로더 설정 완료');
    }

    // 6. 맵 로드
    async _loadMap() {
        return new Promise((resolve, reject) => {
            this.gltfLoader.load(
                '../../assets/racing_map_1.glb',
                (gltf) => {
                    const model = gltf.scene;
                    model.scale.set(1, 1, 1);
                    model.position.set(0, -0.5, 0);

                    // 그림자 설정
                    model.traverse((child) => {
                        if (child.isMesh) {
                            child.castShadow = true;
                            child.receiveShadow = true;
                        }
                    });

                    this.scene.add(model);
                    console.log('✅ 레이싱 맵 로드 완료');
                    resolve();
                },
                (progress) => {
                    console.log('맵 로딩 진행률:', Math.round(progress.loaded / progress.total * 100) + '%');
                },
                (error) => {
                    console.error('❌ 맵 로딩 실패:', error);
                    reject(error);
                }
            );
        });
    }

    // 7. 내 자동차 생성
    async _createMyCar() {
        try {
            const myCar = new Car(this.scene, this.world, this.chassisMaterial);
            await myCar.init();

            // 내 자동차는 조작 가능하지만 초기에는 비활성화
            myCar.isControllable = false;

            // 자동차 맵에 추가
            this.cars.set(this.playerId, myCar);

            console.log('🚗 내 자동차 생성 완료:', this.playerId);
        } catch (error) {
            console.error('❌ 내 자동차 생성 실패:', error);
            throw error;
        }
    }

    // 8. 게임 루프 시작
    _startGameLoop() {
        const tick = () => {
            if (this.stats) this.stats.begin();

            // 물리 엔진 업데이트
            this._updatePhysics();

            // 모든 자동차 업데이트
            this.cars.forEach((car) => {
                car.update(this.camera);
            });

            // 내 자동차 상태 전송 (게임 시작 후)
            if (this.isGameStarted) {
                this._sendMyCarState();
            }

            // 렌더링
            this.renderer.render(this.scene, this.camera);

            if (this.stats) this.stats.end();

            requestAnimationFrame(tick);
        };

        tick();
        console.log('✅ 게임 루프 시작');
    }

    // 9. 이벤트 리스너 설정
    _setupEventListeners() {
        // 창 크기 변경
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });

        // 페이지 언로드 시 정리
        window.addEventListener('beforeunload', () => {
            if (this.socket) {
                this.socket.disconnect();
            }
        });

        console.log('✅ 이벤트 리스너 설정 완료');
    }

    // 10. 서버에 게임 참여 알림
    _joinGameRoom() {
        this.socket.emit('joinGame', {
            roomId: this.roomId,
            playerId: this.playerId,
            nickname: this.nickname
        });

        console.log('📡 게임 룸 참여 요청 전송');
    }

    // 물리 엔진 업데이트
    _updatePhysics() {
        const time = performance.now() / 1000;
        if (!this.lastCallTime) {
            this.world.step(1 / 60);
        } else {
            const dt = time - this.lastCallTime;
            this.world.step(1 / 60, dt);
        }
        this.lastCallTime = time;
    }

    // 내 자동차 상태 전송
    _sendMyCarState() {
        const myCar = this.cars.get(this.playerId);
        if (!myCar || !myCar.car || !myCar.car.chassisBody) return;

        const body = myCar.car.chassisBody;

        // 50ms마다 전송 (20 FPS)
        if (!this.lastSendTime || performance.now() - this.lastSendTime > 50) {
            this.socket.emit('carUpdate', {
                roomId: this.roomId,
                playerId: this.playerId,
                position: {
                    x: body.position.x,
                    y: body.position.y,
                    z: body.position.z
                },
                quaternion: {
                    x: body.quaternion.x,
                    y: body.quaternion.y,
                    z: body.quaternion.z,
                    w: body.quaternion.w
                },
                velocity: {
                    x: body.velocity.x,
                    y: body.velocity.y,
                    z: body.velocity.z
                }
            });

            this.lastSendTime = performance.now();
        }
    }

    // 기존 플레이어들 처리
    async _handleExistingPlayers(players) {
        console.log('👥 기존 플레이어들:', players);

        if (!players || typeof players !== 'object') {
            console.warn('⚠️ 잘못된 플레이어 데이터:', players);
            return;
        }

        for (const [playerId, playerData] of Object.entries(players)) {
            if (playerId !== this.playerId) {
                // 중복 생성 방지
                if (!this.cars.has(playerId)) {
                    await this._createRemoteCar(playerId, playerData);
                } else {
                    console.log('🔄 이미 존재하는 플레이어:', playerId);
                }
            } else {
                // 내 자동차 위치 업데이트
                this._updateMyCarPosition(playerData);
            }
        }
    }

    // 새 플레이어 처리
    async _handleNewPlayer(player) {
        console.log('👤 새 플레이어 참여:', player);

        if (player.playerId !== this.playerId) {
            // 플레이어 데이터 구조 정규화
            const playerData = {
                playerId: player.playerId,
                nickname: player.nickname,
                position: player.position,
                quaternion: player.quaternion,
                velocity: player.velocity,
                color: player.color
            };
            await this._createRemoteCar(player.playerId, playerData);
        }
    }

    // 플레이어 퇴장 처리
    _handlePlayerLeft(playerId) {
        console.log('👋 플레이어 퇴장:', playerId);

        const car = this.cars.get(playerId);
        if (car) {
            // 씬에서 자동차 제거
            if (car.chassis) this.scene.remove(car.chassis);
            if (car.wheels) {
                car.wheels.forEach(wheel => this.scene.remove(wheel));
            }

            // 물리 월드에서 제거
            if (car.car && car.car.chassisBody) {
                this.world.removeBody(car.car.chassisBody);
            }

            // 맵에서 제거
            this.cars.delete(playerId);
        }
    }

    // 자동차 상태 업데이트 처리
    _handleCarUpdate(data) {
        const { playerId, position, quaternion, velocity } = data;

        // 내 자동차는 업데이트하지 않음
        if (playerId === this.playerId) return;

        const car = this.cars.get(playerId);
        if (car && car.car && car.car.chassisBody) {
            const body = car.car.chassisBody;

            // 위치와 회전 업데이트
            body.position.set(position.x, position.y, position.z);
            body.quaternion.set(quaternion.x, quaternion.y, quaternion.z, quaternion.w);

            // 속도 업데이트 (부드러운 움직임을 위해)
            if (velocity) {
                body.velocity.set(velocity.x, velocity.y, velocity.z);
            }
        }
    }

    // 원격 자동차 생성
    async _createRemoteCar(playerId, playerData) {
        try {
            console.log('🔧 원격 자동차 생성 시작:', playerId, playerData);

            const remoteCar = new Car(this.scene, this.world, this.chassisMaterial);
            await remoteCar.init();

            // 원격 자동차는 조작 불가능
            remoteCar.isControllable = false;

            // 초기 위치 설정
            if (remoteCar.car && remoteCar.car.chassisBody && playerData && playerData.position) {
                const body = remoteCar.car.chassisBody;
                body.position.set(
                    playerData.position.x || 0,
                    playerData.position.y || 4,
                    playerData.position.z || 0
                );

                if (playerData.quaternion) {
                    body.quaternion.set(
                        playerData.quaternion.x || 0,
                        playerData.quaternion.y || 0,
                        playerData.quaternion.z || 0,
                        playerData.quaternion.w || 1
                    );
                }
            }

            // 색상 설정 (플레이어별 고유 색상)
            if (remoteCar.chassis && remoteCar.chassis.material) {
                const color = playerData && playerData.color ? playerData.color : 0x00ff00; // 기본 녹색
                remoteCar.chassis.material.color.setHex(color);
                console.log('🎨 자동차 색상 설정:', playerId, color.toString(16));
            }

            // 자동차 맵에 추가
            this.cars.set(playerId, remoteCar);

            console.log('🚙 원격 자동차 생성 완료:', playerId);
        } catch (error) {
            console.error('❌ 원격 자동차 생성 실패:', error, playerData);
        }
    }

    // 내 자동차 위치 업데이트
    _updateMyCarPosition(playerData) {
        const myCar = this.cars.get(this.playerId);
        if (myCar && myCar.car && myCar.car.chassisBody && playerData.position) {
            const body = myCar.car.chassisBody;
            body.position.set(
                playerData.position.x,
                playerData.position.y,
                playerData.position.z
            );

            if (playerData.quaternion) {
                body.quaternion.set(
                    playerData.quaternion.x,
                    playerData.quaternion.y,
                    playerData.quaternion.z,
                    playerData.quaternion.w
                );
            }

            console.log('🔄 내 자동차 위치 업데이트:', playerData.position);
        }
    }

    // 카운트다운 시작
    _startCountdown() {
        console.log('⏰ 카운트다운 시작');

        const countdownElement = document.getElementById('countdown');
        if (!countdownElement) return;

        let count = 5;
        countdownElement.style.display = 'block';
        countdownElement.style.fontSize = '72px';
        countdownElement.style.color = 'white';
        countdownElement.style.textAlign = 'center';
        countdownElement.style.position = 'fixed';
        countdownElement.style.top = '50%';
        countdownElement.style.left = '50%';
        countdownElement.style.transform = 'translate(-50%, -50%)';
        countdownElement.style.zIndex = '1000';

        // 모든 자동차 조작 비활성화
        this.cars.forEach((car) => {
            car.isControllable = false;
        });

        const interval = setInterval(() => {
            if (count > 0) {
                countdownElement.innerText = count;
                count--;
            } else {
                clearInterval(interval);
                countdownElement.innerText = 'GO!';
                setTimeout(() => {
                    countdownElement.style.display = 'none';
                }, 1000);
            }
        }, 1000);
    }

    // 게임 시작 처리
    _handleGameStart() {
        console.log('🏁 게임 시작!');

        this.isGameStarted = true;

        // 내 자동차만 조작 가능하게 설정
        const myCar = this.cars.get(this.playerId);
        if (myCar) {
            myCar.isControllable = true;
        }
    }
}

// 게임 시작
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const game = new MultiplayerCarGame();
        await game.init();
    } catch (error) {
        console.error('❌ 게임 초기화 실패:', error);
        alert('게임을 시작할 수 없습니다. 로비로 돌아갑니다.');
        window.location.href = '/';
    }
});