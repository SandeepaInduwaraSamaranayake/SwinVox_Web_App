# File: model_architecture.py
import torch.nn as nn
from model.encoder import Encoder
from model.decoder import Decoder
from model.merger import Merger
from model.refiner import Refiner

class SwinVoxModel(nn.Module):
    def __init__(self, cfg):
        super(SwinVoxModel, self).__init__()
        self.encoder = Encoder(cfg)
        self.decoder = Decoder(cfg)
        self.merger = Merger(cfg)
        self.refiner = Refiner(cfg)

    def forward(self, rendering_images):
        # Forward pass through the model components
        encoded_features = self.encoder(rendering_images)
        raw_features, decoded_volumes = self.decoder(encoded_features)
        merged_volumes = self.merger(raw_features, decoded_volumes)
        refined_volumes = self.refiner(merged_volumes)
        return refined_volumes