# cube

# import trimesh

# # Create a simple 3D cube mesh
# mesh = trimesh.creation.box(extents=(1, 1, 1))

# # Save it as a .glb file
# mesh.export('../output/sample_model.glb')

# print("GLB file created: sample_model.glb")

#------------------------------------------------------------------------------------------------------

# randon numpy array to .glb

# import numpy as np
# import trimesh

# # Create a sample voxel grid (binary numpy array)
# voxel_size = 32  # Example voxel grid size
# voxel_data = np.random.rand(voxel_size, voxel_size, voxel_size) > 0.5  # Random voxel structure

# # Convert the voxel grid into a mesh
# mesh = trimesh.voxel.ops.matrix_to_marching_cubes(voxel_data)

# # Export to GLB file
# mesh.export("output.glb")

# print("GLB file successfully created: output.glb")

#------------------------------------------------------------------------------------------------------

# import numpy as np
# import trimesh

# def voxel_to_mesh(voxel_grid, voxel_size=1.0):
#     # Create a list to store the meshes (each voxel will be a cube)
#     cubes = []
    
#     # Loop over the voxel grid to extract non-empty voxels (True values)
#     for z in range(voxel_grid.shape[0]):
#         for y in range(voxel_grid.shape[1]):
#             for x in range(voxel_grid.shape[2]):
#                 if voxel_grid[z, y, x]:  # If the voxel is "filled"
#                     # Create a cube mesh for each voxel
#                     cube = trimesh.primitives.Box(extents=[voxel_size, voxel_size, voxel_size])
#                     cube.apply_translation([x * voxel_size, y * voxel_size, z * voxel_size])
#                     cubes.append(cube)
    
#     # Combine all cubes into a single mesh
#     combined_mesh = trimesh.util.concatenate(cubes)
#     return combined_mesh

# # Create a sample voxel grid (binary numpy array)
# voxel_size = 32  # Example voxel grid size
# voxel_data = np.random.rand(voxel_size, voxel_size, voxel_size) > 0.5  # Random voxel structure

# # Convert voxel grid to a mesh
# mesh = voxel_to_mesh(voxel_data, voxel_size=1.0)

# # Export to GLB file
# mesh.export("voxel_grid.glb")

# print("GLB file successfully created: voxel_grid.glb")

#------------------------------------------------------------------------------------------------------


import trimesh
import numpy as np
from trimesh import creation

# Define the size of the large cube (e.g., 5x5x5)
grid_size = 5

# Create a 3D voxel grid (1 for occupied, 0 for empty)
# 1 means the voxel is filled, 0 means empty
voxel_grid = np.ones((grid_size, grid_size, grid_size))

# Initialize a list to hold the mesh objects for each filled voxel
voxels = []

# Define the size of each small voxel cube
voxel_size = 1.0

# Loop over each position in the voxel grid
for x in range(grid_size):
    for y in range(grid_size):
        for z in range(grid_size):
            if voxel_grid[x, y, z] == 1:  # Only add a cube if the voxel is occupied
                # Generate a cube at position (x, y, z)
                cube = creation.box(extents=(voxel_size, voxel_size, voxel_size))
                cube.apply_translation([x * voxel_size, y * voxel_size, z * voxel_size])  # Position the cube
                voxels.append(cube)

# Combine all cubes into a single mesh
final_mesh = trimesh.util.concatenate(voxels)

# Export the mesh to a .glb file
final_mesh.export('voxel_cube.glb')

print("GLB file 'voxel_cube.glb' created successfully.")

