import { initThreeJS, generateThumbnail } from './threejs.js';
import { showNotification } from './utils.js';

// Select elements
const overlay = document.getElementById('overlay');
const uploadArea = document.getElementById('upload-area');
const fileInput = document.getElementById('images');
const chooseFileBtn = document.getElementById('chooseFileBtn');
const uploadedFilesDiv = document.getElementById('uploaded-files');
const submitBtn = document.getElementById('submitBtn');
const clearBtn = document.getElementById('clearBtn');
const uploadedFilesArea = document.getElementById('uploaded-files-area');
const modal = document.getElementById('modelModal');
const modelPreviewbackBtn = document.getElementById('backButton');

const zoomInBtn = document.getElementById('zoomInButton');
const zoomOutBtn = document.getElementById('zoomOutButton');
const panBtn = document.getElementById('panButton');
const fullscreenBtn = document.getElementById('fullscreenButton');
const downloadModelBtn = document.getElementById('downloadModelButton');

const menuToggleBtn = document.getElementById('menuToggleBtn');
const slideMenu = document.getElementById('slideMenu');
const closeMenuBtn = document.getElementById('closeMenuBtn');
const menuOverlay = document.getElementById('menuOverlay');

// Array to keep track of uploaded files
let uploadedFiles = [];
let currentScene = null;
let currentModelUrl = null;
let thumbnailDataUrl = null;
let currentModelId = null;


/** 
 * We then need to revert that visibility CSS property once the DOM has been loaded and is ready. 
 * For that, I’m using a simple helper function, a bit like jQuery’s document.ready() method. 
 * It calls a callback method once the document is in a “complete” or “interactive” state.
 * So we simply change the visibility property of my <body> tag to visible.
 * */

// Helper function for DOM ready state
const domReady = (cb) => { 
    document.readyState === 'interactive' || document.readyState === 'complete'
    ? cb()
    : document.addEventListener('DOMContentLoaded', cb);
};

// helper function to convert Data URL to Blob
function dataURLtoBlob(dataUrl) 
{
    const arr = dataUrl.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) u8arr[n] = bstr.charCodeAt(n);
    return new Blob([u8arr], { type: mime });
}

/**  
 * Fetch model details
 * Model ID: modelInfo.id
 * Filename: modelInfo.filename
 * Created At: new Date(modelInfo.created_at).toLocaleString()
**/
async function fetchModelDetails(modelId) 
{
    try 
    {
        const response = await fetch(`/api/models/${modelId}/info`);
        if (!response.ok) 
        {
            throw new Error(`Failed to fetch model info: ${response.status} ${response.statusText}`);
        }
        const modelInfo = await response.json();
        return modelInfo;
    } 
    catch (error) 
    {
        console.error('Error fetching model details:', error);
        showNotification(`Error fetching model details: ${error.message}`, 'error');
        return null;
    }
}

// Centralized function to download a model
async function downloadModel(modelId, modelCard=null)
{
    try
    {
        // model ID verification
        if (!modelId) throw new Error('Missing model ID');

        const response = await fetch(`/api/models/${modelId}`);
        // Check for HTTP errors
        if (!response.ok) 
        {
            throw new Error(`Download failed: ${response.status} ${response.statusText}`);
        }
        const modelBlob = await response.blob();

        let modelFilename = null
        if(modelCard !=null)
        {
            modelFilename = modelCard.querySelector('.model-title').textContent; // Use the displayed filename
        }
        else
        {
            const modelInfo = await fetchModelDetails(modelId);
            modelFilename = modelInfo ? modelInfo.filename : 'model.glb';
        }

        // Ensure the filename ends with '.glb'
        if (!modelFilename.toLowerCase().endsWith('.glb')) 
        {
            modelFilename += '.glb';
        }

        const url = URL.createObjectURL(modelBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = modelFilename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showNotification('Model download completed', 'success');
    }
    catch (error) 
    {
        console.error('Error during model download:', error);
        showNotification(`Error downloading model: ${error.message}`, 'error');
    }
}

domReady(() => {
    // Display body when DOM is loaded
    document.body.style.visibility = 'visible';
});

const cleanupPreviousScene = () => {
    if (currentScene) 
    {
        currentScene.dispose();
        currentScene = null;
    }
    
    if (currentModelUrl) 
    {
        URL.revokeObjectURL(currentModelUrl);
        currentModelUrl = null;
    }

    if (thumbnailDataUrl) 
    {
        URL.revokeObjectURL(thumbnailDataUrl);
        thumbnailDataUrl = null;
    }
};

// NEW: Function to open the side menu
const openMenu = () => {
    slideMenu.classList.add('open');
    menuOverlay.style.display = 'block'; // Show overlay
    // Trigger transition for opacity after display block
    setTimeout(() => menuOverlay.style.opacity = 1, 10);
    document.body.style.overflow = 'hidden'; // Prevent scrolling background
};

// NEW: Function to close the side menu
const closeMenu = () => {
    slideMenu.classList.remove('open');
    menuOverlay.style.opacity = 0; // Fade out overlay
    // Hide overlay after transition
    setTimeout(() => menuOverlay.style.display = 'none', 300);
    document.body.style.overflow = ''; // Allow scrolling background
};

// Load saved models initially
document.addEventListener('DOMContentLoaded', () => {
    loadSavedModels();

    // Event delegation for model actions
    document.getElementById('model-list').addEventListener('click', async (e) => {
        const modelCard = e.target.closest('.model-card');
        if (!modelCard) return;
        
        const modelId = modelCard.dataset.modelId;
        
        // Delete action
        if (e.target.classList.contains('delete-model')) 
        {
            if (confirm('Are you sure you want to delete this model?')) {
                try 
                {
                    await fetch(`/api/models/${modelId}`, { method: 'DELETE' });
                    loadSavedModels();
                } 
                catch (error) 
                {
                    console.error('Error deleting model:', error);
                    showNotification(`Error deleting model: ${error.message}`, 'error');
                }
            }
        }
        
        // Rename action
        if (e.target.classList.contains('rename-model')) 
        {
            if (!modelId) throw new Error('Missing model ID');
            // Prompt for new name
            const titleElement = modelCard.querySelector('.model-title');
            const currentName = titleElement.textContent;
            const newName = prompt('Enter new model name:', currentName);
            
            if (newName && newName !== currentName) 
            {
                try 
                {
                    const response = await fetch(`/api/models/${modelId}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ filename: newName })
                    });
                    
                    if (response.ok) 
                    {
                        titleElement.textContent = newName;
                        showNotification('Model renamed successfully!', 'success');
                    } 
                    else 
                    {
                        throw new Error('Failed to rename model');
                    }
                }
                catch (error) 
                {
                    console.error('Error renaming model:', error);
                    showNotification(`Error renaming model: ${error.message}`, 'error');
                }
            }
        }

        // Download action
        if (e.target.classList.contains('download-model')) 
        {
            try 
            {
                downloadModel(modelId, modelCard);
            } 
            catch (error) 
            {
                console.error('Error downloading model:', error);
                showNotification(`Error downloading model: ${error.message}`, 'error');
            }
        }
    });


    document.getElementById('model-list').addEventListener('click', (e) => {
    const modelCard = e.target.closest('.model-card');
    if (modelCard && !e.target.closest('.model-actions')) 
    {
        document.querySelectorAll('.model-menu').forEach(menu => {
            menu.style.display = 'none';
        });
    }
    });
});

// Event listeners for the side menu
menuToggleBtn.addEventListener('click', () => {
    if (slideMenu.classList.contains('open')) 
    {
        closeMenu();
    } 
    else 
    {
        openMenu();
    }
});
closeMenuBtn.addEventListener('click', closeMenu);
menuOverlay.addEventListener('click', closeMenu); // Close when clicking outside menu


// Trigger file input when clicking the "Choose Images" button
chooseFileBtn.addEventListener('click', () => {
    // No need to open file uploading window since uploadArea
    // click event is triggerring by clicking the "choose images"
    // button.
    //console.log("Upload Button file upload activated");
});

// Trigger file input when clicking the upload area
uploadArea.addEventListener('click', () => {
    //console.log("Upload area file upload activated");   
    fileInput.click();
});

// Handle drag and drop events
uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('dragging');
});

uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('dragging');
});

uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragging');
    const files = e.dataTransfer.files;
    
    if (files.length > 0) {
        // Handle the dropped files
        handleFiles(files); 
    }
});

// Handle file input change
fileInput.addEventListener('change', (e) => {
    const files = e.target.files;
    if (files.length > 0) 
    {
        // Handle the selected files
        handleFiles(files); 
    }
});

// Function to handle files
function handleFiles(files) 
{
    //uploadedFiles = []; // Clear previous files to ensure only newly selected/kept files are managed
    for (let i = 0; i < files.length; i++) 
    {
        // Pushes the File object
        uploadedFiles.push(files[i]); 
    }
    // Update the display
    updateUploadedFilesDisplay();
    // Show notification after files are selected
    showNotification("Success : " + files.length + ' File(s) selected successfully!', 'success');
}

// Function to update the uploaded files display
function updateUploadedFilesDisplay() 
{
    // Clear previous display
    uploadedFilesDiv.innerHTML = ''; 
    // Create a container for files
    const fileContainer = document.createElement('div'); 
    // Use flexbox for horizontal layout
    fileContainer.style.display = 'flex'; 
    // Allow wrapping if needed
    fileContainer.style.flexWrap = 'wrap'; 
    // Space between file elements
    fileContainer.style.gap = '10px'; 

    uploadedFiles.forEach((file, index) => {
        // Create a div for each file
        const fileElement = document.createElement('div'); 
        // Use flexbox for file name and button
        fileElement.style.display = 'flex'; 
        // Center align items
        fileElement.style.alignItems = 'center';

        // Specify the maximum length of the displayed file name
        const maxLength = 10; 
        // Truncate the file name to a specified length
        const truncatedName = file.name.length > maxLength ? file.name.substring(0, maxLength) + '...' : file.name;

        // Create a span for the file name
        const fileText = document.createElement('span'); 
        // Set the file name text
        fileText.textContent = truncatedName; 
        // Set the full file name as the title for hover effect
        fileText.title = file.name; 

        // Create a cancel button
        const cancelButton = document.createElement('button'); 
        // Use an 'X' for cancel
        cancelButton.textContent = '✖'; 
        // Space between name and button
        cancelButton.style.marginLeft = '5px'; 
        // No background
        cancelButton.style.background = 'none'; 
        // No border
        cancelButton.style.border = 'none'; 
        // Red color for the cancel button
        cancelButton.style.color = '#ff4d4d'; 
        // Pointer cursor on hover
        cancelButton.style.cursor = 'pointer'; 

        // Add event listener to remove the file
        cancelButton.addEventListener('click', () => {
            // console.log("Before cancel :" + uploadedFiles);
            // console.log("File count: " + uploadedFiles.length);
            // Remove the file from the array
            uploadedFiles.splice(index, 1); 
            // Update the display
            updateUploadedFilesDisplay(); 
            // console.log("After cancel :" + uploadedFiles);
            // console.log("File count: " + uploadedFiles.length);
        });

        // Append the file name and cancel button to the file element
        fileElement.appendChild(fileText);
        fileElement.appendChild(cancelButton);
        // Append the file element to the container
        fileContainer.appendChild(fileElement); 
    });

    // Append the container to the uploaded files div
    uploadedFilesDiv.appendChild(fileContainer); 
    // Show or hide the uploaded files area based on images uploaded or not
    uploadedFilesArea.style.display = uploadedFiles.length ? 'block' : 'none';
}

// Control management
const setupControls = (camera, controls) => {
    // Zoom functionality
    zoomInBtn.addEventListener('click', () => {
        // Increase zoom
        camera.zoom += 0.1;
        // Update camera projection
        camera.updateProjectionMatrix();
    });

    zoomOutBtn.addEventListener('click', () => {
        // Decrease zoom
        camera.zoom -= 0.1;
        // Update camera projection
        camera.updateProjectionMatrix();
    });

    // Pan functionality (toggle)
    // Disable panning by default
    controls.enablePan = false;
    panBtn.addEventListener('click', () => {
        // Enable or disable panning
        controls.enablePan = !controls.enablePan;
        // Change the icon based on the panning state
        panBtn.innerHTML = controls.enablePan 
            ? '<i class="fas fa-arrows-alt"></i>' 
            : '<i class="fas fa-ban"></i>';
        panBtn.classList.toggle('active', controls.enablePan);
    });

    // =================================== Touch screen support ========================================
    let touchStartDistance = 0;
    let initialTouchPosition = null;
    const touchZoomSensitivity = 0.01;
    const touchPanSensitivity = 1.5;
    
    // Touch event handlers
    const container = document.getElementById('3d-container');
    
    container.addEventListener('touchstart', (e) => {
        if (e.touches.length === 1) 
        {
            // Single touch - potential pan start
            initialTouchPosition = {
                x: e.touches[0].clientX,
                y: e.touches[0].clientY
            };
        } 
        else if (e.touches.length === 2) 
        {
            // Two touches - pinch to zoom
            touchStartDistance = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
        }
        e.preventDefault();
    });

    container.addEventListener('touchmove', (e) => {
        if (e.touches.length === 1 && initialTouchPosition && controls.enablePan) 
        {
            // Single finger panning
            const deltaX = (e.touches[0].clientX - initialTouchPosition.x) * touchPanSensitivity;
            const deltaY = (e.touches[0].clientY - initialTouchPosition.y) * touchPanSensitivity;
            
            // Adjust pan speed based on zoom level
            const panSpeed = camera.zoom * 0.1;
            
            // Update camera position
            camera.position.x -= deltaX * panSpeed;
            camera.position.y += deltaY * panSpeed;
            camera.updateProjectionMatrix();
            
            // Update initial position for next move
            initialTouchPosition = {
                x: e.touches[0].clientX,
                y: e.touches[0].clientY
            };
        } 
        else if (e.touches.length === 2) 
        {
            // Pinch zoom
            const currentDistance = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
            
            const zoomDelta = (touchStartDistance - currentDistance) * touchZoomSensitivity;
            camera.zoom += zoomDelta;
            
            // Constrain zoom values
            camera.zoom = Math.max(0.1, Math.min(5, camera.zoom));
            camera.updateProjectionMatrix();
            
            touchStartDistance = currentDistance;
        }
        e.preventDefault();
    });

    container.addEventListener('touchend', () => {
        initialTouchPosition = null;
    });

    // Double-tap for fullscreen
    let lastTap = 0;
    container.addEventListener('touchend', (e) => {
        const currentTime = new Date().getTime();
        const tapLength = currentTime - lastTap;
        
        if (tapLength < 300 && tapLength > 0) {
            fullscreenBtn.click();
        }
        lastTap = currentTime;
    });

    // =================================== Touch screen support ========================================

    // keyboard controls for zoom and fullscreen
    document.addEventListener('keydown', (e) => {
    if (modal.style.display !== 'block') return;
    
    switch(e.key) 
    {
        case '+': 
            camera.zoom += 0.1;
            camera.updateProjectionMatrix();
            break;
        case '-':
            camera.zoom -= 0.1;
            camera.updateProjectionMatrix();
            break;
        case 'f':
        case 'F':
            fullscreenBtn.click();
            break;
        case 'p':
        case 'P':
            panBtn.click();
            break;
        case 'd':
        case 'D':
            downloadModelBtn.click();
            break;
    }
});
};

// Model loading handler
const loadModel = async (modelSource) => {
    if (currentScene) 
    {
        currentScene.dispose();
        currentScene = null;
    }

    // Show the modal immediately
    modal.style.display = 'block';
    // Initialize Three.js scene and get camera
    const { camera, controls } = initThreeJS(modelSource);
    // Set up controls for the camera
    setupControls(camera, controls);
};

submitBtn.addEventListener('click', async () => {
    // Show overlay after submitting
    overlay.style.display = 'flex';
    try 
    {
        // Create FormData manually from the `uploadedFiles` array
        const formData = new FormData();
        uploadedFiles.forEach(file => {
            // Append each File object
            formData.append('images[]', file, file.name); 
        });

        // Check if any files are actually being uploaded
        if (uploadedFiles.length === 0) {
            showNotification('No images selected for upload.', 'error');
            return; // Exit if no files
        }

        let response = await fetch('/upload', {
            method: 'POST',
            body: formData // Use the manually constructed FormData
        });

        if (!response.ok) throw new Error(await response.text());

        // Read the response as an ArrayBuffer
        const arrayBuffer = await response.arrayBuffer();
        // Create a Blob from the ArrayBuffer
        const blob = new Blob([arrayBuffer], { type: 'model/gltf+json' });
        // URL for Three.js viewer
        currentModelUrl = URL.createObjectURL(blob); 

        // Generate thumbnail
        thumbnailDataUrl = await generateThumbnail(currentModelUrl);
        // Convert Data URL to Blob
        const thumbnailBlob = dataURLtoBlob(thumbnailDataUrl);

        // Get the original filename from the first file input, without extension for naming purposes
        const originalInputFilename = uploadedFiles.length > 0
            ? uploadedFiles[0].name.split('.').slice(0, -1).join('.')
            : 'model';
        const proposedFilenameForSave = originalInputFilename + '.glb';

        // Save model to backend and get its saved ID and filename
        const saveResponse = await fetch('/save-model', {
            method: 'POST',
            body: (() => {
                const fd = new FormData();
                fd.append('model', blob, proposedFilenameForSave);
                fd.append('thumbnail', thumbnailBlob, 'thumbnail.jpg');
                return fd;
            })()
        });

        if (!saveResponse.ok) 
        {
            showNotification(`Error saving the model: ${saveResponse.statusText}`, 'error');
            throw new Error(`Failed to save model: ${saveResponse.statusText}`);
        }
        // Parse the JSON response
        const savedModelInfo = await saveResponse.json(); 
        // Store the ID for the model currently in viewer
        currentModelId = savedModelInfo.id;
        // console.log("Submit Model ID:", currentModelId);

        // Loads the model into the modal
        loadModel(currentModelUrl); 
        // Refreshes the gallery
        loadSavedModels(); 
        showNotification('Model uploaded and saved successfully!', 'success');
    }
    catch (error) 
    {
        console.error('Error uploading model:', error);
        showNotification(`Error: ${error.message}`, 'error');
        // Clean up URLs and reset ID if error occurs
        if (currentModelUrl) URL.revokeObjectURL(currentModelUrl);
        currentModelUrl = null;
        currentModelId = null;
    }
    finally 
    {
         // Remove overlay after response is displayed.
        overlay.style.display = 'none';
        //uploadedFiles = []; // Clear uploaded files list after successful upload or error
        //updateUploadedFilesDisplay(); // Update display to clear the list
    }
});

clearBtn.addEventListener('click', () => {
    if(uploadedFiles.length)
    {
        // Clear the uploaded files array
        uploadedFiles = []; 
        // Update the display
        updateUploadedFilesDisplay(); 
        // Show notification
        showNotification('Uploaded files cleared.', 'success');
    }
});

// Download model button functionality
downloadModelBtn.addEventListener('click', () => {
    if (currentModelId) 
    {
        downloadModel(currentModelId, null);
    } 
    else 
    {
        console.log("URL :" + currentModelUrl);
        //console.log("Filename :" + currentModelFilename);
        showNotification('No model to download.', 'error');
    }
});


// Close button functionality for the modal
document.getElementById('closeModal').addEventListener('click', () => {
    // Hide the modal
    modal.style.display = 'none'; 
    cleanupPreviousScene();
});

// Close the modal when clicking outside the modal
window.onclick = function(event) 
{
    if (event.target === modal) 
    {
        modal.style.display = 'none';
        cleanupPreviousScene();
    }
};

// Back button functionality
modelPreviewbackBtn.addEventListener('click', () => {
    // Hide the modal
    modal.style.display = 'none'; 
    // Cleanup the scene
    cleanupPreviousScene();
});

// Fullscreen button functionality
fullscreenBtn.addEventListener('click', () => {
    const modalContent = document.querySelector('.modal-content');

    if (!document.fullscreenElement) 
    {
        modalContent.requestFullscreen().catch(err => {
            showNotification(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`, 'error');
            console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
        });
    } 
    else 
    {
        document.exitFullscreen();
    }
});

// Handle fullscreen change events
document.addEventListener('fullscreenchange', () => {
    fullscreenBtn.innerHTML = document.fullscreenElement ? '<i class="fas fa-compress"></i>' : '<i class="fas fa-expand"></i>';
});

// function to load saved models from the database and display them
const loadSavedModels = async () => {
    try
    {
        const response = await fetch('/api/models');
        const models = await response.json();
        const modelList = document.getElementById('model-list');
        
        modelList.innerHTML = models.map(model => `
            <div class="model-card" data-model-id="${model.id}">
                <div class="model-actions">
                    <button class="model-menu-btn">⋯</button>
                    <div class="model-menu">
                        <button class="menu-item rename-model">Rename</button>
                        <button class="menu-item download-model">Download</button>
                        <button class="menu-item delete-model">Delete</button>
                    </div>
                </div>

                <div class="model-thumbnail" 
                style="background-image: ${model.thumbnail ? `url('data:image/jpeg;base64,${model.thumbnail}')` : 'none'}; background-size: cover; background-position: center;">
                </div>

                <div class="model-title-container">
                    <h3 class="model-title" title="${model.filename}">${model.filename}</h3>
                </div>
                <small>${new Date(model.created_at).toLocaleDateString()}</small>
            </div>
        `).join('');

        // Add event listeners for menu buttons
        document.querySelectorAll('.model-menu-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const menu = btn.nextElementSibling;
                menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
            });
        });
        
        // Close menus when clicking elsewhere
        document.addEventListener('click', (e) => {
            if (!e.target.matches('.model-menu-btn')) 
            {
                document.querySelectorAll('.model-menu').forEach(menu => {
                    menu.style.display = 'none';
                });
            }
        });
    }
    catch (error) 
    {
        console.error('Error loading models:', error);
        showNotification(`Error loading models: ${error.message}` , 'error');
    }
}

// Add event listener for model cards
document.getElementById('model-list').addEventListener('click', async (e) => {
    const modelCard = e.target.closest('.model-card');
    if (!modelCard) return;

    // Don't load model if clicking on menu items
    if (e.target.closest('.model-menu') || e.target.classList.contains('model-menu-btn')) {
        return;
    }
    
    try
    {
        currentModelId = modelCard.dataset.modelId;
        const response = await fetch(`/api/models/${modelCard.dataset.modelId}`);
        const modelData = await response.blob();
        const currentModelUrl = URL.createObjectURL(modelData);
        loadModel(currentModelUrl);
    }
    catch(error)
    {
        console.error('Error loading model:', error);
        showNotification(`Error loading model: ${error.message}`, 'error');
    }
});