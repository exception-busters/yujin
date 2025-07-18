
import * as THREE from 'three';
import * as CANNON from 'cannon-es';

import { GLTFLoader } from 'https://unpkg.com/three@0.165.0/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'https://unpkg.com/three@0.165.0/examples/jsm/loaders/DRACOLoader.js';

export default class Car {
    constructor(scene, world, chassisMaterial) {
        this.scene = scene;
        this.world = world;
        this.chassisMaterial = chassisMaterial; // Store the material

        this.car = {};
        this.chassis = {};
        this.wheels = [];
        this.chassisDimension = {
            x: 1.8,
            y: 1.0,
            z: 3.7
        };

        // 차체와 바퀴의 시각적 정렬을 위한 오프셋
        this.chassisModelPos = {
            x: 0,
            y: -0.7, // 차체를 바퀴에 더 가깝게 배치
            z: 0
        };

        this.wheelScale = {
            frontWheel: 1.1,
            hindWheel: 1.1
        };
        this.mass = 250;
        this.isControllable = false;
    }

    init() {
        return new Promise((resolve) => {
            this.controls();
            this.loadModels(resolve);
        });
    }

    loadModels(resolve) {
        console.log('Car: Starting model loading...');
        const gltfLoader = new GLTFLoader();
        const dracoLoader = new DRACOLoader();

        dracoLoader.setDecoderConfig({ type: 'js' })
        dracoLoader.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/');

        gltfLoader.setDRACOLoader(dracoLoader);

        gltfLoader.load("../../assets/chassis.glb", gltf => {
            console.log('Car: chassis.glb loaded successfully.');
            this.chassis = gltf.scene;
            this.chassis.traverse(function (object) {
                if (object.isMesh) {
                    object.castShadow = true
                    object.material = new THREE.MeshToonMaterial({ color: 0xFF55BB })
                }
            })

            // Add AxesHelper to the chassis
            const axesHelper = new THREE.AxesHelper(5); // Size of the axes
            this.chassis.add(axesHelper);

            this.scene.add(this.chassis);

            // Now that chassis model is loaded, set up physics body and wheels
            this.setChassis();
            this.setWheels();

            resolve(); // Resolve the promise when chassis is loaded and physics body is set
        }, undefined, error => {
            console.error('Car: Error loading chassis.glb:', error);
        })

        this.wheels = [];
        for (let i = 0; i < 4; i++) {
            gltfLoader.load("../../assets/wheels.glb", gltf => {
                console.log(`Car: wheels.glb for wheel ${i} loaded successfully.`);
                const model = gltf.scene;
                this.wheels[i] = model;
                if (i === 1 || i === 3)
                    this.wheels[i].scale.set(-1 * this.wheelScale.frontWheel, 1 * this.wheelScale.frontWheel, -1 * this.wheelScale.frontWheel);
                else
                    this.wheels[i].scale.set(1 * this.wheelScale.frontWheel, 1 * this.wheelScale.frontWheel, 1 * this.wheelScale.frontWheel);
                this.scene.add(this.wheels[i]);
            }, undefined, error => {
                console.error(`Car: Error loading wheels.glb for wheel ${i}:`, error);
            })
        }
    }

    setChassis() {
        console.log('Car: Setting up chassis...');
        const chassisShape = new CANNON.Box(new CANNON.Vec3(this.chassisDimension.x * 1, this.chassisDimension.y * 0.55, this.chassisDimension.z * 1));
        const chassisBody = new CANNON.Body({
            mass: this.mass,
            material: this.chassisMaterial,
            collisionFilterGroup: 1,
            collisionFilterMask: 1
        });
        chassisBody.addShape(chassisShape);
        chassisBody.position.set(0, 1, 0); // 더 낮은 초기 위치
        chassisBody.angularDamping = 0.9;

        this.car = new CANNON.RaycastVehicle({
            chassisBody,
            indexRightAxis: 0,
            indexUpAxis: 1,
            indexForwardAxis: 2
        });
        this.car.addToWorld(this.world);
    }

    setWheels() {
        console.log('Car: Setting up wheels...');
        this.car.wheelInfos = [];
        this.car.addWheel({
            radius: 0.35,
            directionLocal: new CANNON.Vec3(0, -1, 0),
            suspensionStiffness: 100,
            suspensionRestLength: 0.4, // 바퀴를 차체에 더 가깝게
            frictionSlip: 40,
            dampingRelaxation: 2.3,
            dampingCompression: 4.3,
            maxSuspensionForce: 20000,
            rollInfluence: 0.1,
            axleLocal: new CANNON.Vec3(-1, 0, 0),
            chassisConnectionPointLocal: new CANNON.Vec3(1.7, -0.1, -2.7),
            maxSuspensionTravel: 0.1,
            customSlidingRotationalSpeed: 20,
        });
        this.car.addWheel({
            radius: 0.35,
            directionLocal: new CANNON.Vec3(0, -1, 0),
            suspensionStiffness: 100,
            suspensionRestLength: 0.4, // 바퀴를 차체에 더 가깝게
            frictionSlip: 40,
            dampingRelaxation: 2.3,
            dampingCompression: 4.3,
            maxSuspensionForce: 20000,
            rollInfluence: 0.1,
            axleLocal: new CANNON.Vec3(-1, 0, 0),
            chassisConnectionPointLocal: new CANNON.Vec3(-1.7, -0.1, -2.7),
            maxSuspensionTravel: 0.1,
            customSlidingRotationalSpeed: 20,
        });
        this.car.addWheel({
            radius: 0.35,
            directionLocal: new CANNON.Vec3(0, -1, 0),
            suspensionStiffness: 100,
            suspensionRestLength: 0.4, // 바퀴를 차체에 더 가깝게
            frictionSlip: 40,
            dampingRelaxation: 2.3,
            dampingCompression: 4.3,
            maxSuspensionForce: 20000,
            rollInfluence: 0.1,
            axleLocal: new CANNON.Vec3(-1, 0, 0),
            chassisConnectionPointLocal: new CANNON.Vec3(1.7, -0.1, 2.7),
            maxSuspensionTravel: 0.1,
            customSlidingRotationalSpeed: 20,
        });
        this.car.addWheel({
            radius: 0.35,
            directionLocal: new CANNON.Vec3(0, -1, 0),
            suspensionStiffness: 100,
            suspensionRestLength: 0.4, // 바퀴를 차체에 더 가깝게
            frictionSlip: 40,
            dampingRelaxation: 2.3,
            dampingCompression: 4.3,
            maxSuspensionForce: 20000,
            rollInfluence: 0.1,
            axleLocal: new CANNON.Vec3(-1, 0, 0),
            chassisConnectionPointLocal: new CANNON.Vec3(-1.7, -0.1, 2.7),
            maxSuspensionTravel: 0.1,
            customSlidingRotationalSpeed: 20,
        });


    }

    controls() {
        const maxSteerVal = 0.3;
        const maxForce = 750;
        const brakeForce = 36;
        const slowDownCar = 25;
        const keysPressed = [];

        window.addEventListener('keydown', (e) => {
            if (!this.isControllable) return;
            // e.preventDefault();
            if (!keysPressed.includes(e.key.toLowerCase())) keysPressed.push(e.key.toLowerCase());
            hindMovement();
        });
        window.addEventListener('keyup', (e) => {
            if (!this.isControllable) return;
            // e.preventDefault();
            keysPressed.splice(keysPressed.indexOf(e.key.toLowerCase()), 1);
            hindMovement();
        });

        const hindMovement = () => {
            if (keysPressed.includes("r") || keysPressed.includes("r")) resetCar();

            if (!keysPressed.includes(" ") && !keysPressed.includes(" ")) {
                this.car.setBrake(0, 0);
                this.car.setBrake(0, 1);
                this.car.setBrake(0, 2);
                this.car.setBrake(0, 3);

                // 속도 기반 조향각 계산
                const currentSpeed = this.car.chassisBody.velocity.length();
                const speedFactor = Math.max(0.3, 1 - (currentSpeed * 0.005)); // 속도가 높을수록 조향각 감소
                const adjustedSteerVal = maxSteerVal * speedFactor;

                if (keysPressed.includes("a") || keysPressed.includes("arrowleft")) {
                    this.car.setSteeringValue(adjustedSteerVal * 1, 2);
                    this.car.setSteeringValue(adjustedSteerVal * 1, 3);
                }
                else if (keysPressed.includes("d") || keysPressed.includes("arrowright")) {
                    this.car.setSteeringValue(adjustedSteerVal * -1, 2);
                    this.car.setSteeringValue(adjustedSteerVal * -1, 3);
                }
                else stopSteer();

                if (keysPressed.includes("w") || keysPressed.includes("arrowup")) {
                    this.car.applyEngineForce(maxForce * -1, 0);
                    this.car.applyEngineForce(maxForce * -1, 1);
                    this.car.applyEngineForce(maxForce * -1, 2);
                    this.car.applyEngineForce(maxForce * -1, 3);
                }
                else if (keysPressed.includes("s") || keysPressed.includes("arrowdown")) {
                    this.car.applyEngineForce(maxForce * 1, 0);
                    this.car.applyEngineForce(maxForce * 1, 1);
                    this.car.applyEngineForce(maxForce * 1, 2);
                    this.car.applyEngineForce(maxForce * 1, 3);
                }
                else stopCar();
            }
            else
                brake();
        }

        const resetCar = () => {
            this.car.chassisBody.position.set(0, 5, 0);
            this.car.chassisBody.quaternion.set(0, 0, 0, 1);
            this.car.chassisBody.angularVelocity.set(0, 0, 0);
            this.car.chassisBody.velocity.set(0, 0, 0);
        }

        const brake = () => {
            this.car.setBrake(brakeForce, 0);
            this.car.setBrake(brakeForce, 1);
            this.car.setBrake(brakeForce, 2);
            this.car.setBrake(brakeForce, 3);
        }

        const stopCar = () => {
            this.car.setBrake(slowDownCar, 0);
            this.car.setBrake(slowDownCar, 1);
            this.car.setBrake(slowDownCar, 2);
            this.car.setBrake(slowDownCar, 3);
        }

        const stopSteer = () => {
            this.car.setSteeringValue(0, 2);
            this.car.setSteeringValue(0, 3);
        }


    }

    update(camera) {
        const updateWorld = () => {
            // 차체 3D 모델 위치/회전을 물리 바디와 동기화
            if (this.chassis && this.chassis.position) {
                // 회전을 고려한 오프셋 적용
                const chassisOffset = new THREE.Vector3(
                    this.chassisModelPos.x,
                    this.chassisModelPos.y,
                    this.chassisModelPos.z
                );

                // 차체의 회전에 따라 오프셋도 회전
                chassisOffset.applyQuaternion(this.car.chassisBody.quaternion);

                // 최종 위치 = 물리 위치 + 회전된 오프셋
                this.chassis.position.set(
                    this.car.chassisBody.position.x + chassisOffset.x,
                    this.car.chassisBody.position.y + chassisOffset.y,
                    this.car.chassisBody.position.z + chassisOffset.z
                );
                this.chassis.quaternion.copy(this.car.chassisBody.quaternion);
            }

            // 카메라를 차량에 따라 이동 (조작 가능할 때만)
            if (this.isControllable && this.chassis && this.chassis.position) {
                const chassisPosition = this.chassis.position;
                const cameraOffset = new THREE.Vector3(0, 5.5, -15);
                const worldOffset = cameraOffset.clone().applyQuaternion(this.chassis.quaternion);
                const cameraPosition = chassisPosition.clone().add(worldOffset);
                camera.position.copy(cameraPosition);
                camera.lookAt(chassisPosition);
            }

            // 바퀴 위치/회전을 물리 엔진과 완벽히 동기화
            for (let i = 0; i < 4; i++) {
                if (this.car.wheelInfos && this.car.wheelInfos[i] &&
                    this.wheels && this.wheels[i] &&
                    this.wheels[i].position && this.wheels[i].quaternion) {

                    this.car.updateWheelTransform(i);

                    // 바퀴의 물리적 위치를 시각적 모델에 적용
                    const wheelTransform = this.car.wheelInfos[i].worldTransform;
                    if (wheelTransform && wheelTransform.position && wheelTransform.quaternion) {
                        this.wheels[i].position.copy(wheelTransform.position);
                        this.wheels[i].quaternion.copy(wheelTransform.quaternion);
                    }

                    // 바퀴는 물리 엔진 위치를 그대로 사용 (오프셋 적용하지 않음)
                    // 차체만 chassisModelPos로 조정되어 상대적 위치 변경
                }
            }
        }
        this.world.addEventListener('postStep', updateWorld);
    }


}
