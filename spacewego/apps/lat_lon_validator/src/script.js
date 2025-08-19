import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// --- Constants ---
const INITIAL_TIMESTAMP = "2025-08-17T22:01:00.000Z"; // 6pm ish NOLA should have some sun light


// --- UI Elements ---
const startStopBtn = document.getElementById('start-stop-btn');
const speedSlider = document.getElementById('speed-slider');
const latInput = document.getElementById('lat-input');
const lonInput = document.getElementById('lon-input');
const submitBtn = document.getElementById('submit-btn');
const timestampDisplay = document.getElementById('timestamp-display');

// --- Scene Setup ---
const eciFrame = new THREE.Scene();
const ecefFrame = new THREE.Group();
eciFrame.add(ecefFrame);

// --- Axes Helpers ---
const eciAxes = new THREE.AxesHelper(2);
eciFrame.add(eciAxes);
const ecefAxes = new THREE.AxesHelper(1.5);
ecefFrame.add(ecefAxes);

// --- Axis Label Function ---
function makeTextSprite(message, opts = {}) {
    const { fontsize = 24, fontface = 'Arial', textColor = { r: 255, g: 255, b: 255, a: 1.0 } } = opts;

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    context.font = `${fontsize}px ${fontface}`;

    // get size data (sum of heights of letters)
    const metrics = context.measureText(message);
    const textWidth = metrics.width;

    canvas.width = textWidth;
    canvas.height = fontsize;
    context.font = `${fontsize}px ${fontface}`;
    context.fillStyle = `rgba(${textColor.r}, ${textColor.g}, ${textColor.b}, ${textColor.a})`;
    context.fillText(message, 0, fontsize);

    const texture = new THREE.Texture(canvas);
    texture.needsUpdate = true;

    const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.scale.set(0.125, 0.0625, 1.0);
    return sprite;
}

// --- ECI Axis Labels ---
const eciLabelX = makeTextSprite('X_ECI');
eciLabelX.position.set(0, 0, 2.1);
eciFrame.add(eciLabelX);

const eciLabelY = makeTextSprite('Y_ECI');
eciLabelY.position.set(2.1, 0, 0);
eciFrame.add(eciLabelY);

const eciLabelZ = makeTextSprite('Z_ECI');
eciLabelZ.position.set(0, 2.1, 0.0);
eciFrame.add(eciLabelZ);

// --- ECEF Axis Labels ---
const ecefLabelX = makeTextSprite('X_ECEF', { textColor: { r: 255, g: 200, b: 200, a: 1.0 } });
ecefLabelX.position.set(0, 0, 1.6);
ecefFrame.add(ecefLabelX);

const ecefLabelY = makeTextSprite('Y_ECEF', { textColor: { r: 200, g: 255, b: 200, a: 1.0 } });
ecefLabelY.position.set(1.6, 0, 0);
ecefFrame.add(ecefLabelY);

const ecefLabelZ = makeTextSprite('Z_ECEF', { textColor: { r: 200, g: 200, b: 255, a: 1.0 } });
ecefLabelZ.position.set(0, 1.6, 0);
ecefFrame.add(ecefLabelZ);


// --- Constants ---
const EARTH_RADIUS_KM = 6378;
const SUN_RADIUS_KM = 696340;
const SUN_DISTANCE_KM = 151447880;
const SATELLITE_ALTITUDE_KM = 600;
const EARTH_RADIUS_SCENE = 1;
const SUN_RADIUS_SCENE = EARTH_RADIUS_SCENE * (SUN_RADIUS_KM / EARTH_RADIUS_KM);
const ORBIT_RADIUS_SCENE = EARTH_RADIUS_SCENE * (EARTH_RADIUS_KM + SATELLITE_ALTITUDE_KM) / EARTH_RADIUS_KM;
const SUN_DISTANCE_SCENE = EARTH_RADIUS_SCENE * (SUN_DISTANCE_KM / EARTH_RADIUS_KM);



// --- Earth Object ---
const textureLoader = new THREE.TextureLoader();
const earthTexture = textureLoader.load('./static/earth.jpg');
const earthGeometry = new THREE.SphereGeometry(EARTH_RADIUS_SCENE, 32, 32);
const earthMaterial = new THREE.MeshStandardMaterial({ map: earthTexture });
const earthMesh = new THREE.Mesh(earthGeometry, earthMaterial);
earthMesh.rotation.y = -Math.PI / 2; // Align prime meridian
earthMesh.castShadow = true;
earthMesh.receiveShadow = true;
ecefFrame.add(earthMesh);

// --- Sun Object ---
const sunTexture = textureLoader.load('./static/Solarsystemscope_texture_2k_sun.jpg');
const sunGeometry = new THREE.SphereGeometry(SUN_RADIUS_SCENE, 32, 32);
const sunMaterial = new THREE.MeshBasicMaterial({ map: sunTexture });
const sunMesh = new THREE.Mesh(sunGeometry, sunMaterial);
eciFrame.add(sunMesh);


// --- ECEF Line and Intersection Dot ---
const ecefPosition = new THREE.Vector3(0, 0, 0);

// 2. Create the line geometry
const lineLength = 2; // Same as ECI axes
const startPoint = new THREE.Vector3(0, 0, 0);
const endPoint = ecefPosition.clone().multiplyScalar(lineLength);
const lineGeometry = new THREE.BufferGeometry().setFromPoints([startPoint, endPoint]);

// 3. Create the line material and mesh
const lineMaterial = new THREE.LineBasicMaterial({ color: 0xffff00 }); // Yellow
const ecefLine = new THREE.Line(lineGeometry, lineMaterial);
ecefFrame.add(ecefLine);

// 4. Create the intersection dot
const dotGeometry = new THREE.SphereGeometry(EARTH_RADIUS_SCENE / 50, 16, 16);
const dotMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 }); // Yellow
const intersectionDot = new THREE.Mesh(dotGeometry, dotMaterial);

// 5. Position the dot on the Earth's surface
intersectionDot.position.copy(ecefPosition).multiplyScalar(EARTH_RADIUS_SCENE);
ecefFrame.add(intersectionDot);

function updateEcefLineAndDot(lat, lon) {
    fetch(`/api/get_ecef_position?lat=${lat}&lon=${lon}`)
        .then(response => response.json())
        .then(data => {
            // Astro (X, Y, Z) -> Three.js (Z, X, Y)
            const astroX = data[0];
            const astroY = data[1];
            const astroZ = data[2];

            ecefPosition.set(astroY, astroZ, astroX).normalize();

            const endPoint = ecefPosition.clone().multiplyScalar(lineLength);
            ecefLine.geometry.setFromPoints([startPoint, endPoint]);
            ecefLine.geometry.verticesNeedUpdate = true;

            intersectionDot.position.copy(ecefPosition).multiplyScalar(EARTH_RADIUS_SCENE);
        })
        .catch(error => console.error('Error:', error));
}

submitBtn.addEventListener('click', () => {
    const lat = parseFloat(latInput.value);
    const lon = parseFloat(lonInput.value);
    if (!isNaN(lat) && !isNaN(lon)) {
        updateEcefLineAndDot(lat, lon);
    }
});

// Initial call to position the line and dot
updateEcefLineAndDot(parseFloat(latInput.value), parseFloat(lonInput.value));


// --- Satellite and Orbit ---
const satelliteOrbitGroup = new THREE.Group();
eciFrame.add(satelliteOrbitGroup);

// --- Keplerian Elements ---
const inclination = THREE.MathUtils.degToRad(-45);
const raan = THREE.MathUtils.degToRad(0); // Right Ascension of the Ascending Node

// Apply rotations to the orbit group based on Keplerian elements
const raanQ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), raan);
const inclinationQ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), inclination);
satelliteOrbitGroup.quaternion.copy(raanQ).multiply(inclinationQ);

// Orbit Path
const orbitPoints = [];
const segments = 128;
for (let i = 0; i <= segments; i++) {
    const theta = (i / segments) * Math.PI * 2;
    orbitPoints.push(
        new THREE.Vector3(
            ORBIT_RADIUS_SCENE * Math.cos(theta),
            ORBIT_RADIUS_SCENE * Math.sin(theta),
            0
        )
    );
}
const orbitGeometry = new THREE.BufferGeometry().setFromPoints(orbitPoints);
const orbitMaterial = new THREE.LineBasicMaterial({ color: 0xffffff });
const orbitLine = new THREE.Line(orbitGeometry, orbitMaterial);
satelliteOrbitGroup.add(orbitLine);


// Satellite (dot)
const satelliteGeometry = new THREE.SphereGeometry(EARTH_RADIUS_SCENE / 100, 16, 16);
const satelliteMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
const satellite = new THREE.Mesh(satelliteGeometry, satelliteMaterial);
// Initial position based on True Anomaly = 0 (at perigee)
satellite.position.x = ORBIT_RADIUS_SCENE;
satelliteOrbitGroup.add(satellite);


// --- Lighting ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
eciFrame.add(ambientLight);
const sunLight = new THREE.DirectionalLight(0xffffff, 1.5);
sunLight.castShadow = true;
eciFrame.add(sunLight);
eciFrame.add(sunLight.target);

// Configure shadow camera
sunLight.shadow.camera.left = -2;
sunLight.shadow.camera.right = 2;
sunLight.shadow.camera.top = 2;
sunLight.shadow.camera.bottom = -2;
sunLight.shadow.camera.near = 0.5;
sunLight.shadow.camera.far = 50;



// --- Camera ---
const camera = new THREE.PerspectiveCamera(35, window.innerWidth / window.innerHeight, 0.1, 30000);
camera.position.z = 5;

// --- Renderer ---
const canvas = document.querySelector('canvas.threejs');
const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
renderer.shadowMap.enabled = true;
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

// --- Controls ---
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;

// --- Animation Logic ---
let isAnimating = false;
let rotationSpeed = 0.002; // Default speed
let orbitAngle = 0; // This now represents the True Anomaly
let currentScenarioTime = new Date(INITIAL_TIMESTAMP);

function updateTimestampDisplay() {
    timestampDisplay.innerText = currentScenarioTime.toISOString();
}

startStopBtn.addEventListener('click', () => {
    isAnimating = !isAnimating;
    startStopBtn.textContent = isAnimating ? 'Stop' : 'Start';
});

speedSlider.addEventListener('input', (event) => {
    rotationSpeed = parseFloat(event.target.value);
});

const renderloop = () => {
    if (isAnimating) {
        // Calculate time passed based on rotation
        // Earth rotates 2*PI radians in 86400 seconds
        const secondsPerFrame = (rotationSpeed / (2 * Math.PI)) * 86400;
        currentScenarioTime.setMilliseconds(currentScenarioTime.getMilliseconds() + secondsPerFrame * 1000);
        updateTimestampDisplay();

        // Rotate the ECEF frame (Earth)
        ecefFrame.rotation.y += rotationSpeed;

        // Move the satellite along its orbit by updating the angle (True Anomaly)
        orbitAngle += rotationSpeed * 1.5;

        // Calculate position in the orbital plane (local to satelliteOrbitGroup)
        satellite.position.x = ORBIT_RADIUS_SCENE * Math.cos(orbitAngle);
        satellite.position.y = ORBIT_RADIUS_SCENE * Math.sin(orbitAngle);
    }

    controls.update();
    renderer.render(eciFrame, camera);
    window.requestAnimationFrame(renderloop);
};

// --- Initialization ---
function initializeScene() {
    // Set initial slider value
    speedSlider.value = rotationSpeed;
    updateTimestampDisplay();

    // Fetch initial Earth rotation
    fetch(`/api/get_earth_rotation_angle?timestamp=${INITIAL_TIMESTAMP}`)
        .then(response => response.json())
        .then(data => {
            const angleRadians = data.angle;
            ecefFrame.rotation.y = angleRadians;
        })
        .catch(error => console.error('Error fetching initial rotation:', error));

    // Fetch initial Sun position
    fetch(`/api/get_sun_position?timestamp=${INITIAL_TIMESTAMP}`)
        .then(response => response.json())
        .then(data => {
            // Astro (X, Y, Z) -> Three.js (Z, X, Y)
            const astroX = data[0];
            const astroY = data[1];
            const astroZ = data[2];

            const sunPosition = new THREE.Vector3(astroY, astroZ, astroX).normalize();
            sunMesh.position.copy(sunPosition).multiplyScalar(SUN_DISTANCE_SCENE);
            sunLight.position.copy(sunMesh.position);
            sunLight.target.position.set(0, 0, 0);
        })
        .catch(error => console.error('Error fetching sun position:', error));


    // Start the render loop
    renderloop();
}

initializeScene();

