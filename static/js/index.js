import { initThreeJS } from './threejs.js';

// Select elements
const uploadArea = document.getElementById('upload-area');
const fileInput = document.getElementById('images');
const chooseFileBtn = document.getElementById('chooseFileBtn');
const uploadedFilesDiv = document.getElementById('uploaded-files');
const submitBtn = document.getElementById('submitBtn');
const uploadedFilesArea = document.getElementById('uploaded-files-area');
const loadingSpinner = document.getElementById('loading');
const modal = document.getElementById('modelModal');

// Array to keep track of uploaded files
let uploadedFiles = [];

/** 
 * We then need to revert that visibility CSS property once the DOM has been loaded and is ready. 
 * For that, I’m using a simple helper function, a bit like jQuery’s document.ready() method. 
 * It calls a callback method once the document is in a “complete” or “interactive” state.
 * So we simply change the visibility property of my <body> tag to visible.
 * */

// Helper function
let domReady = (cb) => {
    document.readyState === 'interactive' || document.readyState === 'complete'
      ? cb()
      : document.addEventListener('DOMContentLoaded', cb);
  };
  
  domReady(() => {
    // Display body when DOM is loaded
    document.body.style.visibility = 'visible';
  });

// Helper function to show/hide loading spinner
function toggleLoadingSpinner(show) {
    loadingSpinner.style.display = show ? 'block' : 'none';
}


// Trigger file input when clicking the "Choose Images" button
chooseFileBtn.addEventListener('click', () => {
    fileInput.click();
});

// Trigger file input when clicking the upload area
uploadArea.addEventListener('click', () => {
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
    if (files.length > 0) {
        // Handle the selected files
        handleFiles(files); 
    }
});

// Function to handle files
function handleFiles(files) {
    for (let i = 0; i < files.length; i++) {
        // Add file name to the array
        uploadedFiles.push(files[i].name); 
    }
    // Update the display
    updateUploadedFilesDisplay(); 
}

// Function to update the uploaded files display
function updateUploadedFilesDisplay() {
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
            // console.log("Before cancel :" + uploadedFiles);
            // Remove the file from the array
            uploadedFiles.splice(index, 1); 
            // Update the display
            updateUploadedFilesDisplay(); 
            // console.log("After cancel :" + uploadedFiles);
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
    if (uploadedFiles.length > 0) {
        uploadedFilesArea.style.display = 'block'; 
    }
    else{
        uploadedFilesArea.style.display = 'none'; 
    }
}


submitBtn.addEventListener('click', async () => {
    const formData = new FormData(document.getElementById('upload-form'));

    // Show the modal immediately
    modal.style.display = 'block';
    toggleLoadingSpinner(true);

    console.log('spinning started');

    const response = await fetch('/upload', {
        method: 'POST',
        body: formData
    });

    // console.log("response :" + response.json());
    console.log('spinning stopped');
    toggleLoadingSpinner(false);

    if (response.ok) {

        const result = await response.json();
        
        const base64Model = result.model_path; // Get the Base64-encoded model

        console.log('base64 data :' + base64Model);

        // Create a Blob from the Base64 string
        const byteCharacters = atob(base64Model);
        const byteNumbers = new Uint8Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const blob = new Blob([byteNumbers], { type: 'model/gltf-binary' });
        const modelUrl = URL.createObjectURL(blob);

        console.log('model url :' + modelUrl);

        // Initialize Three.js scene
        initThreeJS(modelUrl);
    } 
    else {
        const error = await response.json();
        alert('Error: ' + error.error);
    }
});

// Close button functionality for the modal
document.getElementById('closeModal').addEventListener('click', () => {
    modal.style.display = 'none'; // Hide the modal
});

window.onclick = function(event) {
    if (event.target === modal) {
        modal.style.display = 'none';
    }
};