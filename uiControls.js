// uiControls.js

/**
 * Sets up the dat.GUI interface for controlling the solar system visualization.
 * @param {Array<THREE.Mesh>} orbitPaths - An array containing the mesh objects for the orbit paths.
 * @returns {object} The configuration object used by the GUI.
 */
export function setupUIControls(orbitPaths) {
    const gui = new dat.GUI();
    const config = {
        showOrbits: true,
        orbitSpeedMultiplier: 1.0
    };

    // Function to update orbit visibility based on GUI control
    function updateOrbitVisibility() {
        orbitPaths.forEach(path => {
            path.visible = config.showOrbits;
        });
    }

    // Add UI Controls
    gui.add(config, 'showOrbits').name('Show Orbits').onChange(updateOrbitVisibility);
    gui.add(config, 'orbitSpeedMultiplier', 0, 5.0, 0.1).name('Orbital Speed'); // Added step value for smoother control

    // --- Initial Setup ---
    // Ensure initial visibility matches the config default
    updateOrbitVisibility();

    // Return the config object so main.js can access its values
    return config;
}