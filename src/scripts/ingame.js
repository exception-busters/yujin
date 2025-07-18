import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import * as CANNON from 'cannon-es';
import { GLTFLoader } from 'https://unpkg.com/three@0.165.0/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'https://unpkg.com/three@0.165.0/examples/jsm/loaders/DRACOLoader.js';
import cannonDebugger from 'https://unpkg.com/cannon-es-debugger@1.0.0/dist/cannon-es-debugger.js';

import Car from './car.js';
// 충돌체 생성기 임포트 (현재 사용하지 않음)
// import { CollisionMeshGenerator, CollisionUtils } from './collision-mesh-generator.js';

const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/');

const gltfLoader = new GLTFLoader();
gltfLoader.setDRACOLoader(dracoLoader);


var stats = new Stats();
stats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
stats.dom.id = 'stats-panel'; // CSS에서 스타일링하기 위한 ID 추가
document.body.appendChild(stats.dom);
/**
 * Base
 */
// Canvas
const canvas = document.querySelector('canvas.webgl')
const scene = new THREE.Scene()
// scene.fog = new THREE.Fog( 0xFF6000, 10, 50 );
//scene.background = new THREE.Color(0xFF6000);

/**
 * Sizes
 */
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
}

/**
 * Camera
 */
// Base camera
const camera = new THREE.PerspectiveCamera(50, sizes.width / sizes.height, 0.1, 10000)
camera.position.set(0, 10, -15)
scene.add(camera)

// Controls
const controls = new OrbitControls(camera, canvas)
controls.enabled = false;

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
    canvas: canvas
})
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap; // 부드러운 그림자


/**
 * Lights
 */
// Ambient Light (전체 밝기)
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6); // 밝기 60%
scene.add(ambientLight);
// Directional Light (태양처럼 비추기)
const dirLight = new THREE.DirectionalLight(0xFFFFFF, 0.8);
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
scene.add(dirLight);

function applyGraphicSettings() {
    const quality = localStorage.getItem('graphicQuality') || 'medium'; // Default to medium
    let pixelRatio = Math.min(window.devicePixelRatio, 2);
    let shadowMapSize = 4096;

    switch (quality) {
        case 'low':
            pixelRatio = 1;
            shadowMapSize = 1024;
            break;
        case 'medium':
            pixelRatio = Math.min(window.devicePixelRatio, 1.5);
            shadowMapSize = 2048;
            break;
        case 'high':
            pixelRatio = Math.min(window.devicePixelRatio, 2);
            shadowMapSize = 4096;
            break;
    }

    renderer.setPixelRatio(pixelRatio);
    dirLight.shadow.mapSize.width = shadowMapSize;
    dirLight.shadow.mapSize.height = shadowMapSize;
    if (dirLight.shadow.map) { // Check if map exists before disposing
        dirLight.shadow.map.dispose(); // Dispose old shadow map
        dirLight.shadow.map = null; // Clear reference
    }
    dirLight.shadow.needsUpdate = true; // Request new shadow map
    console.log(`Applied graphic settings: ${quality}, Pixel Ratio: ${pixelRatio}, Shadow Map Size: ${shadowMapSize}`);
}

// Apply settings on initial load
applyGraphicSettings();

window.addEventListener('resize', () => {
    // Update sizes
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight

    // Update camera
    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()

    // Update renderer and graphic settings
    renderer.setSize(sizes.width, sizes.height)
    applyGraphicSettings();
})

const world = new CANNON.World({
    gravity: new CANNON.Vec3(0, -9.82, 0), // m/s²
})
world.broadphase = new CANNON.SAPBroadphase(world);
// Cannon.js 디버거 (충돌체 시각화) - 필요시 주석 해제
// const debugRenderer = cannonDebugger(scene, world.bodies, {color: 0x00ff00});
// 사용법: tick() 함수에서 debugRenderer.update() 호출

// Define materials
const groundMaterial = new CANNON.Material('ground');
const chassisMaterial = new CANNON.Material('chassis');

// Define interaction between materials
const groundChassisContactMaterial = new CANNON.ContactMaterial(
    groundMaterial,
    chassisMaterial,
    {
        friction: 0.5,      // Friction between chassis and ground
        restitution: 0,     // No bounciness
        contactEquationStiffness: 1e7,
        contactEquationRelaxation: 3
    }
);
world.addContactMaterial(groundChassisContactMaterial);

const car = new Car(scene, world, chassisMaterial); // Pass the chassis material to the car
const countdownElement = document.getElementById('countdown');
car.init().then(() => {
    car.update(camera);
    startCountdown();
});

function setCameraView(viewType) {
    // Use car.chassis.position and quaternion if available, otherwise default to (0,0,0) and identity quaternion
    const currentCarPosition = car.chassis ? car.chassis.position : new THREE.Vector3(0, 0, 0);
    const currentCarQuaternion = car.chassis ? car.chassis.quaternion : new THREE.Quaternion();

    let cameraPosition = new THREE.Vector3();
    let lookAtTarget = currentCarPosition.clone();

    switch (viewType) {
        case 'front':
            cameraPosition.set(currentCarPosition.x, currentCarPosition.y + 6, currentCarPosition.z + 15); // In front of the car
            break;
        case 'left':
            cameraPosition.set(currentCarPosition.x - 7, currentCarPosition.y + 6, currentCarPosition.z + 5); // To the left of the car
            break;
        case 'right':
            cameraPosition.set(currentCarPosition.x + 7, currentCarPosition.y + 6, currentCarPosition.z + 5); // To the right of the car
            break;
        case 'chase':
            // Calculate chase camera position based on current car position and orientation
            const cameraOffset = new THREE.Vector3(0, 5.5, -15); // This is the offset from car.js
            const worldOffset = cameraOffset.clone().applyQuaternion(currentCarQuaternion);
            cameraPosition = currentCarPosition.clone().add(worldOffset);
            break;
    }
    camera.position.copy(cameraPosition);
    camera.lookAt(lookAtTarget);
}

function startCountdown() {
    let count = 5;
    countdownElement.style.display = 'block';
    car.isControllable = false; // Ensure car is not controllable during countdown

    const countdownBeep = document.getElementById('countdown-beep');
    const raceStart = document.getElementById('race-start');

    const countdownInterval = setInterval(() => {
        if (count > 0) {
            countdownElement.innerText = count;
            countdownBeep.currentTime = 0;

            if (count === 5) {
                setCameraView('front');
            } else if (count === 4) {
                setCameraView('left');
            } else if (count === 3) {
                setCameraView('chase');
                countdownBeep.play();
            } else if (count === 2) {
                countdownBeep.play();
            } else if (count === 1) {
                countdownBeep.play();
            }
            count--;
        } else {
            clearInterval(countdownInterval);
            countdownElement.style.display = 'none';
            car.isControllable = true;
            raceStart.currentTime = 0;
            raceStart.play();
        }
    }, 1000);
}




/**
 * Cube Texture Loader
 */




/**
 * Floor
 */
// Create a large, thin box to act as the ground
const floorShape = new CANNON.Box(new CANNON.Vec3(1000, 0.1, 1000)); // Correctly create a wide, thin box
const floorBody = new CANNON.Body({
    mass: 0, // mass = 0 makes it static
    material: groundMaterial,
    shape: floorShape,
    collisionFilterGroup: 1,
    collisionFilterMask: 1
});
floorBody.position.set(0, -0.1, 0); // Position it just below y=0
world.addBody(floorBody);

gltfLoader.load(
    '../../assets/racing_map_1.glb',
    (gltf) => {
        const model = gltf.scene;
        model.scale.set(1, 1, 1);
        model.position.set(0, -0.5, 0); // 물리 지면과 동일한 높이로 조정

        // 그림자 설정
        model.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });

        scene.add(model);

        console.log('✅ 레이싱 맵 로드 완료');

        // 충돌체 생성 완전 비활성화 (안전 모드)
        console.log('🛡️ 안전 모드: 모든 GLB 충돌체 생성 비활성화');
        console.log('🛡️ 기본 바닥 충돌체만 사용하여 차량 안정성 확보');

        /*
        // 1단계: 단일 큰 Box 충돌체 테스트 (현재 비활성화)
        console.log('🧪 1단계: 단일 큰 Box 충돌체 테스트');
        
        try {
            // 모델 전체에 대한 바운딩 박스 계산
            const modelBox = new THREE.Box3().setFromObject(model);
            
            const sizeX = (modelBox.max.x - modelBox.min.x) / 2;
            const sizeY = (modelBox.max.y - modelBox.min.y) / 2;
            const sizeZ = (modelBox.max.z - modelBox.min.z) / 2;
            
            console.log(`모델 전체 크기: ${(sizeX*2).toFixed(1)} x ${(sizeY*2).toFixed(1)} x ${(sizeZ*2).toFixed(1)}`);
            
            // 안전한 크기 제한 (너무 크면 문제 발생 가능)
            if (sizeX > 500 || sizeY > 500 || sizeZ > 500) {
                console.log('⚠️ 모델이 너무 큽니다. 충돌체 생성을 건너뜁니다.');
            } else {
                // 단일 Box 충돌체 생성
                const boxShape = new CANNON.Box(new CANNON.Vec3(sizeX, sizeY, sizeZ));
                const testCollisionBody = new CANNON.Body({ 
                    mass: 0, 
                    material: new CANNON.Material('test-collision')
                });
                testCollisionBody.addShape(boxShape);
                
                // 위치 설정 (모델 중심)
                const centerX = (modelBox.max.x + modelBox.min.x) / 2;
                const centerY = (modelBox.max.y + modelBox.min.y) / 2;
                const centerZ = (modelBox.max.z + modelBox.min.z) / 2;
                
                testCollisionBody.position.set(centerX, centerY, centerZ);
                
                world.addBody(testCollisionBody);
                console.log(`✅ 테스트 충돌체 생성 완료 (위치: ${centerX.toFixed(1)}, ${centerY.toFixed(1)}, ${centerZ.toFixed(1)})`);
            }
            
        } catch (error) {
            console.error('❌ 테스트 충돌체 생성 실패:', error);
        }
        
        // 2단계: 개별 메쉬 충돌체 생성 (현재 비활성화 - 1단계 테스트 후 활성화)
        console.log('🚫 2단계: 개별 메쉬 충돌체 생성 비활성화 (안전 모드)');
        
        /*
        // 2단계 코드는 1단계 테스트 성공 후 활성화 예정
        console.log('🧪 2단계: 개별 메쉬 충돌체 생성 시작...');
        
        try {
            const generator = new CollisionMeshGenerator(world);
            let meshCount = 0;
            let collisionCount = 0;
            const createdBodies = [];

            model.traverse((child) => {
                if (child.isMesh && child.geometry) {
                    meshCount++;
                    const meshName = child.name || `mesh_${meshCount}`;
                    console.log(`메쉬 ${meshCount}: ${meshName}`);

                    // 메쉬 크기 분석
                    const geometry = child.geometry;
                    geometry.computeBoundingBox();
                    const box = geometry.boundingBox;

                    const sizeX = box.max.x - box.min.x;
                    const sizeY = box.max.y - box.min.y;
                    const sizeZ = box.max.z - box.min.z;
                    const volume = sizeX * sizeY * sizeZ;

                    // 메쉬 크기 정보 출력
                    console.log(`  📏 메쉬 크기: ${sizeX.toFixed(2)} x ${sizeY.toFixed(2)} x ${sizeZ.toFixed(2)}, 부피: ${volume.toFixed(4)}`);

                    // 너무 작은 메쉬는 무시 (안전한 임계값)
                    if (volume < 0.01) {
                        console.log(`  ⏭️ 작은 메쉬 무시 (부피: ${volume.toFixed(4)})`);
                        return;
                    }

                    // 안전 모드: 모든 메쉬를 Box로 생성
                    let collisionType = 'box';
                    let shouldCreate = true;

                    // 메쉬 이름 기반 분류 (정보용)
                    const lowerName = meshName.toLowerCase();
                    if (lowerName.includes('ground') || lowerName.includes('floor') || lowerName.includes('road') || lowerName.includes('track')) {
                        console.log(`  🛣️ 지면 메쉬 감지 - Box 사용`);
                    } else if (lowerName.includes('wall') || lowerName.includes('barrier') || lowerName.includes('building')) {
                        console.log(`  🏢 벽/건물 메쉬 감지 - Box 사용`);
                    } else if (lowerName.includes('detail') || lowerName.includes('decoration')) {
                        console.log(`  🎨 장식 메쉬 감지 - Box 사용`);
                    } else {
                        console.log(`  📦 일반 메쉬 - Box 사용`);
                    }

                    if (!shouldCreate) return;

                    // 안전한 Box 충돌체 생성
                    try {
                        const collisionBody = generator.createBoxCollision(child, new CANNON.Material('track'), 0);

                        if (collisionBody) {
                            // 모델의 위치 적용 (안전하게)
                            collisionBody.position.x += model.position.x;
                            collisionBody.position.y += model.position.y;
                            collisionBody.position.z += model.position.z;

                            // world에 충돌체 추가
                            world.addBody(collisionBody);

                            createdBodies.push(collisionBody);
                            collisionCount++;
                            console.log(`  ✅ Box 충돌체 생성 완료`);
                        } else {
                            console.log(`  ❌ 충돌체 생성 실패 - null 반환`);
                        }

                    } catch (error) {
                        console.error(`  ❌ ${meshName} 충돌체 생성 실패:`, error);
                    }
                }
            });

            console.log(`✅ 개별 메쉬 충돌체 생성 완료:`);
            console.log(`   📊 분석된 메쉬: ${meshCount}개`);
            console.log(`   🎯 생성된 충돌체: ${collisionCount}개`);

        } catch (error) {
            console.error('❌ 개별 메쉬 충돌체 생성 실패:', error);
        }
        */

        /*
        try {
        try {
            const generator = new CollisionMeshGenerator(world);
            let meshCount = 0;
            let collisionCount = 0;
            const createdBodies = [];

            model.traverse((child) => {
                if (child.isMesh && child.geometry) {
                    meshCount++;
                    const meshName = child.name || `mesh_${meshCount}`;
                    console.log(`메쉬 ${meshCount}: ${meshName}`);

                    // 메쉬 크기 분석
                    const geometry = child.geometry;
                    geometry.computeBoundingBox();
                    const box = geometry.boundingBox;

                    const sizeX = box.max.x - box.min.x;
                    const sizeY = box.max.y - box.min.y;
                    const sizeZ = box.max.z - box.min.z;
                    const volume = sizeX * sizeY * sizeZ;

                    // 메쉬 크기 정보 출력
                    console.log(`  📏 메쉬 크기: ${sizeX.toFixed(2)} x ${sizeY.toFixed(2)} x ${sizeZ.toFixed(2)}, 부피: ${volume.toFixed(4)}`);

                    // 너무 작은 메쉬는 무시 (임계값 낮춤)
                    if (volume < 0.0001) {
                        console.log(`  ⏭️ 너무 작은 메쉬 무시 (부피: ${volume.toFixed(6)})`);
                        return;
                    }

                    // 테스트 모드: 모든 메쉬에 대해 Box 충돌체 생성
                    let collisionType = 'box'; // 모든 것을 Box로 (테스트)
                    let shouldCreate = true; // 모든 메쉬에 충돌체 생성

                    // 메쉬 이름 기반 분류 (정보 출력용)
                    const lowerName = meshName.toLowerCase();
                    if (lowerName.includes('ground') || lowerName.includes('floor') || lowerName.includes('road') || lowerName.includes('track')) {
                        console.log(`  🛣️ 지면 메쉬 감지 - Box 사용 (테스트 모드)`);
                    } else if (lowerName.includes('wall') || lowerName.includes('barrier') || lowerName.includes('building')) {
                        console.log(`  🏢 벽/건물 메쉬 감지 - Box 사용`);
                    } else if (lowerName.includes('detail') || lowerName.includes('decoration')) {
                        console.log(`  � 장식 메쉬 감 지 - Box 사용 (테스트 모드에서 강제 생성)`);
                    } else if (volume > 100) {
                        console.log(`  📦 큰 메쉬 감지 - Box 사용 (부피: ${volume.toFixed(1)})`);
                    } else {
                        console.log(`  📦 일반 메쉬 - Box 사용 (테스트 모드)`);
                    }

                    // 부피 필터링도 완화 (테스트)
                    if (volume < 0.01) {
                        console.log(`  ⚠️ 매우 작은 메쉬이지만 테스트 모드에서 생성 시도`);
                    }

                    if (!shouldCreate) return;

                    // 충돌체 생성
                    try {
                        let collisionBody;

                        if (collisionType === 'trimesh') {
                            // Trimesh는 버텍스 수 제한
                            const vertexCount = geometry.attributes.position.count;
                            if (vertexCount > 500) {
                                console.log(`  ⚠️ 버텍스 수 초과 (${vertexCount}), Box로 대체`);
                                collisionBody = generator.createBoxCollision(child, new CANNON.Material('track'), 0);
                            } else {
                                collisionBody = generator.createTrimeshCollision(child, new CANNON.Material('track'), 0);
                            }
                        } else if (collisionType === 'convex') {
                            collisionBody = generator.createConvexCollision(child, new CANNON.Material('track'), 0);
                        } else {
                            collisionBody = generator.createBoxCollision(child, new CANNON.Material('track'), 0);
                        }

                        if (collisionBody) {
                            // 모델의 위치와 회전 적용
                            collisionBody.position.x += model.position.x;
                            collisionBody.position.y += model.position.y;
                            collisionBody.position.z += model.position.z;

                            // ⭐ 중요: world에 충돌체 추가
                            world.addBody(collisionBody);

                            createdBodies.push(collisionBody);
                            collisionCount++;
                            console.log(`  ✅ ${collisionType} 충돌체 생성 및 world 추가 완료`);
                        } else {
                            console.log(`  ❌ 충돌체 생성 실패 - null 반환`);
                        }

                    } catch (error) {
                        console.error(`  ❌ ${meshName} 충돌체 생성 실패:`, error);
                        // 실패시 간단한 Box 충돌체로 대체
                        try {
                            const fallbackBody = generator.createBoxCollision(child, new CANNON.Material('track'), 0);
                            if (fallbackBody) {
                                fallbackBody.position.x += model.position.x;
                                fallbackBody.position.y += model.position.y;
                                fallbackBody.position.z += model.position.z;
                                createdBodies.push(fallbackBody);
                                collisionCount++;
                                console.log(`  🔄 Box 충돌체로 대체 생성 완료`);
                            }
                        } catch (fallbackError) {
                            console.error(`  ❌ 대체 충돌체도 실패:`, fallbackError);
                        }
                    }
                }
            });

            console.log(`✅ 스마트 충돌체 생성 완료:`);
            console.log(`   📊 분석된 메쉬: ${meshCount}개`);
            console.log(`   🎯 생성된 충돌체: ${collisionCount}개`);
            console.log(`   ⚡ 성능 최적화 적용됨`);

            // 기본 바닥 충돌체 유지 (안전장치)
            console.log('🛡️ 기본 바닥 충돌체 유지 (안전장치로 GLB 충돌체와 함께 사용)');
            // if (collisionCount > 0) {
            //     console.log('🗑️ 기본 바닥 충돌체 제거 (GLB 충돌체로 대체)');
            //     world.removeBody(floorBody);
            // }

        } catch (error) {
            console.error('❌ 스마트 충돌체 생성 실패:', error);
            console.log('✅ 기본 바닥 충돌체를 유지합니다.');
        }
    },
    (progress) => {
        console.log('맵 로딩 진행률:', (progress.loaded / progress.total * 100) + '%');
    },
    (error) => {
        console.error('맵 로딩 실패:', error);
    }
);

/**
 * Animate
 */
        const clock = new THREE.Clock();
        let oldElapsedTime = 0;

        const tick = () => {
            stats.begin();

            const elapsedTime = clock.getElapsedTime();
            const deltaTime = elapsedTime - oldElapsedTime;
            oldElapsedTime = elapsedTime;

            // Physics world update
            world.step(1 / 60, deltaTime);

            // Render
            renderer.render(scene, camera)
            stats.end();

            // Call tick again on the next frame
            window.requestAnimationFrame(tick)
        }

        tick()

        // 장애물(Obstacle) 추가: 자동차 정가운데(x=0) 피해서 x=3에 생성
        const obstacleSize = 1; // half-extent, 실제 크기는 2x2x2
        const obstacleShape = new CANNON.Box(new CANNON.Vec3(obstacleSize, obstacleSize, obstacleSize));
        const obstacleBody = new CANNON.Body({
            mass: 0, // 정적 장애물
            position: new CANNON.Vec3(0, 1, 10), // y=1로 지면 위에 놓임
            collisionFilterGroup: 1,
            collisionFilterMask: 1
        });
        obstacleBody.addShape(obstacleShape);
        world.addBody(obstacleBody);

        // THREE.js Mesh로 시각화
        const obstacleGeometry = new THREE.BoxGeometry(2 * obstacleSize, 2 * obstacleSize, 2 * obstacleSize);
        const obstacleMaterial = new THREE.MeshStandardMaterial({ color: 0xff3333 });
        const obstacleMesh = new THREE.Mesh(obstacleGeometry, obstacleMaterial);
        obstacleMesh.position.set(0, 1, 10);
        obstacleMesh.castShadow = true;
        obstacleMesh.receiveShadow = true;
        scene.add(obstacleMesh);
    },
    (progress) => {
        console.log('맵 로딩 진행률:', (progress.loaded / progress.total * 100) + '%');
    },
    (error) => {
        console.error('맵 로딩 실패:', error);
    }
);

/**
 * Animate
 */
const clock = new THREE.Clock();
let oldElapsedTime = 0;

const tick = () => {
    stats.begin();

    const elapsedTime = clock.getElapsedTime();
    const deltaTime = elapsedTime - oldElapsedTime;
    oldElapsedTime = elapsedTime;

    // Physics world update
    world.step(1 / 60, deltaTime);

    // Render
    renderer.render(scene, camera)
    stats.end();

    // Call tick again on the next frame
    window.requestAnimationFrame(tick)
}

tick()