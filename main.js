import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
// dat.GUI is loaded globally via the script tag

// --- Basic Scene Setup ---
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 50;
camera.position.y = 20;
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('solar-system-canvas'), antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);

// --- Lighting ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);
const pointLight = new THREE.PointLight(0xffffff, 3.5, 400);
scene.add(pointLight);

// --- Controls ---
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;

// --- Texture Loader ---
const textureLoader = new THREE.TextureLoader();

// --- Helper Function to Create Celestial Bodies ---
// (Keep the createCelestialBody function exactly as it was)
function createCelestialBody(radius, texturePath, isEmissive = false, ringData = null) {
    const geometry = new THREE.SphereGeometry(radius, 32, 32);
    const texture = textureLoader.load(texturePath);
    let material;

    if (isEmissive) {
        material = new THREE.MeshBasicMaterial({ map: texture });
    } else {
        material = new THREE.MeshStandardMaterial({ map: texture });
    }

    const mesh = new THREE.Mesh(geometry, material);

    let ringMesh = null;
    if (ringData) {
        const ringGeometry = new THREE.RingGeometry(
            ringData.innerRadius,
            ringData.outerRadius,
            64
        );
        let ringMaterial;
        try {
            const ringTexture = textureLoader.load(ringData.texturePath);
             ringMaterial = new THREE.MeshBasicMaterial({
                map: ringTexture,
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.8
            });
        } catch (error) {
            console.warn(`Could not load ring texture: ${ringData.texturePath}. Using basic material.`);
             ringMaterial = new THREE.MeshBasicMaterial({
                 color: 0xaaaaaa,
                 side: THREE.DoubleSide,
                 transparent: true,
                 opacity: 0.5
             });
        }

        ringMesh = new THREE.Mesh(ringGeometry, ringMaterial);
        ringMesh.rotation.x = -0.5 * Math.PI;
        mesh.add(ringMesh);
    }

    return mesh;
}


// --- Helper Function to Create Orbit Paths ---
// *** Set fixed thickness here ***
function createOrbitPath(radius, color = 0xaaaaaa, segments = 128) {
    // Set the desired thickness directly as the second argument (tubeRadius)
    const fixedTubeRadius = 0.01; // <-- ADJUST THIS VALUE FOR THICKNESS
    const geometry = new THREE.TorusGeometry(radius, fixedTubeRadius, 8, segments);
    const material = new THREE.MeshBasicMaterial({
        color: color,
        side: THREE.DoubleSide
    });
    const orbitLine = new THREE.Mesh(geometry, material);
    orbitLine.rotation.x = Math.PI / 2; // Rotate to lie flat
    return orbitLine;
}


// --- Create Celestial Bodies ---
// (Same creation code as before)
const sun = createCelestialBody(5, 'sun_texture.jpg', true);
scene.add(sun);
const mercury = createCelestialBody(0.5, 'mercury_texture.jpg');
const venus = createCelestialBody(0.9, 'venus_texture.jpg');
const earth = createCelestialBody(1, 'earth_texture.jpg');
const moon = createCelestialBody(0.27, 'moon_texture.jpg');
const mars = createCelestialBody(0.7, 'mars_texture.jpg');
const jupiter = createCelestialBody(3.5, 'jupiter_texture.jpg');
const saturn = createCelestialBody(3, 'saturn_texture.jpg', false, {
    innerRadius: 3.8, outerRadius: 6, texturePath: 'saturn_ring_texture.jpg'
});
const uranus = createCelestialBody(2, 'uranus_texture.jpg');
const neptune = createCelestialBody(1.9, 'neptune_texture.jpg');


// --- Orbit Logic & Pivot Objects ---
// (Same pivot setup as before)
const mercuryOrbit = new THREE.Object3D();
const venusOrbit = new THREE.Object3D();
const earthOrbit = new THREE.Object3D();
const marsOrbit = new THREE.Object3D();
const jupiterOrbit = new THREE.Object3D();
const saturnOrbit = new THREE.Object3D();
const uranusOrbit = new THREE.Object3D();
const neptuneOrbit = new THREE.Object3D();
const moonOrbit = new THREE.Object3D(); // For moon around earth

mercuryOrbit.add(mercury);
venusOrbit.add(venus);
earthOrbit.add(earth);
earthOrbit.add(moonOrbit);
moonOrbit.add(moon);
marsOrbit.add(mars);
jupiterOrbit.add(jupiter);
saturnOrbit.add(saturn);
uranusOrbit.add(uranus);
neptuneOrbit.add(neptune);

scene.add(mercuryOrbit, venusOrbit, earthOrbit, marsOrbit, jupiterOrbit, saturnOrbit, uranusOrbit, neptuneOrbit);


// --- Orbital Distances & Initial Positions ---
// *** ENSURE THESE DISTANCES MATCH THE VALUES USED IN createOrbitPath below ***
const mercuryDistance = 8;
const venusDistance = 12;
const earthDistance = 16;
const moonDistance = 2; // Relative to Earth
const marsDistance = 22;
const jupiterDistance = 35;
const saturnDistance = 50;
const uranusDistance = 65;
const neptuneDistance = 75;

// Set planet positions RELATIVE to their pivot objects
mercury.position.x = mercuryDistance;
venus.position.x = venusDistance;
earth.position.x = earthDistance;
moon.position.x = moonDistance; // Moon relative to its pivot (which is at Earth's position)
mars.position.x = marsDistance;
jupiter.position.x = jupiterDistance;
saturn.position.x = saturnDistance;
uranus.position.x = uranusDistance;
neptune.position.x = neptuneDistance;


// --- Create and Add Orbit Paths ---
const orbitPaths = [];
const orbitColor = 0x555555;

// *** ENSURE THESE DISTANCES MATCH THE PLANET POSITIONING DISTANCES ABOVE ***
const mercuryOrbitPath = createOrbitPath(mercuryDistance, orbitColor);
const venusOrbitPath = createOrbitPath(venusDistance, orbitColor);
const earthOrbitPath = createOrbitPath(earthDistance, orbitColor);
const marsOrbitPath = createOrbitPath(marsDistance, orbitColor);
const jupiterOrbitPath = createOrbitPath(jupiterDistance, orbitColor);
const saturnOrbitPath = createOrbitPath(saturnDistance, orbitColor);
const uranusOrbitPath = createOrbitPath(uranusDistance, orbitColor);
const neptuneOrbitPath = createOrbitPath(neptuneDistance, orbitColor);

orbitPaths.push(
    mercuryOrbitPath, venusOrbitPath, earthOrbitPath, marsOrbitPath,
    jupiterOrbitPath, saturnOrbitPath, uranusOrbitPath, neptuneOrbitPath
);
orbitPaths.forEach(path => scene.add(path));


// --- UI Controls Setup (dat.GUI) ---
const gui = new dat.GUI();
const config = {
    showOrbits: true,
    // orbitThickness removed
    orbitSpeedMultiplier: 1.0
};

// Function to update orbit visibility
function updateOrbitVisibility() {
    orbitPaths.forEach(path => {
        path.visible = config.showOrbits;
    });
}

// updateOrbitThickness function REMOVED

// Add UI Controls
gui.add(config, 'showOrbits').name('Show Orbits').onChange(updateOrbitVisibility);
// gui.add for orbitThickness REMOVED
gui.add(config, 'orbitSpeedMultiplier', 0, 5.0).name('Orbital Speed');

// Initial call to updateOrbitThickness REMOVED


// --- Animation Loop ---
const clock = new THREE.Clock();

const baseSpeeds = {
    sunRotation: 0.001,
    planetRotation: 0.005,
    moonRotation: 0.003,
    mercuryOrbit: 0.02,
    venusOrbit: 0.015,
    earthOrbit: 0.01,
    moonOrbit: 0.05,
    marsOrbit: 0.008,
    jupiterOrbit: 0.004,
    saturnOrbit: 0.003,
    uranusOrbit: 0.002,
    neptuneOrbit: 0.0015
};

function animate() {
    requestAnimationFrame(animate);
    const speedMult = config.orbitSpeedMultiplier;

    // Apply self-rotation
    sun.rotation.y += baseSpeeds.sunRotation;
    mercury.rotation.y += baseSpeeds.planetRotation;
    venus.rotation.y += baseSpeeds.planetRotation;
    earth.rotation.y += baseSpeeds.planetRotation;
    moon.rotation.y += baseSpeeds.moonRotation;
    mars.rotation.y += baseSpeeds.planetRotation;
    jupiter.rotation.y += baseSpeeds.planetRotation;
    saturn.rotation.y += baseSpeeds.planetRotation;
    uranus.rotation.y += baseSpeeds.planetRotation;
    neptune.rotation.y += baseSpeeds.planetRotation;

    // Apply orbital rotation
    mercuryOrbit.rotation.y += baseSpeeds.mercuryOrbit * speedMult;
    venusOrbit.rotation.y += baseSpeeds.venusOrbit * speedMult;
    earthOrbit.rotation.y += baseSpeeds.earthOrbit * speedMult;
    moonOrbit.rotation.y += baseSpeeds.moonOrbit * speedMult;
    marsOrbit.rotation.y += baseSpeeds.marsOrbit * speedMult;
    jupiterOrbit.rotation.y += baseSpeeds.jupiterOrbit * speedMult;
    saturnOrbit.rotation.y += baseSpeeds.saturnOrbit * speedMult;
    uranusOrbit.rotation.y += baseSpeeds.uranusOrbit * speedMult;
    neptuneOrbit.rotation.y += baseSpeeds.neptuneOrbit * speedMult;

    controls.update();
    renderer.render(scene, camera);
}

// --- Handle Window Resize ---
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
});

// --- Start Animation ---
animate();