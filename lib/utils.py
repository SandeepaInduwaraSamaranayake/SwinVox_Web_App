import torch
from torchvision import transforms
from PIL import Image
import numpy as np
import matplotlib.pyplot as plt
from mpl_toolkits.mplot3d import Axes3D
from io import BytesIO
from model.model_architecture import SwinVoxModel

# Load the SwinVox model
def load_model():
    model = SwinVoxModel()
    # Load the checkpoint
    checkpoint = torch.load("model/Pix2Vox-F-ShapeNet.pth", map_location=torch.device("cpu"), weights_only=False)

    # Extract the encoder state dictionary
    if "encoder_state_dict" in checkpoint:
        model.load_state_dict(checkpoint["encoder_state_dict"], strict=False)
    else:
        raise RuntimeError("Checkpoint does not contain 'encoder_state_dict'.")
    
    model.eval()
    return model

model = load_model()

# Preprocess uploaded images
def process_images(images):
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
    
    return torch.cat(processed_images, dim=0)  # Combine into a batch

# Generate 3D model and save voxel plot
def generate_3d_model(images_tensor):
    with torch.no_grad():
        voxel_output = model(images_tensor)  # Model generates 3D voxel grid
    voxel_plot_path = "output/voxel_plot.png"
    save_voxel_plot(voxel_output[0].cpu().numpy(), voxel_plot_path)  # Save first voxel plot
    return {"voxel_plot_path": voxel_plot_path}

# Save voxel grid as a 3D plot
def save_voxel_plot(voxel_data, file_path):
    fig = plt.figure()
    ax = fig.add_subplot(111, projection="3d")
    ax.voxels(voxel_data > 0.5, edgecolor="k")  # Binary threshold
    plt.savefig(file_path)
    plt.close(fig)
