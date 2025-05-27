// Import the THREE.js library and its modules
import * as THREE from "https://cdn.skypack.dev/three@0.129.0/build/three.module.js";
import { OrbitControls } from "https://cdn.skypack.dev/three@0.129.0/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "https://cdn.skypack.dev/three@0.129.0/examples/jsm/loaders/GLTFLoader.js";
import { showNotification } from './utils.js';

let renderer;
let currentScene = null;

const createRenderer = () => {
    if (!renderer) {
        renderer = new THREE.WebGLRenderer({
            antialias: true,
            //powerPreference: "high-performance",
            //logarithmicDepthBuffer: true,
            alpha: true
        });
        //renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        //renderer.outputColorSpace = THREE.SRGBColorSpace;
    }
    return renderer;
};

const disposeScene = () => {
    if (!currentScene) return;

    // Dispose all 3D objects
    currentScene.scene.traverse(object => {
        if (!object.isMesh) return;

        // Dispose geometry
        if (object.geometry) {
            object.geometry.dispose();
        }

        // Dispose materials and textures
        const cleanMaterial = (material) => {
            material.dispose();
            // Dispose textures
            for (const key of Object.keys(material)) {
                const value = material[key];
                if (value && typeof value === 'object' && 'isTexture' in value) {
                    value.dispose();
                }
            }
        };

        if (object.material.isMaterial) {
            cleanMaterial(object.material);
        } else {
            // Array of materials
            for (const material of object.material) {
                cleanMaterial(material);
            }
        }
    });

    // Dispose renderer
    currentScene.renderer.dispose();
    //currentScene.renderer.forceContextLoss();
    
    // Remove DOM element
    const container = document.getElementById('3d-container');
    while (container.firstChild) 
    {
        container.removeChild(container.firstChild);
    }

    // Dispose controls
    currentScene.controls.dispose();
    
    // Clear scene
    currentScene.scene.clear();
    
    // Remove resize listener
    window.removeEventListener('resize', currentScene.resizeHandler);
    
    currentScene = null;
};


export function initThreeJS(modelPath) 
{
    // Clean up previous scene
    if (currentScene) 
    {
        disposeScene(currentScene);
        currentScene = null;
    }

    const container = document.getElementById('3d-container');
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
    const renderer = createRenderer();
    //console.log("client width" + container.clientWidth + "client height" + container.clientHeight);
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Add ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5); // Soft white light
    scene.add(ambientLight);

    // Add multiple directional lights
    const directionalLight1 = new THREE.DirectionalLight(0xffffff, 1); // Bright white light
    directionalLight1.position.set(5, 5, 5).normalize();
    scene.add(directionalLight1);

    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 1); // Bright white light
    directionalLight2.position.set(-5, 5, 5).normalize();
    scene.add(directionalLight2);

    const directionalLight3 = new THREE.DirectionalLight(0xffffff, 1); // Bright white light
    directionalLight3.position.set(0, -5, 5).normalize();
    scene.add(directionalLight3);

    const directionalLight4 = new THREE.DirectionalLight(0xffffff, 1); // Bright white light
    directionalLight4.position.set(0, 5, -5).normalize();
    scene.add(directionalLight4);


    // Add OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; // Smooth controls
    controls.dampingFactor = 0.05;

    // Load the model (assuming it's in GLTF format)
    const loader = new GLTFLoader();
    let loadedModel;

    loader.load(modelPath, function(gltf) {
        console.log('Model loaded successfully:', gltf);
        loadedModel = gltf.scene;
        scene.add(loadedModel);

        // Adjust camera position based on the model's bounding box
        const box = new THREE.Box3().setFromObject(loadedModel);
        const center = new THREE.Vector3();
        box.getCenter(center);
        const size = box.getSize(new THREE.Vector3());
        //box.getSize(size);

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
    }, undefined, (error) => {
        console.error('An error occurred while loading the model : ', error);
        showNotification('Error loading model: ' + error , 'error');
    });

    // Material change functionality
    const materialSelect = document.getElementById('materialSelect');
    materialSelect.addEventListener('change', (event) => {
        const selectedMaterial = event.target.value;
        if (loadedModel) {
            loadedModel.traverse((child) => {
                if (child.isMesh)
                {
                    if (selectedMaterial === 'wireframe') 
                    {
                        child.material = new THREE.LineBasicMaterial({ color: 0xffffff });
                        const geometry = new THREE.EdgesGeometry(child.geometry);
                        const wireframe = new THREE.LineSegments(geometry, child.material);
                        child.add(wireframe);
                    }
                    else 
                    {
                        // Remove any existing wireframe
                        const wireframe = child.children.find(c => c.isLineSegments);
                        if (wireframe)
                        {
                            child.remove(wireframe);
                        }
                        // Set the selected material
                        switch (selectedMaterial)
                        {
                            case 'meshStandardMaterial':
                                child.material = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
                                break;
                            case 'meshPhongMaterial':
                                child.material = new THREE.MeshPhongMaterial({ color: 0x00ff00, shininess: 200 });
                                break;
                            case 'meshBasicMaterial':
                                child.material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
                                break;
                        }
                    }
                }
            });
        }
    });

    // Animation loop
    const animate =() => {
        requestAnimationFrame(animate);
        controls.update(); // Required for damping
        renderer.render(scene, camera);
    };

    // Resize handler
    const handleResize = () => {
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
    };

    window.addEventListener('resize', handleResize);

    currentScene = { 
        scene, 
        camera, 
        renderer, 
        controls
    };
    
    //Add dispose method
    currentScene.dispose = () => {
        renderer.dispose();
        scene.dispose();
        camera.dispose();
        controls.dispose();
    };

    // Return the camera and controls if needed
    return { camera, controls };
}