// Import the THREE.js library and its modules
import * as THREE from "https://cdn.skypack.dev/three@0.129.0/build/three.module.js";
import { OrbitControls } from "https://cdn.skypack.dev/three@0.129.0/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "https://cdn.skypack.dev/three@0.129.0/examples/jsm/loaders/GLTFLoader.js";

export function initThreeJS(modelPath) {
    const container = document.getElementById('3d-container');
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer();
    //console.log("client width" + container.clientWidth + "client height" + container.clientHeight);
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Add lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5); // Soft white light
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1); // Bright white light
    directionalLight.position.set(5, 5, 5).normalize();
    scene.add(directionalLight);

    // Add OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; // Smooth controls
    controls.dampingFactor = 0.05;

    // Load the model (assuming it's in GLTF format)
    const loader = new GLTFLoader();

    loader.load(modelPath, function(gltf) {
        console.log('Model loaded successfully:', gltf);
        scene.add(gltf.scene);

        // Adjust camera position based on the model's bounding box
        const box = new THREE.Box3().setFromObject(gltf.scene);
        const center = new THREE.Vector3();
        box.getCenter(center);
        const size = new THREE.Vector3();
        box.getSize(size);

        const maxDim = Math.max(size.x, size.y, size.z);
        const fov = camera.fov * (Math.PI / 180); // Convert fov to radians
        let cameraZ = Math.abs((maxDim / 2) / Math.tan(fov / 2));

        // Adjust camera position
        camera.position.copy(center);
        camera.position.z += cameraZ;

        // Set controls target to the center of the model
        controls.target.copy(center);
        controls.update();

        animate();
    }, undefined, function(error) {
        console.error('An error occurred while loading the model:', error);
        alert('Failed to load the model. Please check the console for more details.');
    });

    // Animation loop
    function animate() {
        requestAnimationFrame(animate);
        controls.update(); // Required for damping
        renderer.render(scene, camera);
    }

    // Handle window resize
    window.addEventListener('resize', () => {
        // Update camera aspect ratio and renderer size
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
    });

    // Return the camera and controls if needed
    return { camera, controls };
}


