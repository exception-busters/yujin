// main.js
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import UIHandler from './UIHandler.js';
import NetworkManager from './NetworkManager.js';
import AudioManager from './AudioManager.js';

document.addEventListener('DOMContentLoaded', initializeGame);

function initializeGame() {
    const uiHandler = new UIHandler(null); // socket은 NetworkManager에서 주입
    const audioManager = new AudioManager(uiHandler);
    const networkManager = new NetworkManager(uiHandler, audioManager);

    uiHandler.socket = networkManager.socket;
    uiHandler.audioManager = audioManager; // UIHandler에 audioManager 인스턴스 전달
    uiHandler.initializeUI();
    audioManager.populateMicDevices();

    setupThreeJSScene();
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