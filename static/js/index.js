import { initThreeJS, generateThumbnail } from './threejs.js';
import { showNotification } from './utils.js';

// Select elements
const overlay = document.getElementById('overlay');
const uploadArea = document.getElementById('upload-area');
const fileInput = document.getElementById('images');
const chooseFileBtn = document.getElementById('chooseFileBtn');
const uploadedFilesDiv = document.getElementById('uploaded-files');
const submitBtn = document.getElementById('submitBtn');
const uploadedFilesArea = document.getElementById('uploaded-files-area');
const modal = document.getElementById('modelModal');
const modelPreviewbackBtn = document.getElementById('backButton');

const zoomInBtn = document.getElementById('zoomInButton');
const zoomOutBtn = document.getElementById('zoomOutButton');
const panBtn = document.getElementById('panButton');
const fullscreenBtn = document.getElementById('fullscreenButton');

// Array to keep track of uploaded files
let uploadedFiles = [];
let currentScene = null;
let currentModelUrl = null;
let thumbnailDataUrl = null;


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

// Load saved models initially
document.addEventListener('DOMContentLoaded', () => {
    loadSavedModels();
});

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
    for (let i = 0; i < files.length; i++) 
    {
        // Add file name to the array
        uploadedFiles.push(files[i].name); 
    }

    // Update the display
    updateUploadedFilesDisplay(); 
    //console.log(uploadedFiles.toString() + " -> no of files :" + uploadedFiles.length);

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

    uploadedFiles.forEach((fileName, index) => {
        // Create a div for each file
        const fileElement = document.createElement('div'); 
        // Use flexbox for file name and button
        fileElement.style.display = 'flex'; 
        // Center align items
        fileElement.style.alignItems = 'center';

        // Specify the maximum length of the displayed file name
        const maxLength = 10; 
        // Truncate the file name to a specified length
        const truncatedName = fileName.length > maxLength ? fileName.substring(0, maxLength) + '...' : fileName;

        // Create a span for the file name
        const fileText = document.createElement('span'); 
        // Set the file name text
        fileText.textContent = truncatedName; 
        // Set the full file name as the title for hover effect
        fileText.title = fileName; 

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
            console.log("Before cancel :" + uploadedFiles);
            // Remove the file from the array
            uploadedFiles.splice(index, 1); 
            // Update the display
            updateUploadedFilesDisplay(); 
            console.log("After cancel :" + uploadedFiles);
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
        const response = await fetch('/upload', {
            method: 'POST',
            body: new FormData(document.getElementById('upload-form'))
        });
        
        if (!response.ok) throw new Error(await response.text());
        
        // Read the response as an ArrayBuffer
        const arrayBuffer = await response.arrayBuffer();
        // Create a Blob from the ArrayBuffer
        const blob = new Blob([arrayBuffer], { type: 'model/gltf+json' });
        
        currentModelUrl = URL.createObjectURL(blob)
        
        // Generate thumbnail
        thumbnailDataUrl = await generateThumbnail(currentModelUrl);
        // Convert Data URL to Blob
        const thumbnailBlob = dataURLtoBlob(thumbnailDataUrl);

        // Save and load model
        await fetch('/save-model', {
            method: 'POST',
            body: (() => {
                const fd = new FormData();
                fd.append('model', blob, 'model.glb');
                fd.append('thumbnail', thumbnailBlob, 'thumbnail.jpg');
                return fd;
            })()
        });

        loadModel(currentModelUrl);
        loadSavedModels();
    } 
    catch (error)
    {
        console.error('Error uploading model:', error);
        showNotification(`Error: ${error.message}`, 'error');
        // Clean up URL if error occurs
        if (currentModelUrl) URL.revokeObjectURL(currentModelUrl);
        currentModelUrl = null;
    } 
    finally 
    {
        // Remove overlay after response is displayed.
        overlay.style.display = 'none';
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
    // Show the upload area
    uploadedFilesArea.style.display = 'block'; 
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

// Optional: Handle fullscreen change events
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
                    <button class="delete-model" onclick="deleteModel(${model.id})">×</button>
                </div>

                <div class="model-thumbnail" 
                style="background-image: ${model.thumbnail ? `url('data:image/jpeg;base64,${model.thumbnail}')` : 'none'}">
                </div>

                <h3>${model.filename}</h3>
                <small>${new Date(model.created_at).toLocaleDateString()}</small>
            </div>
        `).join('');
    }
    catch (error) 
    {
        console.error('Error loading models:', error);
        showNotification(`Error loading models: ${error.message}` , 'error');
    }
}

// function to delete a model
async function deleteModel(modelId) 
{
    if (confirm('Are you sure you want to delete this model?')) 
    {
        await fetch(`/api/models/${modelId}`, { method: 'DELETE' });
        loadSavedModels();
    }
}

// Add event listener for model cards
document.getElementById('model-list').addEventListener('click', async (e) => {
    const modelCard = e.target.closest('.model-card');
    if (!modelCard) return;
    try
    {
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