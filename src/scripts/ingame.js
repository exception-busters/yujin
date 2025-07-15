import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import * as CANNON from 'cannon-es';
import cannonDebugger from 'https://unpkg.com/cannon-es-debugger@1.0.0/dist/cannon-es-debugger.js';

import Car from './car.js';


var stats = new Stats();
stats.showPanel( 0 ); // 0: fps, 1: ms, 2: mb, 3+: custom
document.body.appendChild( stats.dom );
/**
 * Base
 */
// Canvas
const canvas = document.querySelector('canvas.webgl')
const scene = new THREE.Scene()
scene.fog = new THREE.Fog( 0xFF6000, 10, 50 );
scene.background = new THREE.Color(0xFF6000);

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
camera.position.set(0, 4, 6)
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

/**
 * Lights
 */
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

window.addEventListener('resize', () =>
{
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
//cannonDebugger(scene, world.bodies, {color: 0x00ff00})

const car = new Car(scene, world);
const countdownElement = document.getElementById('countdown');
car.init().then(() => {
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
            cameraPosition.set(currentCarPosition.x, currentCarPosition.y + 6, currentCarPosition.z + 12); // In front of the car
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

    const countdownInterval = setInterval(() => {
        if (count > 0) {
            countdownElement.innerText = count;
            if (count === 5) {
                setCameraView('front');
            } else if (count === 4) {
                setCameraView('left');
            } else if (count === 3) {
                setCameraView('right');
            } else if (count === 2) {
                // Switch to chase camera view
                setCameraView('chase');
            }
            count--;
        } else {
            clearInterval(countdownInterval);
            countdownElement.style.display = 'none';
            car.isControllable = true;
        }
    }, 1000);
}

const bodyMaterial = new CANNON.Material();
const groundMaterial = new CANNON.Material();
const bodyGroundContactMaterial = new CANNON.ContactMaterial(
    bodyMaterial,
    groundMaterial,
    {
        friction: 0.1,
        restitution: 0.3
    }
)
world.addContactMaterial(bodyGroundContactMaterial)


/**
 * Cube Texture Loader
 */


window.addEventListener('resize', () =>
{
    // Update sizes
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight

    // Update camera
    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()

    // Update renderer
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
})

/**
 * Floor
 */
const floorGeo = new THREE.PlaneGeometry(100, 100);
const floorMesh = new THREE.Mesh(
    floorGeo,
    new THREE.MeshToonMaterial({
        color: 0x454545
    })
)
floorMesh.rotation.x = -Math.PI * 0.5;
scene.add(floorMesh)

const floorS = new CANNON.Plane();
const floorB = new CANNON.Body();
floorB.mass = 0;

floorB.addShape(floorS);
world.addBody(floorB);

floorB.quaternion.setFromAxisAngle(
    new CANNON.Vec3(-1, 0, 0),
    Math.PI * 0.5
);

/**
 * Animate
 */
const timeStep = 1 / 60 // seconds
let lastCallTime

const tick = () =>
{
    stats.begin();
    // Update controls
    controls.update()

    const time = performance.now() / 1000 // seconds
    if (!lastCallTime) {
        world.step(timeStep)
    } else {
        const dt = time - lastCallTime
        world.step(timeStep, dt)
    }
    lastCallTime = time

    car.update(camera);

    // Render
    renderer.render(scene, camera)
    stats.end();

    // Call tick again on the next frame
    window.requestAnimationFrame(tick)
}

tick()