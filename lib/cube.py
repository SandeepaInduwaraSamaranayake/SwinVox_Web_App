import os
import numpy as np
import matplotlib.pyplot as plt
from mpl_toolkits.mplot3d.art3d import Poly3DCollection

# Define output folder
output_folder = "test"
os.makedirs(output_folder, exist_ok=True)

# Define cube vertices
vertices = np.array([
    [0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0],
    [0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]
])

# Define cube faces
faces = [[vertices[j] for j in [0, 1, 2, 3]],
         [vertices[j] for j in [4, 5, 6, 7]],
         [vertices[j] for j in [0, 1, 5, 4]],
         [vertices[j] for j in [2, 3, 7, 6]],
         [vertices[j] for j in [0, 3, 7, 4]],
         [vertices[j] for j in [1, 2, 6, 5]]]

# Generate and save 50 images
for i, angle in enumerate(np.linspace(0, 360, 50)):
    fig = plt.figure(figsize=(2.24, 2.24), dpi=100)  # Set figure size to 224x224 pixels
    ax = fig.add_subplot(111, projection='3d')
    ax.add_collection3d(Poly3DCollection(faces, facecolors='cyan', edgecolor='k', linewidths=1, alpha=1.0))  # Solid cube
    
    # Set limits
    ax.set_xlim([0, 1])
    ax.set_ylim([0, 1])
    ax.set_zlim([0, 1])
    
    # Rotate view
    ax.view_init(elev=20, azim=angle)
    
    # Save image
    plt.axis('off')  # Hide axis for cleaner images
    filename = os.path.join(output_folder, f'cube_{i:03d}.png')
    plt.savefig(filename, dpi=100, bbox_inches='tight')
    plt.close()

print("50 images of a rotating cube have been generated in the 'cube_images' folder with 224x224 resolution!")
