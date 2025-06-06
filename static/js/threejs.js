// Import the THREE.js library and its modules
import * as THREE from "https://cdn.skypack.dev/three@0.129.0/build/three.module.js";
import { OrbitControls } from "https://cdn.skypack.dev/three@0.129.0/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "https://cdn.skypack.dev/three@0.129.0/examples/jsm/loaders/GLTFLoader.js";
import { showNotification } from './utils.js';

// Global renderer instance, intended to be a singleton
let renderer; 
// Stores references to the current scene components (scene, camera, controls, etc.)
let currentScene = null; 

// Cache for reusable generic materials with better default colors
const materialCache = 
{
    meshStandardMaterial: new THREE.MeshStandardMaterial({ color: 0x808080, side: THREE.DoubleSide }), // A neutral grey
    meshPhongMaterial: new THREE.MeshPhongMaterial({ color: 0x808080, shininess: 200, side: THREE.DoubleSide }), // A neutral grey, requires light
    meshBasicMaterial: new THREE.MeshBasicMaterial({ color: 0x808080, side: THREE.DoubleSide }), // A neutral grey, not affected by light
    lineBasicMaterial: new THREE.LineBasicMaterial({ color: 0x333333 }) // Dark grey for wireframe, visible on light/dark backgrounds
};

// Map to store original materials of meshes, keyed by mesh UUID.
// This is crucial for reverting to the model's loaded appearance.
const originalMaterials = new Map();


// Function to create or retrieve the global renderer instance
const createRenderer = () => {
    // Only create renderer if it doesn't exist
    if (!renderer) 
    {
        renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true // Enable transparency for the canvas background
            //powerPreference: "high-performance",
            //logarithmicDepthBuffer: true,
        });
        // Set pixel ratio for sharp rendering on high-DPI displays
        // renderer.setPixelRatio(window.devicePixelRatio); 
        // Set output color space for correct color reproduction
        // renderer.outputColorSpace = THREE.SRGBColorSpace; 
    }
    return renderer;
};

// Reusable helper function to dispose of individual Three.js object resources (geometry, materials, textures)
function disposeObjectResources(object) 
{
    if (!object.isMesh) return; // Only process meshes

    // Dispose geometry
    if (object.geometry) 
    {
        object.geometry.dispose();
    }

    // Function to safely dispose of a single material and its textures
    const cleanSingleMaterial = (material) => {
        if (material && material.isMaterial) 
        {
            material.dispose(); // Dispose the material itself
            // Iterate over all properties of the material to find and dispose textures
            for (const key of Object.keys(material)) 
            {
                const value = material[key];
                if (value && typeof value === 'object' && 'isTexture' in value) 
                {
                    value.dispose(); // Dispose texture
                }
            }
        }
    };

    // Handle single material or array of materials
    if (Array.isArray(object.material)) 
    {
        for (const material of object.material)
        {
            cleanSingleMaterial(material);
        }
    } 
    else if (object.material)
    {
        cleanSingleMaterial(object.material);
    }
}

// Main scene cleanup function (exported)
// This will clean up the current scene's objects, controls, and event listeners,
// but NOT dispose the global renderer, allowing it to be reused.
export const disposeScene = () => {
    if (!currentScene) return; // If no scene is active, do nothing

    // Dispose all objects in the scene graph recursively
    currentScene.scene.traverse(object => {
        disposeObjectResources(object);
    });

    // Clear the scene itself (removes all objects and children from the scene graph)
    currentScene.scene.clear();

    // Dispose OrbitControls to free up its event listeners
    if (currentScene.controls) 
    {
        currentScene.controls.dispose();
    }

    // Remove the window resize listener
    if (currentScene.resizeHandler) 
    {
        window.removeEventListener('resize', currentScene.resizeHandler);
    }

    // Remove the renderer's DOM element from its container
    const container = document.getElementById('3d-container');
    if (container && currentScene.renderer.domElement.parentNode === container) 
    {
        container.removeChild(currentScene.renderer.domElement);
    }

    // Clear the map of original materials for the next model load
    originalMaterials.clear();
    // Reset the global currentScene variable
    currentScene = null;
};


// Function to initialize the Three.js scene and load a model (exported)
export function initThreeJS(modelPath) 
{
    // Before initializing a new scene, clean up any existing one
    if (currentScene) 
    {
        disposeScene(); // Call the explicit disposeScene function to clean up
    }

    const container = document.getElementById('3d-container');
    // Create new scene, camera, and get the global renderer instance
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
    const rendererInstance = createRenderer(); // Use the global/singleton renderer

    // Set renderer size to match container and append to DOM
    rendererInstance.setSize(container.clientWidth, container.clientHeight);
    container.innerHTML = ''; // Clear any previous content in the container
    container.appendChild(rendererInstance.domElement);

    // Add ambient light for general scene illumination
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7); // Soft white light
    scene.add(ambientLight);

    // Add multiple directional lights for better model visibility and shading
    const directionalLight1 = new THREE.DirectionalLight(0xffffff, 1.2);
    directionalLight1.position.set(5, 5, 5).normalize();
    scene.add(directionalLight1);

    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight2.position.set(-5, 5, 5).normalize();
    scene.add(directionalLight2);

    const directionalLight3 = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight3.position.set(0, -5, 5).normalize();
    scene.add(directionalLight3);

    const directionalLight4 = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight4.position.set(0, 5, -5).normalize();
    scene.add(directionalLight4);

    // Add OrbitControls for user interaction
    const controls = new OrbitControls(camera, rendererInstance.domElement);
    controls.enableDamping = true; // Smooth controls movement
    controls.dampingFactor = 0.05;

    let loadedModel; // This variable will hold the GLTF scene (the 3D model)

    // Load the 3D model using GLTFLoader
    const loader = new GLTFLoader();

    loader.load(modelPath, function(gltf) 
    {
        console.log('Model loaded successfully:', gltf);
        loadedModel = gltf.scene;
        scene.add(loadedModel);

        // Traverse the loaded model to store original materials of each mesh
        loadedModel.traverse((child) => {
            if (child.isMesh) 
            {
                if (child.material) 
                {
                    // Store a clone of the original material(s)
                    // This is crucial for the "Original Material" option
                    if (Array.isArray(child.material)) 
                    {
                        originalMaterials.set(child.uuid, child.material.map(mat => mat.clone()));
                    } 
                    else 
                    {
                        originalMaterials.set(child.uuid, child.material.clone());
                    }
                }
            }
        });

        // Calculate bounding box to fit the model in view and set camera position
        const box = new THREE.Box3().setFromObject(loadedModel);
        const center = new THREE.Vector3();
        const size = new THREE.Vector3();
        box.getCenter(center);
        box.getSize(size);

        const maxDim = Math.max(size.x, size.y, size.z);
        const fov = camera.fov * (Math.PI / 180); // Convert fov (Field of View) to radians
        // Improved camera distance calculation with padding
        const distance = maxDim / (2 * Math.tan(fov / 2)) * 1.75; // Add padding for better view

        // Position camera to look at the center of the model
        camera.position.copy(center);
        camera.position.z += distance;
        camera.lookAt(center);

        // Adjust near/far clipping planes dynamically based on model size
        camera.near = distance / 100;
        camera.far = distance * 100;
        camera.updateProjectionMatrix();

        // Set controls target to the center of the model for rotation/panning
        controls.target.copy(center);
        controls.update();

        animate(); // Start the animation loop after model is loaded
    }, undefined, (error) => {
        // Error callback for model loading
        console.error('An error occurred while loading the model : ', error);
        showNotification('Error loading model: ' + error, 'error');
        disposeScene(); // Clean up if loading fails
    });

    // Material change functionality from dropdown
    const materialSelect = document.getElementById('materialSelect');
    // Set the default selected option. 'originalMaterial' is a good default.
    materialSelect.value = 'originalMaterial'; 
    materialSelect.addEventListener('change', (event) => {
        const selectedMaterialType = event.target.value;

        if (loadedModel) 
        {
            loadedModel.traverse((child) => {
                if (child.isMesh) 
                {
                    // Dispose of any previously added wireframe geometry/material
                    const existingWireframe = child.children.find(c => c.isLineSegments);
                    if (existingWireframe) 
                    {
                        existingWireframe.geometry.dispose();
                        existingWireframe.material.dispose(); // Dispose wireframe material
                        child.remove(existingWireframe);
                    }

                    if (selectedMaterialType === 'wireframe') 
                    {
                        // Make the original mesh material transparent to reveal the wireframe
                        const originalMaterial = originalMaterials.get(child.uuid);
                        if (originalMaterial) 
                        {
                            // If original material is an array, iterate and make each transparent
                            if (Array.isArray(originalMaterial)) 
                            {
                                child.material = originalMaterial.map(mat => {
                                    const transparentMat = mat.clone(); // Clone to not modify original cached material
                                    transparentMat.transparent = true;
                                    transparentMat.opacity = 0;
                                    return transparentMat;
                                });
                            } 
                            else 
                            {
                                // If single material, make it transparent
                                child.material = originalMaterial.clone(); // Clone
                                child.material.transparent = true;
                                child.material.opacity = 0;
                            }
                        } 
                        else 
                        {
                            // Fallback: apply a transparent basic material if original not found
                            child.material = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 });
                        }
                        
                        // Now add the wireframe on top (which your code already does correctly)
                        child.add(new THREE.LineSegments(
                            new THREE.EdgesGeometry(child.geometry),
                            materialCache.lineBasicMaterial.clone() // Always clone for safety
                        ));
                    } 
                    else if (selectedMaterialType === 'originalMaterial') 
                    {
                        // Restore original material(s)
                        const originalMat = originalMaterials.get(child.uuid);
                        if (originalMat) 
                        {
                            // IMPORTANT: Clone original material(s) to avoid shared references
                            // and ensure properties are not modified accidentally.
                            if (Array.isArray(originalMat)) 
                            {
                                child.material = originalMat.map(mat => mat.clone());
                            } 
                            else 
                            {
                                child.material = originalMat.clone();
                            }
                        } 
                        else 
                        {
                            // Fallback if original not found (should be rare with correct caching)
                            child.material = materialCache.meshStandardMaterial.clone();
                        }
                    }
                    else 
                    {
                        // Apply one of the generic materials from the cache
                        // IMPORTANT: Always clone the material from cache.
                        // This prevents modifications to the cached instance from affecting other meshes.
                        child.material = materialCache[selectedMaterialType].clone();
                    }
                    // Inform Three.js that the material has changed
                    child.material.needsUpdate = true; 
                }
            });
        }
    });

    // Animation loop function
    const animate = () => {
        // Request the next animation frame, creating a continuous loop
        requestAnimationFrame(animate); 
        controls.update(); // Update controls (required for damping)
        rendererInstance.render(scene, camera); // Render the scene
    };

    // Resize handler function
    const handleResize = () => {
        // Update camera aspect ratio and projection matrix
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        // Update renderer size
        rendererInstance.setSize(container.clientWidth, container.clientHeight);
    };

    // Add and store the resize handler so it can be properly removed later
    const resizeHandlerRef = handleResize;
    window.addEventListener('resize', resizeHandlerRef);

    // Store references to scene components for later cleanup
    currentScene = {
        scene,
        camera,
        renderer: rendererInstance,
        controls,
        resizeHandler: resizeHandlerRef // Store reference to allow removal
    };

    // Return the camera and controls as the caller needs direct access
    return { camera, controls };
}

// Function to generate a thumbnail from a 3D model (exported)
export async function generateThumbnail(modelUrl) 
{
    return new Promise((resolve, reject) => {
        // Create a temporary canvas for thumbnail rendering
        const canvas = document.createElement('canvas');
        canvas.width = 400;
        canvas.height = 400;

        // Create a dedicated renderer for the thumbnail, which will be disposed afterwards
        const thumbnailRenderer = new THREE.WebGLRenderer({
            canvas,
            antialias: true,
            alpha: true,
            preserveDrawingBuffer: true // Essential for toDataURL to work
        });

        // Create a temporary scene and camera for the thumbnail
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(45, canvas.width / canvas.height, 0.1, 1000);

        // Setup lighting for the thumbnail scene
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
        scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(3, 3, 3).normalize();
        scene.add(directionalLight);

        // Load the model specifically for thumbnail generation
        const loader = new GLTFLoader();
        loader.load(modelUrl, (gltf) => {
            const model = gltf.scene;
            scene.add(model);

            // Center and scale the model to fit well within the thumbnail
            const box = new THREE.Box3().setFromObject(model);
            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z);
            const fit = 5; // Target size for the model in the thumbnail view
            const scale = fit / maxDim;

            model.position.set(-center.x * scale, -center.y * scale, -center.z * scale);
            model.scale.set(scale, scale, scale);

            // Position the camera to capture the model for the thumbnail
            camera.position.set(0, 0, fit * 2);
            camera.lookAt(0, 0, 0);

            // Set background color for the thumbnail (can be transparent by setting alpha to 0)
            thumbnailRenderer.setClearColor(0xFFFFFF, 1); // White solid background
            thumbnailRenderer.render(scene, camera); // Render the thumbnail scene

            // Convert the canvas content to a data URL (JPEG format)
            const dataUrl = canvas.toDataURL('image/jpeg', 0.9);

            resolve(dataUrl); // Resolve the promise with the data URL

            // Clean up resources used ONLY for this thumbnail generation
            scene.traverse(object => disposeObjectResources(object)); // Dispose scene objects
            scene.clear(); // Clear the temporary scene
            thumbnailRenderer.dispose(); // Dispose the temporary renderer
        }, undefined, (error) => {
            // Error callback for thumbnail loading
            console.error('An error occurred while generating thumbnail : ', error);
            // Ensure cleanup even on error
            scene.traverse(object => disposeObjectResources(object));
            scene.clear();
            thumbnailRenderer.dispose();
            reject(error); // Reject the promise
        });
    });
}