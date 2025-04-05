import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { setupUIControls } from './uiControls.js'; // Import the setup function

// dat.GUI is loaded globally via the script tag

// --- Basic Scene Setup ---
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 3000);
camera.position.z = 50;
camera.position.y = 20;
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('solar-system-canvas'), antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);

// --- Lighting ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.15);
scene.add(ambientLight);
const pointLight = new THREE.PointLight(0xffffff, 600, 400);
pointLight.position.set(0, 0, 0);
scene.add(pointLight);

// --- Controls ---
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;

// --- Texture Loader ---
const textureLoader = new THREE.TextureLoader();


// --- Set Scene Background ---
const backgroundTexture = textureLoader.load('stars_milky_way_texture.jpg');
backgroundTexture.colorSpace = THREE.SRGBColorSpace;

// --- Create Background Sphere ---
const bgSphereRadius = 1000; // Needs to be larger than your star radius and furthest orbit
const bgGeometry = new THREE.SphereGeometry(bgSphereRadius, 60, 40); // Higher segments for smoothness
// Invert the geometry on the x-axis so that faces point inward
bgGeometry.scale(-1, 1, 1);

const bgMaterial = new THREE.MeshBasicMaterial({
    map: backgroundTexture,
    // side: THREE.BackSide // No longer needed after geometry.scale trick
});

const backgroundSphere = new THREE.Mesh(bgGeometry, bgMaterial);
scene.add(backgroundSphere);


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
// (Keep the createOrbitPath function exactly as it was)
function createOrbitPath(radius, color = 0xaaaaaa, segments = 128) {
    const fixedTubeRadius = 0.01;
    const geometry = new THREE.TorusGeometry(radius, fixedTubeRadius, 8, segments);
    const material = new THREE.MeshBasicMaterial({
        color: color,
        side: THREE.DoubleSide
    });
    const orbitLine = new THREE.Mesh(geometry, material);
    orbitLine.rotation.x = Math.PI / 2;
    return orbitLine;
}


// --- Helper Function to Create Flickering Stars ---
function createStars(count = 500, radius = 500) {
    const positions = [];
    const colors = [];
    const baseColor = new THREE.Color(0xaaaaff); // Slightly bluish base

    for (let i = 0; i < count; i++) {
        // Create positions in a spherical shell
        const r = radius * (0.8 + Math.random() * 0.2); // Stars not exactly on the edge
        const theta = Math.random() * Math.PI * 2; // Random angle around Y axis
        const phi = Math.acos((Math.random() * 2) - 1); // Random angle from Y axis (uniform sphere distribution)

        const x = r * Math.sin(phi) * Math.cos(theta);
        const y = r * Math.cos(phi);
        const z = r * Math.sin(phi) * Math.sin(theta);

        positions.push(x, y, z);

        // Store base color
        colors.push(baseColor.r, baseColor.g, baseColor.b);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3)); // Add color attribute

    const material = new THREE.PointsMaterial({
        size: 2.5,          // Adjust size as needed
        // map: starTexture, // Optional: Add a small texture for smoother points
        vertexColors: true, // IMPORTANT: Use vertex colors
        blending: THREE.AdditiveBlending, // Makes stars glow nicely
        depthWrite: false,  // Prevent stars from blocking closer objects weirdly
        transparent: true,
        opacity: 0.85        // Slightly transparent
    });

    const stars = new THREE.Points(geometry, material);
    scene.add(stars);

    return stars; // Return the stars object so we can animate it
}


// --- Create Celestial Bodies ---
// (Same creation code as before)
const sun = createCelestialBody(5, 'sun_texture.jpg', true);
scene.add(sun);
const mercury = createCelestialBody(0.5, 'mercury_texture.jpg');
const venus = createCelestialBody(0.9, 'venus_texture.jpg');
const earth = createCelestialBody(1, 'earth_texture.jpg');
earth.rotation.z = 23.5 * Math.PI / 180; // Apply Earth's tilt
const moon = createCelestialBody(0.27, 'moon_texture.jpg');
const mars = createCelestialBody(0.7, 'mars_texture.jpg');
mars.rotation.z = 25 * Math.PI / 180; // Apply Mars' tilt
const jupiter = createCelestialBody(3.5, 'jupiter_texture.jpg');
jupiter.rotation.z = 3 * Math.PI / 180; // Apply Jupiter's small tilt
const saturn = createCelestialBody(3, 'saturn_texture.jpg', false, {
    innerRadius: 3.8, outerRadius: 6, texturePath: 'saturn_ring_texture.jpg'
});
saturn.rotation.z = 26.7 * Math.PI / 180; // Apply Saturn's tilt (rings will follow)
const uranus = createCelestialBody(2, 'uranus_texture.jpg');
uranus.rotation.z = 98 * Math.PI / 180; // Apply Uranus' extreme tilt
const neptune = createCelestialBody(1.9, 'neptune_texture.jpg');
neptune.rotation.z = 28.3 * Math.PI / 180; // Apply Neptune's tilt


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
earthOrbit.add(moonOrbit); // Add moon's orbit pivot to Earth's orbit pivot
moonOrbit.add(moon);      // Add moon mesh to its own orbit pivot
marsOrbit.add(mars);
jupiterOrbit.add(jupiter);
saturnOrbit.add(saturn);
uranusOrbit.add(uranus);
neptuneOrbit.add(neptune);

scene.add(mercuryOrbit, venusOrbit, earthOrbit, marsOrbit, jupiterOrbit, saturnOrbit, uranusOrbit, neptuneOrbit);


// --- Orbital Distances & Initial Positions ---
// (Same setup as before)
const mercuryDistance = 8;
const venusDistance = 12;
const earthDistance = 16;
const moonDistance = 2; // Relative to Earth
const marsDistance = 22;
const jupiterDistance = 35;
const saturnDistance = 50;
const uranusDistance = 65;
const neptuneDistance = 75;

mercury.position.x = mercuryDistance;
venus.position.x = venusDistance;
earth.position.x = earthDistance;
moon.position.x = moonDistance; // Moon relative to its pivot (earthOrbit)
mars.position.x = marsDistance;
jupiter.position.x = jupiterDistance;
saturn.position.x = saturnDistance;
uranus.position.x = uranusDistance;
neptune.position.x = neptuneDistance;


// --- Create and Add Orbit Paths ---
const orbitPaths = [];
const orbitColor = 0x555555;

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


// --- Create Flickering Stars ---
const stars = createStars(700, 600); // Create 700 stars within a radius of 600
const starColorsAttribute = stars.geometry.attributes.color; // Get reference to color attribute
const originalStarColors = new Float32Array(starColorsAttribute.array); // Copy original colors


// --- UI Controls Setup (Using imported function) ---
// The original GUI code is now removed from here.
const config = setupUIControls(orbitPaths); // Call the setup function, pass orbitPaths, and store the returned config


// --- Animation Loop ---
const clock = new THREE.Clock();

const baseSpeeds = {
    sunRotation: 0.001,
    planetRotation: 0.005,
    venusRotation: -0.001, // Venus: Slow and retrograde (negative)
    moonRotation: 0.003,
    mercuryOrbit: 0.02,
    venusOrbit: 0.015,
    earthOrbit: 0.01,
    moonOrbit: 0.05, // Moon orbits Earth faster
    marsOrbit: 0.008,
    jupiterOrbit: 0.004,
    saturnOrbit: 0.003,
    uranusOrbit: 0.002,
    neptuneOrbit: 0.0015
};

function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();

    // Read the speed multiplier directly from the config object returned by setupUIControls
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
    moonOrbit.rotation.y += baseSpeeds.moonOrbit * speedMult; // Rotate moon's pivot around Earth
    marsOrbit.rotation.y += baseSpeeds.marsOrbit * speedMult;
    jupiterOrbit.rotation.y += baseSpeeds.jupiterOrbit * speedMult;
    saturnOrbit.rotation.y += baseSpeeds.saturnOrbit * speedMult;
    uranusOrbit.rotation.y += baseSpeeds.uranusOrbit * speedMult;
    neptuneOrbit.rotation.y += baseSpeeds.neptuneOrbit * speedMult;


    // --- Star Flickering (Refined) ---
    const numStars = starColorsAttribute.count;
    // Reduce the percentage of stars updated each frame for slower overall flicker
    const flickerSpeed = 0.9; // Reduced from 0.1
    // Reduce the maximum brightness change for more subtle flicker
    const flickerIntensity = 0.8; // Reduced from 0.7

    // Number of stars to update this frame
    const starsToUpdate = Math.max(1, Math.floor(numStars * flickerSpeed)); // Ensure at least 1 updates

    for (let i = 0; i < starsToUpdate; i++) {
        const index = Math.floor(Math.random() * numStars);
        const baseColorIndex = index * 3;

        // Calculate random brightness multiplier (closer to 1.0 now)
        const brightness = 1.0 + (Math.random() - 0.5) * 2 * flickerIntensity; // e.g., now ranges roughly 0.65 to 1.35

        // Apply brightness to the ORIGINAL color
        starColorsAttribute.array[baseColorIndex]     = originalStarColors[baseColorIndex] * brightness;
        starColorsAttribute.array[baseColorIndex + 1] = originalStarColors[baseColorIndex + 1] * brightness;
        starColorsAttribute.array[baseColorIndex + 2] = originalStarColors[baseColorIndex + 2] * brightness;
    }
    starColorsAttribute.needsUpdate = true; // Still needed!

    controls.update();
    renderer.render(scene, camera);
}

// --- Handle Window Resize ---
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio); // Added for high-DPI displays
});

// --- Start Animation ---
animate();