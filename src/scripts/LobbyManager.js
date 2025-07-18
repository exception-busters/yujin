// LobbyManager.js - 로비 전용 기능 관리
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { GLTFLoader } from 'https://unpkg.com/three@0.165.0/examples/jsm/loaders/GLTFLoader.js';

import AudioManager from './AudioManager.js';
import UIHandler from './UIHandler.js';
import NetworkManager from './NetworkManager.js';
import Car from './car.js';

export default class LobbyManager {
    constructor() {
        this.isInitialized = false;
        this.uiHandler = null;
        this.audioManager = null;
        this.networkManager = null;
    }

    async initialize() {
        try {
            console.log('🔍 로비 매니저 초기화 시작...');
            
            // 로비 환경 검증
            if (!this.validateLobbyEnvironment()) {
                throw new Error('로비 환경이 아닙니다.');
            }
            console.log('✅ 로비 환경 검증 완료');

            // UI 요소들 수집 및 검증
            const requiredElements = this.collectRequiredElements();
            console.log('🔍 수집된 UI 요소들:', requiredElements);
            this.validateRequiredElements(requiredElements);
            console.log('✅ 필수 UI 요소 검증 완료');

            // 매니저들 초기화 (순서 중요)
            this.uiHandler = new UIHandler(null);
            this.audioManager = new AudioManager(this.uiHandler);
            this.networkManager = new NetworkManager(this.uiHandler, this.audioManager);

            // 상호 참조 설정
            this.uiHandler.socket = this.networkManager.socket;
            this.uiHandler.audioManager = this.audioManager;

            // UI 초기화 먼저 실행
            this.uiHandler.initializeUI();
            
            // Three.js 배경 임시 비활성화 (UI 문제 해결을 위해)
            // setTimeout(() => {
            //     this.setupThreeJSBackground();
            // }, 100);
            console.log('⚠️ Three.js 배경이 임시로 비활성화되었습니다 (UI 문제 해결용)');
            
            // 오디오 초기화는 비동기로 실행
            await this.audioManager.populateMicDevices();

            this.isInitialized = true;
            console.log('✅ 로비 매니저 초기화 완료');

        } catch (error) {
            console.error('❌ 로비 매니저 초기화 실패:', error);
            throw error;
        }
    }

    validateLobbyEnvironment() {
        // 로비 환경 확인 (게임 캔버스가 없어야 함)
        const gameCanvas = document.querySelector('canvas.webgl');
        const lobbyCanvas = document.querySelector('#bg');
        
        return !gameCanvas && lobbyCanvas;
    }

    collectRequiredElements() {
        return {
            // 필수 UI 요소들
            startGameBtn: document.getElementById('start-game'),
            trainingBtn: document.getElementById('training-button'),
            multiBtn: document.getElementById('multi-button'),
            optionBtn: document.getElementById('option'),
            
            // 오디오 관련 요소들
            lobbyBgm: document.getElementById('lobby-bgm'),
            hoverSound: document.getElementById('hover-sound'),
            clickSound: document.getElementById('click-sound'),
            
            // 배경 캔버스
            backgroundCanvas: document.querySelector('#bg')
        };
    }

    validateRequiredElements(elements) {
        const missing = [];
        
        // 필수 요소들 검증
        if (!elements.startGameBtn) missing.push('start-game button');
        if (!elements.backgroundCanvas) missing.push('background canvas');
        if (!elements.lobbyBgm) missing.push('lobby BGM');

        if (missing.length > 0) {
            throw new Error(`필수 UI 요소가 없습니다: ${missing.join(', ')}`);
        }
    }

    setupThreeJSBackground() {
        const canvas = document.querySelector('#bg');
        
        try {
            // Three.js 배경 설정 (CSS에서 이미 스타일 적용됨)
            const scene = new THREE.Scene();
            const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
            const renderer = new THREE.WebGLRenderer({ 
                canvas: canvas,
                alpha: true,  // 투명 배경 허용
                antialias: true
            });
            renderer.setSize(window.innerWidth, window.innerHeight);
            
            // CSS에서 이미 캔버스 스타일이 설정되어 있으므로 중복 설정 제거

            // 조명 설정
            const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
            scene.add(ambientLight);
            const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
            directionalLight.position.set(1, 1, 1).normalize();
            scene.add(directionalLight);

            // 물리 엔진 설정 (로비용 간단한 설정)
            const world = new CANNON.World();
            world.gravity.set(0, -9.82, 0);

            // 지면 설정
            const groundShape = new CANNON.Plane();
            const groundMaterial = new CANNON.Material('groundMaterial');
            const groundBody = new CANNON.Body({ mass: 0, material: groundMaterial });
            groundBody.addShape(groundShape);
            groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
            world.addBody(groundBody);

            // 맵 로드
            const gltfLoader = new GLTFLoader();
            gltfLoader.load('../../assets/racing_map_1.glb', (gltf) => {
                const map = gltf.scene;
                scene.add(map);
            });

            // 차량 설정 (로비용 - 조작 불가)
            const chassisMaterial = new CANNON.Material('chassisMaterial');
            const car = new Car(scene, world, chassisMaterial);
            car.init().then(() => {
                car.isControllable = false; // 로비에서는 조작 불가
            });

            // 물리 재료 설정
            const ground_chassis_cm = new CANNON.ContactMaterial(groundMaterial, chassisMaterial, {
                friction: 0.5,
                restitution: 0.3,
                contactEquationStiffness: 1e8,
                contactEquationRelaxation: 3,
            });
            world.addContactMaterial(ground_chassis_cm);

            // 애니메이션 루프
            let lastTime = 0;
            const animate = (currentTime) => {
                requestAnimationFrame(animate);

                const dt = currentTime - lastTime;
                if (dt > 0) {
                    world.step(1 / 60, dt / 1000, 10);
                }
                lastTime = currentTime;

                car.update(camera);
                renderer.render(scene, camera);
            };
            animate();

            // 리사이즈 이벤트
            window.addEventListener('resize', () => {
                camera.aspect = window.innerWidth / window.innerHeight;
                camera.updateProjectionMatrix();
                renderer.setSize(window.innerWidth, window.innerHeight);
            });

            console.log('✅ Three.js 배경 설정 완료');

        } catch (error) {
            console.error('❌ Three.js 배경 설정 실패:', error);
        }
    }

    destroy() {
        // 정리 작업
        if (this.audioManager) {
            this.audioManager.cleanup?.();
        }
        if (this.networkManager) {
            this.networkManager.disconnect?.();
        }
        
        this.isInitialized = false;
        console.log('🧹 로비 매니저 정리 완료');
    }
}