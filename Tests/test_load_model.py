import unittest
from unittest.mock import patch, MagicMock
import torch
from model.model_architecture import SwinVoxModel
from lib.utils import load_model 
from collections import OrderedDict
from model.config import cfg

def create_mock_checkpoint(original_checkpoint_path):
    # Load the original checkpoint
    original_checkpoint = torch.load(original_checkpoint_path, map_location=torch.device("cpu"), weights_only=False)

    # Initialize an empty mock checkpoint using OrderedDict
    mock_checkpoint = OrderedDict()

    # Iterate over the keys in the original checkpoint
    for key, value in original_checkpoint.items():
        if key in ['epoch_idx', 'best_iou', 'best_epoch']:
            # Maintain the original values for specific keys
            mock_checkpoint[key] = value
        elif 'state_dict' in key:  # Check if the key is a state dictionary
            # Create a new state dictionary for the mock checkpoint
            mock_state_dict = OrderedDict()
            for param_key, param_value in value.items():
                # Check the data type of the original parameter
                if param_value.dtype == torch.float32 or param_value.dtype == torch.float64:
                    # Create a random tensor with the same shape as the original parameter
                    mock_state_dict[param_key] = torch.rand_like(param_value)
                elif param_value.dtype == torch.int64 or param_value.dtype == torch.int32:
                    # Create a random integer tensor with the same shape as the original parameter
                    mock_state_dict[param_key] = torch.randint(0, 100, param_value.shape, dtype=param_value.dtype)
                else:
                    # Handle other data types if necessary
                    raise ValueError(f"Unsupported tensor type: {param_value.dtype}")

            mock_checkpoint[key] = mock_state_dict
        else:
            # Copy other keys directly (if any)
            mock_checkpoint[key] = original_checkpoint[key]
    return mock_checkpoint



class TestLoadModel(unittest.TestCase):

    @patch('torch.load')
    def test_load_model_success(self, mock_load):
        # Use the create_mock_checkpoint function to generate a mock checkpoint
        original_checkpoint_path = "model/Pix2Vox-F-ShapeNet.pth"

        mock_checkpoint = create_mock_checkpoint(original_checkpoint_path)
        mock_load.return_value = mock_checkpoint

        # Create a mock configuration object
        cfg = MagicMock()

        # Call the load_model function
        model = load_model(cfg)

        # Check if the model is an instance of SwinVoxModel
        self.assertIsInstance(model, SwinVoxModel)

        # Check if the state_dict was loaded correctly
        self.assertTrue(hasattr(model.encoder, 'state_dict'))
        self.assertTrue(hasattr(model.decoder, 'state_dict'))
        self.assertTrue(hasattr(model.merger, 'state_dict'))

    @patch('torch.load')
    def test_load_model_missing_encoder(self, mock_load):
        # Mock the checkpoint to simulate a missing encoder state dict
        # Use the create_mock_checkpoint function to generate a mock checkpoint
        original_checkpoint_path = "model/Pix2Vox-F-ShapeNet.pth"

        mock_checkpoint = create_mock_checkpoint(original_checkpoint_path)

        # remove encoder
        mock_checkpoint.pop("encoder_state_dict")

        mock_load.return_value = mock_checkpoint

        # Create a mock configuration object
        cfg = MagicMock()

        # Check that loading the model raises a RuntimeError
        with self.assertRaises(RuntimeError) as context:
            load_model(cfg)
        
        self.assertEqual(str(context.exception), "Checkpoint does not contain 'encoder_state_dict'.")

    @patch('torch.load')
    def test_load_model_missing_decoder(self, mock_load):
        # Mock the checkpoint to simulate a missing decoder state dict
        mock_checkpoint = {
            "encoder_state_dict": {},
            "merger_state_dict": {}
        }
        mock_load.return_value = mock_checkpoint

        # Create a mock configuration object
        cfg = MagicMock()

        # Check that loading the model raises a RuntimeError
        with self.assertRaises(RuntimeError) as context:
            load_model(cfg)
        
        self.assertEqual(str(context.exception), "Checkpoint does not contain 'decoder_state_dict'.")

    @patch('torch.load')
    def test_load_model_file_not_found(self, mock_load):
        # Mock the torch.load to raise a FileNotFoundError
        mock_load.side_effect = FileNotFoundError("Checkpoint file not found.")

        # Create a mock configuration object
        cfg = MagicMock()

        # Check that loading the model raises a FileNotFoundError
        with self.assertRaises(FileNotFoundError):
            load_model(cfg)

if __name__ == '__main__':
    unittest.main()