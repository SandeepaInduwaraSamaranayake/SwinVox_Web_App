# File: model_architecture.py
import torch
import torch.nn as nn

class SwinVoxModel(nn.Module):
    def __init__(self):
        super(SwinVoxModel, self).__init__()
        # Define CNN layers
        self.cnn = nn.Sequential(
            nn.Conv2d(3, 16, kernel_size=3, padding=1),  # Output: (16, H, W)
            nn.ReLU(),
            nn.Conv2d(16, 32, kernel_size=3, padding=1),  # Output: (32, H, W)
            nn.ReLU()
        )

        # Placeholder for fc layer (initialized later)
        self.fc = None

    def forward(self, x):
        # Pass through CNN
        x = self.cnn(x)  # Shape: (batch_size, channels, height, width)

        # Flatten the output for the fully connected layer
        x = x.view(x.size(0), -1)  # Flatten: (batch_size, channels * height * width)

        # Initialize fc layer dynamically
        if self.fc is None:
            self.fc = nn.Linear(x.size(1), 1024).to(x.device)  # Input size matches flattened dimensions

        # Pass through fc layer
        x = self.fc(x)
        return x
