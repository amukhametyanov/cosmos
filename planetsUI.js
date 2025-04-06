import * as THREE from 'three';
import gsap from 'gsap';

// --- Module State ---
let scene, camera, renderer, controls, planets, config;
let raycaster;
let mouse = new THREE.Vector2();
let hoverHalo = null; // Will be THREE.Mesh with RingGeometry
let hoveredPlanet = null;
let selectedPlanet = null;
let isAnimating = false;

// Original state storage
let originalCameraPos = new THREE.Vector3();
let originalControlsTarget = new THREE.Vector3();
let originalOrbitSpeed = 1.0;

// DOM Elements
let infoPanelElement, infoTextElement, backButtonElement;

// --- Initialization ---
export function initPlanetsUI(_scene, _camera, _renderer, _controls, _planets, _config) {
    scene = _scene;
    camera = _camera;
    renderer = _renderer;
    controls = _controls;
    planets = _planets;
    config = _config;

    raycaster = new THREE.Raycaster();
    raycaster.layers.set(1);
    camera.layers.enable(1);

    infoPanelElement = document.getElementById('info-panel');
    infoTextElement = document.getElementById('info-text');
    backButtonElement = document.getElementById('back-button');

    if (!infoPanelElement || !infoTextElement || !backButtonElement) {
        console.error("Planet UI HTML elements not found!");
        return;
    }

    // --- Create the RingGeometry-based Halo ---
    createHoverHaloRing(); // Call the ring creation function

    // Add event listeners
    renderer.domElement.addEventListener('mousemove', onMouseMove, false);
    renderer.domElement.addEventListener('click', onPlanetClick, false);
    backButtonElement.addEventListener('click', hideInfoPanel, false);
}

// --- Create Hover Effect (Ring Geometry) ---
function createHoverHaloRing() {
    // Adjust inner/outer radius for a thinner ring. Increase segments for smoothness.
    // The radii are relative factors; actual size comes from scaling.
    const ringInnerRadius = 1.05; // Closer to outer radius
    const ringOuterRadius = 1.15; // Make the difference small for thinness
    const ringSegments = 64; // More segments for a smoother circle

    const geometry = new THREE.RingGeometry(ringInnerRadius, ringOuterRadius, ringSegments);
    const material = new THREE.MeshBasicMaterial({
        color: 0xaaaaff, // Light blueish color
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.7, // Adjust opacity if needed
        depthWrite: false // Render on top
    });
    hoverHalo = new THREE.Mesh(geometry, material);
    hoverHalo.visible = false;
    // Initial orientation: Make it lie flat on the XZ plane like orbits (optional)
    // hoverHalo.rotation.x = Math.PI / 2;
    // OR make it face the camera initially (will be updated in updatePlanetsUI)
    hoverHalo.quaternion.copy(camera.quaternion);

    hoverHalo.layers.set(0); // Don't let the halo intersect itself or planets via raycast
    scene.add(hoverHalo);
}

// --- Update Halo Appearance (Visibility, Scale, Orientation) ---
// This function focuses on making the halo visible/invisible and scaling it.
// Orientation and position are handled in updatePlanetsUI.
function updateHaloAppearance(planet) {
    if (!hoverHalo) return;

    if (!planet || selectedPlanet === planet) { // Hide if no planet or if it's selected
        hoverHalo.visible = false;
        if (!selectedPlanet) {
             document.body.style.cursor = 'default';
        }
    } else {
        // Calculate scale based on planet radius
        const planetRadius = planet.userData.radius || 1;
        // Adjust multiplier for desired visual size relative to planet
        const scaleMultiplier = planetRadius * 1.0; // Adjust as needed
        hoverHalo.scale.set(scaleMultiplier, scaleMultiplier, scaleMultiplier);
        hoverHalo.visible = true;
        document.body.style.cursor = 'pointer';
    }
}


// --- Mouse Move Handler (Raycasting) ---
// (This function remains exactly the same as the previous working version)
function onMouseMove(event) {
    if (isAnimating || selectedPlanet) {
         if (hoveredPlanet && selectedPlanet !== hoveredPlanet) {
              updateHaloAppearance(null);
              hoveredPlanet = null;
         }
         return;
    }

    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(planets, false);

    let foundPlanet = null;
    if (intersects.length > 0) {
        for(const intersect of intersects) {
            if (intersect.object.userData.isPlanet) {
                foundPlanet = intersect.object;
                break;
            }
        }
    }

    if (foundPlanet) {
        if (hoveredPlanet !== foundPlanet) {
            hoveredPlanet = foundPlanet;
            updateHaloAppearance(hoveredPlanet); // Update scale/visibility
        }
    } else {
        if (hoveredPlanet) {
            updateHaloAppearance(null); // Hide appearance
            hoveredPlanet = null;
        }
    }
}

// --- Planet Click Handler ---
// (This function remains exactly the same)
function onPlanetClick(event) {
    if (isAnimating || selectedPlanet) return;

    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(planets, false);

    let clickedPlanetObj = null;
    if (intersects.length > 0) {
         for(const intersect of intersects) {
            if (intersect.object.userData.isPlanet) {
                clickedPlanetObj = intersect.object;
                break;
            }
        }
    }

    if (clickedPlanetObj && clickedPlanetObj === hoveredPlanet) {
        selectPlanet(clickedPlanetObj);
    }
}

// --- Select Planet Logic ---
// (This function remains exactly the same)
function selectPlanet(planet) {
    if (isAnimating || selectedPlanet) return;

    selectedPlanet = planet;
    isAnimating = true;
    document.body.classList.add('planet-selected-cursor');

    originalCameraPos.copy(camera.position);
    originalControlsTarget.copy(controls.target);
    originalOrbitSpeed = config.orbitSpeedMultiplier;

    updateHaloAppearance(null);
    hoveredPlanet = null;
    controls.enabled = false;
    config.orbitSpeedMultiplier = 0;

    const planetWorldPos = planet.getWorldPosition(new THREE.Vector3());
    const planetRadius = planet.userData.radius || 1;
    const offsetDistance = planetRadius * 4.5;

    const camToPlanetVec = new THREE.Vector3().subVectors(camera.position, planetWorldPos).normalize();
    const targetPos = new THREE.Vector3().copy(planetWorldPos).addScaledVector(camToPlanetVec, offsetDistance);
    const targetLookAt = planetWorldPos;

    gsap.to(camera.position, {
        x: targetPos.x, y: targetPos.y, z: targetPos.z,
        duration: 1.5, ease: "power2.inOut",
        onComplete: () => {
            controls.target.copy(targetLookAt);
            controls.update();
            isAnimating = false;
            showInfoPanelContent(planet);
        }
    });
    gsap.to(controls.target, {
        x: targetLookAt.x, y: targetLookAt.y, z: targetLookAt.z,
        duration: 1.5, ease: "power2.inOut"
    });
}

// --- Show Info Panel Content ---
// (This function remains exactly the same)
function showInfoPanelContent(planet) {
    const data = planet.userData;
    let statsText = `--- ${data.name || 'Celestial Body'} ---\n\n`;
    if (data.distance) statsText += `Distance: ${data.distance} AU\n`;
    if (data.radius) statsText += `Radius: ${data.radius} units\n`;
    if (data.orbitalPeriod) statsText += `Orbital Period: ${data.orbitalPeriod}\n`;
    if (data.fact) statsText += `\nFact: ${data.fact}\n`;

    infoPanelElement.classList.add('visible');
    typeWriterEffect(infoTextElement, statsText, 15);
}

function typeWriterEffect(element, text, speed) {
    element.innerHTML = "";
    let i = 0;
    function type() {
        if (i < text.length) {
            element.innerHTML += text.charAt(i);
            i++;
            setTimeout(type, speed);
        }
    }
    type();
}


// --- Hide Info Panel and Return ---
// (This function remains exactly the same)
function hideInfoPanel() {
    if (isAnimating || !selectedPlanet) return;

    isAnimating = true;
    infoPanelElement.classList.remove('visible');
    document.body.classList.remove('planet-selected-cursor');

    const previouslySelected = selectedPlanet;
    selectedPlanet = null;

    gsap.to(camera.position, {
        x: originalCameraPos.x, y: originalCameraPos.y, z: originalCameraPos.z,
        duration: 1.5, ease: "power2.inOut",
        onComplete: () => {
            controls.target.copy(originalControlsTarget);
            controls.enabled = true;
            controls.update();
            isAnimating = false;
             const event = new MouseEvent('mousemove', {
                 clientX: mouse.x * window.innerWidth * 0.5 + window.innerWidth * 0.5,
                 clientY: -mouse.y * window.innerHeight * 0.5 + window.innerHeight * 0.5
             });
             onMouseMove(event);
        }
    });
     gsap.to(controls.target, {
        x: originalControlsTarget.x, y: originalControlsTarget.y, z: originalControlsTarget.z,
        duration: 1.5, ease: "power2.inOut"
    });
     config.orbitSpeedMultiplier = originalOrbitSpeed;
}


// --- Update function called from main animation loop ---
// This function updates position AND orientation of the ring halo
export function updatePlanetsUI() {
    if (hoverHalo && hoverHalo.visible && hoveredPlanet && !selectedPlanet) {
        // 1. Update Position
        const worldPosition = hoveredPlanet.getWorldPosition(new THREE.Vector3());
        hoverHalo.position.copy(worldPosition);

        // 2. Update Orientation (Make it face the camera)
        // This ensures the ring looks like a circle from the camera's perspective
        hoverHalo.quaternion.copy(camera.quaternion);

        // Optional: If you want the ring to lie flat relative to the orbit plane instead:
        // Get the planet's parent (the orbit pivot)
        // const parent = hoveredPlanet.parent;
        // if (parent) {
        //     hoverHalo.rotation.copy(parent.rotation); // Copy pivot's rotation
        //     hoverHalo.rotation.x += Math.PI / 2; // Adjust if needed
        // }

    }
     // Halo should be hidden if selectedPlanet is not null (handled by updateHaloAppearance)
}