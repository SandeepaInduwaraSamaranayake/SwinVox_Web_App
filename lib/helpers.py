# -*- coding: utf-8 -*-
#
# Developed by Sandeepa Samaranayake <sandeepasamaranayake@outlook.com>

import numpy as np
import matplotlib.pyplot as plt
import os
import torch

def get_volume_views(volume, save_dir):

    if not os.path.exists(save_dir):
        os.makedirs(save_dir)

    volume = volume.squeeze().__ge__(0.5)
    # Create a figure for 3D plotting
    fig = plt.figure()
    # Standard way to create a 3D subplot in new versions of Matplotlib
    ax = fig.add_subplot(111, projection='3d')
    # Set the aspect ratio to be equal
    ax.set_box_aspect([1, 1, 1])
    # Plot the voxels with black edges
    ax.voxels(volume, edgecolor="k", linewidth=0.5)
    ax.view_init(elev=30, azim=45)                   # Adjusted view angles
    # Matplotlib's ax.voxels() behavior might auto-scale axes differently in 3.10.0 vs 3.9.0, leading to inconsistent views.
    ax.set_xlim(0, volume.shape[0])                  # Manual axis limits
    ax.set_ylim(0, volume.shape[1])
    ax.set_zlim(0, volume.shape[2])

    fig.canvas.draw()
    img = np.frombuffer(fig.canvas.tostring_argb(), dtype=np.uint8)
    img = img.reshape(fig.canvas.get_width_height()[::-1] + (4, ))

    # Transpose the image to be in [C, H, W] format, which is expected by TensorBoard. This ensures that the returned image is in [C, H, W] format, where C is the number of channels (e.g., 3 for RGB), and H and W are the height and width, respectively. This is the format expected by TensorBoard's add_image method.
    img = np.transpose(img, (2, 0, 1))  # Convert from (H, W, C) to (C, H, W)

    # Save Plot
    # Ensure the filename is unique by adding the sample index and epoch index
    save_path = os.path.join(save_dir, "test.png")
    plt.savefig(save_path, bbox_inches='tight')
    # Close the figure to free up resources
    plt.close(fig)


def count_parameters(model):
    return sum(p.numel() for p in model.parameters())


# The model is trained in a distributed setting using DataParallel, so the model's state dictionary contains
# the model components with the "module." prefix. We need to remove this prefix and save weight again to load the model on a CPU.
# Use  helpers.save_checkpoint_for_cpu for this.
def save_checkpoint_for_cpu(load_path = 'pre_trained_weights/Pix2Vox-A-ShapeNet.pth', save_path = 'pre_trained_weights/Pix2Vox-A-ShapeNet_cpu.pth'):
    ckpt = torch.load(load_path, map_location=torch.device("cpu"), weights_only = False)
    new_ckpt = {}
    for k1 in ['encoder_state_dict', 'decoder_state_dict', 'refiner_state_dict', 'merger_state_dict']:
        new_ckpt[k1] = {}
        for k2 in ckpt[k1].keys():
            new_ckpt[k1][k2.replace('module.', '')] = ckpt[k1][k2]

    torch.save(new_ckpt, save_path)
    print('Saved checkpoint for CPU')



def visualize_transformed_image(tensor, cfg):
    # Convert tensor to NumPy array
    image = tensor.squeeze(0).permute(1, 2, 0).numpy()  # Convert to HWC format
    image = (image * cfg.DATASET.STD) + cfg.DATASET.MEAN  # Reverse normalization
    image = np.clip(image, 0, 1)  # Clip values to [0, 1] range
    plt.imshow(image)
    plt.axis('off')
    plt.show()