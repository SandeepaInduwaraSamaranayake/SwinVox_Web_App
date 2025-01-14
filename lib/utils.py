import torch
from torchvision import transforms
from PIL import Image
import numpy as np
import matplotlib.pyplot as plt
from mpl_toolkits.mplot3d import Axes3D
from io import BytesIO
from model.model_architecture import SwinVoxModel
from model.config import cfg
import logging
import base64
import pygltflib 



# Load the SwinVox model
def load_model(cfg):
    logging.info("--------------------------- *** swinvox model *** ---------------------------")
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
        logging.error("Checkpoint file not found. Please check the path.")
        raise
    except Exception as e:
        logging.error(f"An error occurred while loading the model: {str(e)}")
        raise

model = load_model(cfg)

# Preprocess uploaded images
def process_images(images):
    #logger.info("--------------------------- starting process images ---------------------------")
    processed_images = []
    transformation = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.5, 0.5, 0.5], std=[0.5, 0.5, 0.5])
    ])
    for image in images:
        try:
            pil_image = Image.open(BytesIO(image)).convert("RGB")
            tensor_image = transformation(pil_image).unsqueeze(0)  # Add batch dimension
            processed_images.append(tensor_image)
        except Exception as e:
            raise ValueError(f"Error processing image: {str(e)}")  # Raise a more informative error

    #logger.info("--------------------------- finishing process images ---------------------------")
    return torch.cat(processed_images, dim=0).unsqueeze(1)  # Combine into a batch

# # Generate 3D model and save voxel plot
# def generate_3d_model(images_tensor):
#     #logger.info("--------------------------- starting generate model ---------------------------")
#     with torch.no_grad():
#         voxel_output = model(images_tensor)  # Model generates 3D voxel grid

#     voxel_plot_path = "output/voxel_plot.png"
#     save_voxel_plot(voxel_output[0].cpu().numpy(), voxel_plot_path)  # Save first voxel plot
#     #logger.info("--------------------------- finishing generate model ---------------------------")

#     # Convert the saved image to base64
#     with open(voxel_plot_path, "rb") as image_file:
#         encoded_string = base64.b64encode(image_file.read()).decode('utf-8')

#     return {"voxel_plot_base64": encoded_string}


# # Save voxel grid as a 3D plot
# def save_voxel_plot(voxel_data, file_path):
#     fig = plt.figure()
#     ax = fig.add_subplot(111, projection="3d")
#     ax.voxels(voxel_data > 0.5, edgecolor="k")  # Binary threshold
#     plt.savefig(file_path)
#     plt.close(fig)


def generate_3d_model(images_tensor):
    with torch.no_grad():
        voxel_output = model(images_tensor)  # Model generates 3D voxel grid

    voxel_data = voxel_output[0].cpu().numpy()  # Get the first voxel output

    # Convert voxel data to GLTF format
    # gltf_path = "output/voxel_model.glb"  # Path to save the GLTF model
    # save_voxel_as_gltf(voxel_data, gltf_path)

    with open('output/model.glb', "rb") as glb_file:

        # Encode the binary data to Base64
        base64_encoded_data = base64.b64encode(glb_file.read())
        
        # Convert Base64 bytes to string
        base64_string = base64_encoded_data.decode('utf-8')

        

    return {"model_path": base64_string}




# def save_voxel_as_gltf(voxel_data, file_path):
#     # Create a simple GLTF file from voxel data
#     gltf = pygltflib.GLTF2()

#     # Add your voxel data to the GLTF object here
#     # This will require converting the voxel data to a format that GLTF understands

#     # Save the GLTF file
#     gltf.save(file_path)