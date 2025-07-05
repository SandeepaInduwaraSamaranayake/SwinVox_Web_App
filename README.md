[![CodeFactor](https://www.codefactor.io/repository/github/sandeepainduwarasamaranayake/swinvox_web_app/badge)](https://www.codefactor.io/repository/github/sandeepainduwarasamaranayake/swinvox_web_app)

# **"SwinVox" 3D Reconstruction**

## Project Overview

SwinVox 3D Reconstruction is a web application designed to facilitate the upload of image datasets for 3D model reconstruction and provides an interactive 3D viewer for the reconstructed models. Users can easily upload images, view the resulting 3D models with various rendering options, and manage their saved models through a gallery interface.

## Features

+ Drag & Drop Image Upload: Intuitive interface for selecting multiple images for reconstruction. <br>
+ Interactive 3D Model Viewer: <br>
  + Load and display reconstructed 3D models (GLB format).
  + Zoom In/Out: Control model magnification.
  + Pan: Move the model across the viewport.
  + Fullscreen Mode: Expand the viewer for an immersive experience.
  + Material Switching: Change model rendering materials (Standard, Phong, Basic, Wireframe, Original).
  + Dynamic Wireframe: Wireframe adapts color for visibility in both light and dark themes.
+ Model Gallery:
  +  Display a list of previously reconstructed and saved 3D models with thumbnails.
  +  Rename Models: Update the name of saved models.
  +  Delete Models: Remove models from the gallery.
  +  Download Models: Download saved GLB models.
+ Theme Switching: Toggle between Light and Dark modes for the entire application interface.
+ Responsive Design: Optimized for viewing and interaction on various devices (desktop, tablet, mobile).
+ Slide-out Navigation Menu: Convenient access to external links and project information.
+ User Notifications: Provides feedback on operations (e.g., success, error, info messages).

## Technologies Used

+ Frontend:
  + HTML5
  + CSS3 (Custom CSS for layout, theming, and responsive design)
  + JavaScript (ES6+)
  + Three.js (r129) - For 3D rendering and model interaction.
  + OrbitControls - For camera controls.
  + GLTFLoader - For loading GLB/GLTF models.
  + Font Awesome - For icons.
+ Backend:
  + Flask server to implement endpoints:
    +  Image uploads (`/upload`)
    +  3D model reconstruction processing
    +  Saving and retrieving 3D models (`/save-model`, `/api/models`)


## Folder Structure

```
.
├── static/
│   ├── css/
│   │   ├── index.css
│   │   ├── model_container.css
│   │   ├── model_gallery.css
│   │   ├── model_preview_nav_bar.css
│   │   ├── notification.css
│   │   ├── slide_menu.css
│   │   ├── theme.css
│   │   ├── upload_area.css
│   │   └── uploaded_files_area.css
│   ├── js/
│   │   ├── index.js
│   │   ├── theme.js
│   │   ├── threejs.js
│   │   └── utils.js
│   └── icons/
│       └── icon.png
├── templates/
│   └── index.html
├── model/
│   ├── config.py
│   ├── decoder.py
│   ├── encoder.py
│   ├── merger.py
│   ├── refiner.py
│   └── model_architecture.py
├── lib/
│   ├── cube.py (Additional helper script)
│   ├── data_transforms.py
│   ├── glb_creater.py (Additional helper script)
│   ├── glb_opener.py (Additional helper script)
│   ├── helpers.py (Additional helper script)
│   ├── models.py
│   └── utils.py
├── logs/
│   └──  swinvox.log (log files)
├── main.py
└── requirements.txt
```


## Setup

To set up and run this project locally, you will need a web server environment and potentially a backend process for the 3D reconstruction and model management.

### 1. Make sure the latest version of Python is installed.

You can download and install latest Python from https://www.python.org/downloads/ if not already installed.

### 2. Install Flask (If not already installed)

The SwinVox app backend is implemented using Flask. Open a terminal and enter: <br>
`pip install Flask`

### 3. Clone the SwinVox web app repository: <br>
`git clone https://github.com/SandeepaInduwaraSamaranayake/SwinVox_Web_App.git`

### 4. Navigate to the project directory and install Dependencies in `requirements.txt`
`cd SwinVox_Web_App && pip install -r requirements.txt`

### 5. Run `main.py` 
`python main.py` 

## Usage

### 1. Start your web server:

  + Navigate to the project's root directory in your terminal (`cd SwinVox_Web_App`).
  + `python main.py`
  + :x: If the port 8080 is already in use, you can change the port from line 197 in `main.py`


### 2. Open the application:

  + Open your web browser and navigate to http://localhost:8080 (Use the port in line 197 of `main.py`).

### 3. Upload Images:

  + Drag and Drop: Drag image files directly into the "Drag and drop images here" area.
  + Choose Images Button: Click the " Choose Images" button to open a file selection dialog.
  + Selected images will appear in the "Uploaded files area." You can remove individual files using the "✖" button or clear all with the " Clear" button.

### 4. Submit for Reconstruction:

  + Once you've selected your images, click the " Submit" button.
  + A loading overlay will appear while the model is being reconstructed and saved to the backend.
  + Upon successful processing, the 3D model viewer will open.

### 5. Interact with the 3D Model Viewer:

  + Rotate: Click and drag the model.
  + Zoom: Use the mouse wheel or the / buttons.
  + Pan: Click the button to toggle pan mode, then click and drag.
  + Fullscreen: Click the button to enter/exit fullscreen.
  + Material: Use the dropdown menu to switch between Original Material (the model's default), Standard Material, Phong Material, Basic Material, and Wireframe.
  + Download: Click the button to download the currently viewed model.
  + Exit Viewer: Click the (back) button or the "×" (close) button.

### 6. Manage Saved Models:

  + The "Saved Models" section displays models you've previously uploaded.
  + Click on a model card to open it in the 3D viewer.
  + Click the "⋯" button on a model card to access options:
    + Rename: Change the model's display name.
    + Download: Download the model file.
    + Delete: Remove the model from the gallery.

### 7. Change Theme:

  + Click the (Light Mode) or (Dark Mode) icon in the header to switch the application's theme.

### 8. Access Navigation Menu:

  + Click the (hamburger) icon in the header to open the slide-out navigation menu.
  + This menu provides links to external resources like Three.js documentation, help & feedback, and the GitHub repository.
  + Click the "×" button or anywhere outside the menu to close it.

## Backend API Endpoints

+ Backend server provides the following API endpoints:
  + `POST /upload`:  Accepts image files (multipart/form-data), processes them for 3D reconstruction, and returns the reconstructed model (e.g., as a GLB Blob).
  + `GET /api/models`: Retrieves a list of all saved models.
  + `DELETE /api/models/{id}`: Deletes a specific model.
  + `POST /save-model`: Accepts the generated 3D model and its thumbnail, saves them to database, and returns model metadata (ID, filename).
  + `GET /api/models/{id}`: Retrieves a specific 3D model's binary data by ID.
  + `PUT /api/models/{id}`: Updates a model's information (e.g., filename).
  + `GET /api/models/{id}/info`: Retrieves metadata for a specific model by ID.

## Contributing

Contributions are welcome! If you have suggestions, bug reports, or want to contribute code, please feel free to:

1. Fork the repository.
2. Create a new branch (`git checkout -b feature/YourFeatureName`).
3. Make your changes.
4. Commit your changes (`git commit -m 'Add new feature'`).
5. Push to the branch (`git push origin feature/YourFeatureName`).
6. Open a Pull Request.

## Screenshots

### Landing Page

![1_L_D](https://github.com/user-attachments/assets/fc2b412d-c6f0-4227-9a76-d5e91e68ba0e)

![1_L_N](https://github.com/user-attachments/assets/3d4b1edb-b7f2-45ae-94b4-5dccf01fff6b)

### Image Upload Screen

![2_U_D](https://github.com/user-attachments/assets/97c69111-6551-4ecd-b8dc-9d7bf5fdd305)

![2_U_L](https://github.com/user-attachments/assets/58fe18e2-c57b-4733-91cc-1b02d6bd2d0d)

### Loading Overlay

![3_O_D](https://github.com/user-attachments/assets/5fb86e26-0713-4f46-b00a-d6875b34247f)

### 3D Voxel Viewer

![4_P_D](https://github.com/user-attachments/assets/74494a3e-faf4-4872-849d-95a7e4060b4e)

![4_P_L](https://github.com/user-attachments/assets/7c95906a-f78b-4159-b4c5-d5c3f94e2986)


# License

This project is licensed under the MIT License 



