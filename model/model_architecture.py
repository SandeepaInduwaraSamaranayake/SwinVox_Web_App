# File: model_architecture.py
import logging
import torch
import lib.helpers as helpers
from datetime import datetime as dt
import torch.nn as nn
from model.encoder import Encoder
from model.decoder import Decoder
from model.merger import Merger
from model.refiner import Refiner

logger = logging.getLogger("root")

class SwinVoxModel(nn.Module):
    def __init__(self, cfg):
        super(SwinVoxModel, self).__init__()
        self.encoder = Encoder(cfg)
        self.decoder = Decoder(cfg)
        self.merger = Merger(cfg)
        self.refiner = Refiner(cfg)

    def forward(self, rendering_images):
        # Forward pass through the model components
        logger.debug('[DEBUG] %s Parameters in Encoder: %d.' % (dt.now(), helpers.count_parameters(self.encoder)))
        logger.debug('[DEBUG] %s Parameters in Decoder: %d.' % (dt.now(), helpers.count_parameters(self.decoder)))
        logger.debug('[DEBUG] %s Parameters in Merger: %d.' % (dt.now(), helpers.count_parameters(self.merger)))
        logger.debug('[DEBUG] %s Parameters in Refiner: %d.' % (dt.now(), helpers.count_parameters(self.refiner)))

        with torch.no_grad():
            encoded_features = self.encoder(rendering_images)
            raw_features, decoded_volumes = self.decoder(encoded_features)
            generated_volume = self.merger(raw_features, decoded_volumes)
            generated_volume = self.refiner(generated_volume)
        # helpers.get_volume_views(generated_volume, "sample_test_images")
        return generated_volume