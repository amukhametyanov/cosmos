import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { setupUIControls } from './uiControls.js'; // Import the setup function
import { initPlanetsUI, updatePlanetsUI } from './planetsUI.js'; // Import the planets UI setup function

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
function createCelestialBody(radius, texturePath, isEmissive = false, ringData = null) {
    const geometry = new THREE.SphereGeometry(radius, 32, 32);
    const texture = textureLoader.load(texturePath);
    texture.colorSpace = THREE.SRGBColorSpace; // Textures loaded should specify colorspace
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
            ringTexture.colorSpace = THREE.SRGBColorSpace; // Textures loaded should specify colorspace
            ringMaterial = new THREE.MeshBasicMaterial({
                map: ringTexture,
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.8 // Adjust opacity as needed
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
        ringMesh.rotation.x = -0.5 * Math.PI; // Align rings horizontally
        mesh.add(ringMesh); // Add ring directly to the planet mesh
    }

    return mesh;
}

// --- Helper Function to Create Orbit Paths ---
function createOrbitPath(radius, color = 0xaaaaaa, segments = 128) {
    const fixedTubeRadius = 0.01; // Very thin tube
    const geometry = new THREE.TorusGeometry(radius, fixedTubeRadius, 8, segments); // Use TorusGeometry
    const material = new THREE.MeshBasicMaterial({
        color: color,
        side: THREE.DoubleSide // Render both sides
    });
    const orbitLine = new THREE.Mesh(geometry, material);
    orbitLine.rotation.x = Math.PI / 2; // Rotate to be flat on the XZ plane
    return orbitLine;
}


// --- Helper Function to Create Flickering Stars ---
function createStars(count = 500, radius = 500) {
    const positions = [];
    const colors = [];
    const baseColor = new THREE.Color(0xaaaaff); // Slightly bluish base
    const starFlickerTypes = []; // 0 = normal, 1 = bright candidate

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

        // Determine if this star should be a 'bright' candidate (approx 10% chance)
        const isBright = Math.random() < 0.1;
        starFlickerTypes.push(isBright ? 1 : 0);
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
    scene.add(stars); // Add stars directly to the scene here

    // Return both the Points object and the flicker type data
    return { stars, starFlickerTypes };
}


// --- Create Celestial Bodies ---
const sun = createCelestialBody(5, 'sun_texture.jpg', true);
sun.userData = { name: "Sun", isPlanet: false, radius: 5 }; // Sun isn't a planet for selection
scene.add(sun);

const mercury = createCelestialBody(0.5, 'mercury_texture.jpg');
mercury.userData = {
    name: "Mercury",
    distance: "0.4 AU",
    radius: 0.5, // Use the geometry radius for halo scaling etc.
    orbitalPeriod: "88 days",
    fact: "The smallest planet and closest to the Sun.",
    isPlanet: true
};
mercury.layers.set(1); // Assign to layer 1

const venus = createCelestialBody(0.9, 'venus_texture.jpg');
venus.userData = { 
    name: "Venus",
    distance: "0.7 AU",
    radius: 0.9,
    orbitalPeriod: "225 days",
    fact: "The hottest planet with a thick atmosphere of carbon dioxide.",
    isPlanet: true
};
venus.layers.set(1);

const earth = createCelestialBody(1, 'earth_texture.jpg');
earth.userData = { 
    name: "Earth",
    distance: "1.0 AU",
    radius: 1,
    orbitalPeriod: "365 days",
    fact: "The only known planet to harbor life.",
    isPlanet: true
 };
earth.layers.set(1);
earth.rotation.z = 23.5 * Math.PI / 180; // Apply Earth's tilt
const moon = createCelestialBody(0.27, 'moon_texture.jpg');

const mars = createCelestialBody(0.7, 'mars_texture.jpg');
mars.userData = { 
    name: "Mars",
    distance: "1.5 AU",
    radius: 0.7,
    orbitalPeriod: "687 days",
    fact: "Known as the Red Planet due to iron oxide on its surface.",
    isPlanet: true
 };
mars.layers.set(1);
mars.rotation.z = 25 * Math.PI / 180; // Apply Mars' tilt

const jupiter = createCelestialBody(3.5, 'jupiter_texture.jpg');
jupiter.userData = { 
    name: "Jupiter",
    distance: "5.2 AU",
    radius: 3.5,
    orbitalPeriod: "12 years",
    fact: "The largest planet in our solar system with a prominent Great Red Spot.",
    isPlanet: true
 };
jupiter.layers.set(1);
jupiter.rotation.z = 3 * Math.PI / 180; // Apply Jupiter's small tilt

const saturn = createCelestialBody(3, 'saturn_texture.jpg', false, {
    innerRadius: 3.8, outerRadius: 6, texturePath: 'saturn_ring_texture.jpg' // Use PNG for transparency
});
saturn.userData = { 
    name: "Saturn",
    distance: "9.5 AU",
    radius: 3,
    orbitalPeriod: "29 years",
    fact: "Famous for its beautiful ring system made of ice and rock particles.",
    isPlanet: true
 }; // Use body radius
saturn.layers.set(1);
// Make sure rings don't interfere with raycasting (might need separate handling or different layer if selectable)
if (saturn.children.length > 0) saturn.children[0].layers.set(0); // Put ring on layer 0
saturn.rotation.z = 26.7 * Math.PI / 180; // Apply Saturn's tilt (rings will follow)

const uranus = createCelestialBody(2, 'uranus_texture.jpg');
uranus.userData = { 
    name: "Uranus",
    distance: "19.8 AU",
    radius: 2,
    orbitalPeriod: "84 years",
    fact: "Rotates on its side with an axial tilt of about 98 degrees.",
    isPlanet: true
 };
uranus.layers.set(1);
uranus.rotation.z = 98 * Math.PI / 180; // Apply Uranus' extreme tilt

const neptune = createCelestialBody(1.9, 'neptune_texture.jpg');
neptune.userData = { 
    name: "Neptune",
    distance: "30.1 AU",
    radius: 1.9,
    orbitalPeriod: "165 years",
    fact: "The windiest planet with speeds reaching up to 2,100 km/h.",
    isPlanet: true
 };
neptune.layers.set(1);
neptune.rotation.z = 28.3 * Math.PI / 180; // Apply Neptune's tilt


// --- Orbit Logic & Pivot Objects ---
const mercuryOrbit = new THREE.Object3D();
const venusOrbit = new THREE.Object3D();
const earthOrbit = new THREE.Object3D();
const marsOrbit = new THREE.Object3D();
const jupiterOrbit = new THREE.Object3D();
const saturnOrbit = new THREE.Object3D();
const uranusOrbit = new THREE.Object3D();
const neptuneOrbit = new THREE.Object3D();
const moonOrbit = new THREE.Object3D(); // For moon around earth

// Add planets/moons to their respective pivot points
mercuryOrbit.add(mercury);
venusOrbit.add(venus);
earthOrbit.add(earth);
earthOrbit.add(moonOrbit); // Moon's pivot orbits with Earth
moonOrbit.add(moon);       // Moon mesh orbits around the moon pivot
marsOrbit.add(mars);
jupiterOrbit.add(jupiter);
saturnOrbit.add(saturn);
uranusOrbit.add(uranus);
neptuneOrbit.add(neptune);

// Add all orbit pivots to the scene
scene.add(mercuryOrbit, venusOrbit, earthOrbit, marsOrbit, jupiterOrbit, saturnOrbit, uranusOrbit, neptuneOrbit);


// --- Create list of selectable planets ---
const selectablePlanets = [mercury, venus, earth, mars, jupiter, saturn, uranus, neptune];

// --- Orbital Distances & Initial Positions ---
const mercuryDistance = 8;
const venusDistance = 12;
const earthDistance = 16;
const moonDistance = 2; // Relative to Earth's pivot
const marsDistance = 22;
const jupiterDistance = 35;
const saturnDistance = 50;
const uranusDistance = 65;
const neptuneDistance = 75;

// Position planets relative to their orbit pivot
mercury.position.x = mercuryDistance;
venus.position.x = venusDistance;
earth.position.x = earthDistance;
moon.position.x = moonDistance; // Position moon relative to its own pivot (which is at Earth's position)
mars.position.x = marsDistance;
jupiter.position.x = jupiterDistance;
saturn.position.x = saturnDistance; // Saturn mesh itself is at the pivot center, position defines orbit distance
uranus.position.x = uranusDistance;
neptune.position.x = neptuneDistance;


// --- Create and Add Orbit Paths ---
const orbitPaths = [];
const orbitColor = 0x555555; // Dark grey for orbits

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
// Add orbit path meshes directly to the scene
orbitPaths.forEach(path => scene.add(path));


// --- UI Controls Setup (Using imported function) ---
const config = setupUIControls(orbitPaths); // Call the setup function


// --- Create Flickering Stars ---
// !! IMPORTANT: Create stars and get necessary variables BEFORE defining animate !!
const { stars, starFlickerTypes } = createStars(900, 700); // Increased count and radius
const starColorsAttribute = stars.geometry.attributes.color; // Reference to colors
const originalStarColors = new Float32Array(starColorsAttribute.array); // Backup of original colors


// --- Animation Loop ---
const clock = new THREE.Clock();

// Define base speeds for rotation and orbit
const baseSpeeds = {
    sunRotation: 0.001,
    planetRotation: 0.005,
    venusRotation: -0.001, // Venus: Slow retrograde
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

// Define flicker parameters for stars
const flickerParams = {
    speedFactor: 0.2,          // % of stars to update each frame (lower = slower overall flicker)
    normalIntensity: 0.7,       // How much normal stars vary (range = 1 +/- this value)
    brightIntensity: 1.8,       // How much bright stars vary (range = 1 +/- this value)
    baseBrightness: 1.0,        // The target average brightness multiplier
    minBrightness: 0.05         // Minimum brightness multiplier (prevents black stars)
};

// --- Initialize Planet Interaction UI ---
initPlanetsUI(scene, camera, renderer, controls, selectablePlanets, config);

function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta(); // Time since last frame
    const speedMult = config.orbitSpeedMultiplier; // Get speed multiplier from UI config

    // --- Rotations ---
    sun.rotation.y += baseSpeeds.sunRotation * delta * 60; // Use delta for frame-rate independence
    mercury.rotation.y += baseSpeeds.planetRotation * delta * 60;
    venus.rotation.y += baseSpeeds.venusRotation * delta * 60; // Use specific Venus speed
    earth.rotation.y += baseSpeeds.planetRotation * delta * 60;
    moon.rotation.y += baseSpeeds.moonRotation * delta * 60;
    mars.rotation.y += baseSpeeds.planetRotation * delta * 60;
    jupiter.rotation.y += baseSpeeds.planetRotation * delta * 60;
    saturn.rotation.y += baseSpeeds.planetRotation * delta * 60;
    uranus.rotation.y += baseSpeeds.planetRotation * delta * 60;
    neptune.rotation.y += baseSpeeds.planetRotation * delta * 60;

    // --- Orbits ---
    mercuryOrbit.rotation.y += baseSpeeds.mercuryOrbit * speedMult * delta * 60;
    venusOrbit.rotation.y += baseSpeeds.venusOrbit * speedMult * delta * 60;
    earthOrbit.rotation.y += baseSpeeds.earthOrbit * speedMult * delta * 60;
    moonOrbit.rotation.y += baseSpeeds.moonOrbit * speedMult * delta * 60; // Moon pivot rotates around Earth
    marsOrbit.rotation.y += baseSpeeds.marsOrbit * speedMult * delta * 60;
    jupiterOrbit.rotation.y += baseSpeeds.jupiterOrbit * speedMult * delta * 60;
    saturnOrbit.rotation.y += baseSpeeds.saturnOrbit * speedMult * delta * 60;
    uranusOrbit.rotation.y += baseSpeeds.uranusOrbit * speedMult * delta * 60;
    neptuneOrbit.rotation.y += baseSpeeds.neptuneOrbit * speedMult * delta * 60;


    // --- Star Flickering (with Bright Stars) ---
    const numStars = starColorsAttribute.count;
    const starsToUpdate = Math.max(1, Math.floor(numStars * flickerParams.speedFactor)); // Update a fraction of stars

    for (let i = 0; i < starsToUpdate; i++) {
        const index = Math.floor(Math.random() * numStars); // Pick a random star index
        const baseColorIndex = index * 3; // Starting index in the color array

        // Check if this star is marked as a 'bright' candidate
        const type = starFlickerTypes[index]; // Get type (0 or 1)
        const currentIntensity = (type === 1)
            ? flickerParams.brightIntensity
            : flickerParams.normalIntensity;

        // Calculate random flicker amount based on intensity
        // Generates a value roughly between -currentIntensity and +currentIntensity
        const randomFlicker = (Math.random() - 0.5) * 2 * currentIntensity;

        // Calculate final brightness multiplier
        const brightness = flickerParams.baseBrightness + randomFlicker;

        // Clamp brightness to prevent negative or zero values
        const finalBrightness = Math.max(flickerParams.minBrightness, brightness);

        // Apply the brightness multiplier to the ORIGINAL base color
        starColorsAttribute.array[baseColorIndex]     = originalStarColors[baseColorIndex]     * finalBrightness;
        starColorsAttribute.array[baseColorIndex + 1] = originalStarColors[baseColorIndex + 1] * finalBrightness;
        starColorsAttribute.array[baseColorIndex + 2] = originalStarColors[baseColorIndex + 2] * finalBrightness;
    }
    // VERY IMPORTANT: Tell Three.js that the color attribute needs to be updated in the GPU
    starColorsAttribute.needsUpdate = true;

    updatePlanetsUI();

    // --- Update Controls and Render ---
    controls.update(); // Update orbit controls (for damping)
    renderer.render(scene, camera); // Render the scene
}

// --- Handle Window Resize ---
window.addEventListener('resize', () => {
    // Update camera aspect ratio
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    // Update renderer size
    renderer.setSize(window.innerWidth, window.innerHeight);
    // Update pixel ratio for high-DPI displays
    renderer.setPixelRatio(window.devicePixelRatio);
});

// --- Start Animation ---
// Make sure this is the LAST thing called after all setup is complete
animate();