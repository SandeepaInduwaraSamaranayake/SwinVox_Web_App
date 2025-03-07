import torch
from PIL import Image
import numpy as np
from io import BytesIO
from model.model_architecture import SwinVoxModel
from model.config import cfg
import logging
import trimesh
from lib.data_transforms import Compose, CenterCrop, RandomBackground, Normalize, ToTensor

logger = logging.getLogger("root")

# Load the SwinVox model
def load_model(cfg):
    logger.info("Loading model...")
    model = SwinVoxModel(cfg)

    try:
        # Load the checkpoint
        checkpoint = torch.load("pre_trained_weights/Pix2Vox-A-ShapeNet_cpu.pth", map_location=torch.device("cpu"), weights_only = False)

        # The model is trained in a distributed setting using DataParallel, so the model's state dictionary contains
        # the model components with the "module." prefix. We need to remove this prefix and save weight again to load the model on a CPU.
        # Use  helpers.save_checkpoint_for_cpu for this.
        # Load state dictionaries for each component
        if "encoder_state_dict" in checkpoint:
            model.encoder.load_state_dict(checkpoint["encoder_state_dict"])
        else:
            raise RuntimeError("Checkpoint does not contain 'encoder_state_dict'.")

        if "decoder_state_dict" in checkpoint:
            model.decoder.load_state_dict(checkpoint["decoder_state_dict"])
        else:
            raise RuntimeError("Checkpoint does not contain 'decoder_state_dict'.")
        
        if "refiner_state_dict" in checkpoint:
            model.refiner.load_state_dict(checkpoint["refiner_state_dict"])
        else:
            raise RuntimeError("Checkpoint does not contain 'refiner_state_dict'.")

        if "merger_state_dict" in checkpoint:
            model.merger.load_state_dict(checkpoint["merger_state_dict"])
        else:
            raise RuntimeError("Checkpoint does not contain 'merger_state_dict'.")

        model.encoder.eval()
        model.decoder.eval()
        model.merger.eval()
        model.refiner.eval()

        return model

    except Exception as e:
        raise RuntimeError(f"An error occurred while loading the model: {str(e)}")

# Preprocess uploaded images
def process_images(images, cfg):
    logger.info("--------------------------- starting process images ---------------------------")

    np_images = []

    # Set up data augmentation
    IMG_SIZE = cfg.CONST.IMG_H, cfg.CONST.IMG_W
    CROP_SIZE = cfg.CONST.CROP_IMG_H, cfg.CONST.CROP_IMG_W

        # Log configuration values
    logger.info(f"IMG_SIZE: {IMG_SIZE}")
    logger.info(f"CROP_SIZE: {CROP_SIZE}")
    logger.info(f"RANDOM_BG_COLOR_RANGE: {cfg.TEST.RANDOM_BG_COLOR_RANGE}")
    logger.info(f"MEAN: {cfg.DATASET.MEAN}")
    logger.info(f"STD: {cfg.DATASET.STD}")

    transformation = Compose([
        CenterCrop(IMG_SIZE, CROP_SIZE),
        RandomBackground(cfg.TEST.RANDOM_BG_COLOR_RANGE),
        Normalize(mean=cfg.DATASET.MEAN, std=cfg.DATASET.STD),
        ToTensor(),
    ])
    
    for image in images:
        try:
            pil_image = Image.open(BytesIO(image)).convert("RGB")
            np_image = np.array(pil_image)
            logger.info(f"Image shape: {np_image.shape}")
            np_images.append(np_image) 
        except Exception as e:
            raise ValueError(f"Error processing image:{str(e)}") 

    try:
        transformed_images  = transformation(np_images)  
        logger.info(f"length: {len(np_images)}")
        return transformed_images.unsqueeze(0)
    except Exception as e:
        raise ValueError(f"Error processing images:{str(e)}")
    

def generate_3d_model(images_tensor, model):
    # The use of torch.nn.Sigmoid() in the final layer indicates that the output will be in the range of [0, 1]. 
    # This means that each voxel's output can be interpreted as the probability of that voxel being occupied.

    # The output of the Decoder is a tensor with shape [batch_size, 1, 32, 32, 32], which corresponds to a single 
    # channel (for occupancy) across a 3D grid of voxels. The values in this tensor will be continuous values 
    # between 0 and 1 due to the sigmoid activation.

    #  The model is trained to minimize the binary cross-entropy loss between the predicted voxel outputs and the 
    # ground truth volumes. This means that the model learns to output values that represent the likelihood (probability) 
    # of each voxel being occupied.

    # Model generates 3D voxel grid
    voxel_output = model(images_tensor)  

    #logger.info(f"Voxel Data : {voxel_output}")

    # Convert probabilities to binary values
    # Apply threshold of 0.5 to get binary values
    binary_voxel_output = (voxel_output > 0.5).float() 

    logger.info(f"Binary Voxel Data : {binary_voxel_output}")

    # Convert the binary voxel output to a NumPy array
    voxel_array = binary_voxel_output[0].cpu().numpy()  # Get the first voxel output and convert to NumPy

    # np.save(f"output/voxel_array{timestamp}.npy", voxel_array)

    #logger.info(f"voxel_array : {voxel_array}")

    # Convert voxel grid to a mesh
    mesh = voxel_to_mesh(voxel_array, voxel_size=1.0)

    # Export the mesh to a GLB file (in memory)
    glb_data = mesh.export(file_type='glb')
        
    # Convert GLB data to a byte stream for sending to the frontend
    return glb_data
    
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


def voxel_to_mesh(voxel_grid, voxel_size=1.0):
    # Get the indices of the non-empty voxels (True values in the voxel grid)
    filled_voxels = np.array(np.nonzero(voxel_grid))
    
    # Create cubes for all filled voxels by applying their translations
    cubes = []
    for voxel in filled_voxels.T:  # Iterate over the voxel indices (x, y, z)
        x, y, z = voxel
        cube = trimesh.primitives.Box(extents=[voxel_size, voxel_size, voxel_size])
        cube.apply_translation([x * voxel_size, y * voxel_size, z * voxel_size])
        cubes.append(cube)
    
    # Combine the meshes into a single mesh using trimesh's concatenate
    combined_mesh = trimesh.util.concatenate(cubes)
    return combined_mesh


