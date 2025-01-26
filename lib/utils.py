import torch
from torchvision import transforms
from PIL import Image
import numpy as np
from io import BytesIO
from model.model_architecture import SwinVoxModel
from model.config import cfg
import logging
import trimesh
import time

logger = logging.getLogger("root")

# Load the SwinVox model
def load_model(cfg):
    logger.info("Loading model...")
    model = SwinVoxModel(cfg)
    try:
        # Load the checkpoint
        checkpoint = torch.load("model/Pix2Vox-F-ShapeNet.pth", map_location=torch.device("cpu"), weights_only=False)

        # Load state dictionaries for each component
        if "encoder_state_dict" in checkpoint:
            model.encoder.load_state_dict(checkpoint["encoder_state_dict"], strict=False)
        else:
            raise RuntimeError("Checkpoint does not contain 'encoder_state_dict'.")

        if "decoder_state_dict" in checkpoint:
            model.decoder.load_state_dict(checkpoint["decoder_state_dict"], strict=False)
        else:
            raise RuntimeError("Checkpoint does not contain 'decoder_state_dict'.")

        if "merger_state_dict" in checkpoint:
            model.merger.load_state_dict(checkpoint["merger_state_dict"], strict=False)
        else:
            raise RuntimeError("Checkpoint does not contain 'merger_state_dict'.")

        model.eval()
        return model

    except FileNotFoundError:
        logger.error("Checkpoint file not found. Please check the path.")
        raise
    except Exception as e:
        logger.error(f"An error occurred while loading the model: {str(e)}")
        raise

model = load_model(cfg)

# Preprocess uploaded images
def process_images(images, imageHeight, imageWidth, mean=[0.5, 0.5, 0.5], std=[0.5, 0.5, 0.5]):
    logger.info("--------------------------- starting process images ---------------------------")
    # Ensure images is a list
    # If a single image is passed as bytes
    if isinstance(images, bytes):  
        # Convert to a list
        images = [images]  

    processed_images = []
    transformation = transforms.Compose([
        transforms.Resize((imageHeight, imageWidth)),
        transforms.ToTensor(),
        #transforms.Normalize(mean, std)
    ])

    for image in images:
        try:
            pil_image = Image.open(BytesIO(image)).convert("RGB")
            # Shape: [channels, height, width]
            tensor_image = transformation(pil_image)  
            processed_images.append(tensor_image)
        except IOError as e:
            logger.error(f"Error processing image: {str(e)}. The file may not be a valid image.")
            # Raise a more informative error
            raise ValueError(f"Error processing image: {str(e)}")  
        except Exception as e:
            logger.error(f"Unexpected error: {str(e)}")
            # Raise a more informative error
            raise ValueError(f"Unexpected error processing image: {str(e)}")  

    # logger.info("--------------------------- finishing process images ---------------------------")
    # Combine into a batch and add a dimension for views
    if processed_images:
        # Add a dimension for views
        # Shape: [n_views, channels, height, width] 
        images_tensor = torch.stack(processed_images, dim=0)

        # Add a dimension for batch size
        images_tensor = images_tensor.unsqueeze(0)  # Shape: [1, n_views, channels, height, width]

        # Normalize the tensor (Batch Normalization)
        # The shapes (1, 3, 1, 1) are used to ensure that the mean and standard deviation tensors can 
        # be broadcasted correctly when performing the normalization.

        # 1: This dimension represents the batch size. By using 1, you indicate that the mean and standard 
        # deviation values are the same for all images in the batch. This allows the mean and std to be 
        # applied across all images without needing to repeat the values for each image.

        # 3: This dimension corresponds to the number of channels in the image. For RGB images, there are 3 
        # channels (Red, Green, Blue). The mean and standard deviation values are typically provided for each 
        # channel separately, so this dimension is set to 3.

        # 1: The next two dimensions are set to 1 to allow for broadcasting. They represent the height and 
        # width of the image. By using 1 for these dimensions, you indicate that the mean and standard 
        # deviation values should be applied uniformly across the entire height and width of each image.

        images_tensor = (images_tensor - torch.tensor(mean).view(1, 3, 1, 1)) / torch.tensor(std).view(1, 3, 1, 1)
        logger.info(f"Processed images tensor: {images_tensor}")
        return images_tensor
    else:
        logger.error("No images were processed successfully.")
        raise ValueError("No images were processed successfully.")
    

def generate_3d_model(images_tensor):
    # The use of torch.nn.Sigmoid() in the final layer indicates that the output will be in the range of [0, 1]. 
    # This means that each voxel's output can be interpreted as the probability of that voxel being occupied.

    # The output of the Decoder is a tensor with shape [batch_size, 1, 32, 32, 32], which corresponds to a single 
    # channel (for occupancy) across a 3D grid of voxels. The values in this tensor will be continuous values 
    # between 0 and 1 due to the sigmoid activation.

    #  The model is trained to minimize the binary cross-entropy loss between the predicted voxel outputs and the 
    # ground truth volumes. This means that the model learns to output values that represent the likelihood (probability) 
    # of each voxel being occupied.

    with torch.no_grad():
        # Model generates 3D voxel grid
        voxel_output = model(images_tensor)  

    #logger.info(f"Voxel Data : {voxel_output}")

    # Convert probabilities to binary values
    # Apply threshold of 0.5 to get binary values
    binary_voxel_output = (voxel_output > 0.5).float() 

    logger.info(f"Binary Voxel Data : {binary_voxel_output}")

    # Convert the binary voxel output to a NumPy array
    voxel_array = binary_voxel_output[0].cpu().numpy()  # Get the first voxel output and convert to NumPy


    # Generate a unique output filename
    timestamp = int(time.time())

    # np.save(f"output/voxel_array{timestamp}.npy", voxel_array)

    #logger.info(f"voxel_array : {voxel_array}")

    # Convert voxel grid to a mesh
    mesh = voxel_to_mesh(voxel_array, voxel_size=1.0)

    # Export the mesh to a GLB file (in memory)
    glb_data = mesh.export(file_type='glb')
        
    # Convert GLB data to a byte stream for sending to the frontend
    return glb_data
    
def voxel_to_mesh(voxel_grid, voxel_size=1.0):
    # Create a list to store the meshes (each voxel will be a cube)
    cubes = []
    
    # Loop over the voxel grid to extract non-empty voxels (True values)
    for z in range(voxel_grid.shape[0]):
        for y in range(voxel_grid.shape[1]):
            for x in range(voxel_grid.shape[2]):
                if voxel_grid[z, y, x]:  # If the voxel is "filled"
                    # Create a cube mesh for each voxel
                    cube = trimesh.primitives.Box(extents=[voxel_size, voxel_size, voxel_size])
                    cube.apply_translation([x * voxel_size, y * voxel_size, z * voxel_size])
                    cubes.append(cube)
    
    # Combine all cubes into a single mesh
    combined_mesh = trimesh.util.concatenate(cubes)
    return combined_mesh


# def voxel_to_mesh(voxel_grid, voxel_size=1.0):
#     # Get the indices of the non-empty voxels (True values in the voxel grid)
#     filled_voxels = np.array(np.nonzero(voxel_grid))
    
#     # Create cubes for all filled voxels by applying their translations
#     cubes = []
#     for voxel in filled_voxels.T:  # Iterate over the voxel indices (x, y, z)
#         x, y, z = voxel
#         cube = trimesh.primitives.Box(extents=[voxel_size, voxel_size, voxel_size])
#         cube.apply_translation([x * voxel_size, y * voxel_size, z * voxel_size])
#         cubes.append(cube)
    
#     # Combine the meshes into a single mesh using trimesh's concatenate
#     combined_mesh = trimesh.util.concatenate(cubes)
#     return combined_mesh


