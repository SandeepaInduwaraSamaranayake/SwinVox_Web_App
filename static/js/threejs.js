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

// Create a reusable disposal function
function disposeSceneResources(scene, renderer = null) 
{
    // Dispose all 3D objects
    scene.traverse(object => {
        if (!object.isMesh) return;

        // Dispose geometry
        if (object.geometry) 
        {
            object.geometry.dispose();
        }

        // Dispose materials and textures
        const cleanMaterial = (material) => {
            material.dispose();
            // Dispose textures
            for (const key of Object.keys(material)) 
            {
                const value = material[key];
                if (value && typeof value === 'object' && 'isTexture' in value)
                {
                    value.dispose();
                }
            }
        };

        // Dispose material
        if (object.material.isMaterial)
        {
            cleanMaterial(object.material);
        } 
        else 
        {
            // Array of materials
            for (const material of object.material) 
            {
                cleanMaterial(material);
            }
        }
    });

    // Dispose renderer if provided
    if (renderer) 
    {
        renderer.dispose();
        //renderer.forceContextLoss();
    }

    // Clear the scene
    if(scene)
    {
        scene.clear();
    }
}

// Update existing disposeScene to use the shared function
const disposeScene = () => {
    if (!currentScene) return;

    disposeSceneResources(currentScene.scene, currentScene.renderer);
    
    // Remove DOM element
    const container = document.getElementById('3d-container');
    while (container.firstChild) 
    {
        container.removeChild(container.firstChild);
    }

    // Dispose controls
    if (currentScene.controls) 
    {
        currentScene.controls.dispose();
    }
    
    // Remove resize listener
    if (currentScene.resizeHandler) 
    {
        window.removeEventListener('resize', currentScene.resizeHandler);
    }
    
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

    loader.load(modelPath, function(gltf) 
    {
        console.log('Model loaded successfully:', gltf);
        loadedModel = gltf.scene;
        scene.add(loadedModel);

        // Create a bounding box that contains the entire loaded model
        const box = new THREE.Box3().setFromObject(loadedModel);
        // Create vectors to store the center point and size of the bounding box
        const center = new THREE.Vector3();
        const size = new THREE.Vector3();
        // Calculate the geometric center of the model
        box.getCenter(center);
        // Calculate the dimensions (width, height, depth) of the model
        box.getSize(size);

        // Find the largest dimension of the model (width, height, or depth)
        const maxDim = Math.max(size.x, size.y, size.z);
        // Convert camera's vertical field of view from degrees to radians
        const fov = camera.fov * (Math.PI / 180);
        // Calculate the optimal camera distance to fit the model in view
        const distance = maxDim / (2 * Math.tan(fov / 2)) * 1.75; // 1.5x padding

        // Position the camera at the model's center point
        camera.position.copy(center);
        camera.position.z += distance;
        camera.lookAt(center);

        // Dynamically adjust near/far clipping planes based on model size
        camera.near = distance / 100;
        camera.far = distance * 100;
        camera.updateProjectionMatrix();

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
        if (loadedModel) 
        {
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

// Function to generate a thumbnail from a 3D model
export async function generateThumbnail(modelUrl)
{
    return new Promise((resolve, reject) => {
        const canvas = document.createElement('canvas');
        canvas.width = 400;
        canvas.height = 300;
        
        const renderer = new THREE.WebGLRenderer({
            canvas,
            antialias: true,
            alpha: true,
            preserveDrawingBuffer: true // Required for toDataURL
        });
        
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(45, canvas.width / canvas.height, 0.1, 1000);

        // Setup lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(5, 5, 5).normalize();
        scene.add(directionalLight);

        const loader = new GLTFLoader();
        loader.load(modelUrl, (gltf) => {
            const model = gltf.scene;
            scene.add(model);

            // Center and scale model
            const box = new THREE.Box3().setFromObject(model);
            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z);
            const fit = 5; // Fit to 5 units
            const scale = fit / maxDim;

            model.position.set(-center.x * scale, -center.y * scale, -center.z * scale);
            model.scale.set(scale, scale, scale);

            // Position camera
            camera.position.set(0, 0, fit * 2);
            camera.lookAt(0, 0, 0);

            // Set background
            renderer.setClearColor(0xFFFFFF, 1); // 0x353535
            renderer.render(scene, camera);

            // Convert to data URL
            const dataUrl = canvas.toDataURL('image/jpeg', 0.85);

            resolve(dataUrl);

            // Cleanup using shared function
            disposeSceneResources(scene, renderer);
        }, undefined, (error) => {
            // Cleanup on error
            disposeSceneResources(scene, renderer);
            reject(error);
        });
    });
}