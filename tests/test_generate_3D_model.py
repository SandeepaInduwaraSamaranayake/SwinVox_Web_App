import unittest
from unittest.mock import patch, MagicMock
import torch
import os
from lib.utils import generate_3d_model

class TestGenerate3DModel(unittest.TestCase):

    def setUp(self):
        # Create a mock model and set it to return a dummy voxel output
        self.mock_model = MagicMock()
        self.mock_model.return_value = torch.rand(1, 32, 32, 32)  # Dummy voxel grid
        self.model_patch = patch('lib.utils.model', self.mock_model)
        self.model_patch.start()

        # Create a dummy input tensor
        self.dummy_input = torch.rand(1, 3, 224, 224)  # Batch size of 1, 3 channels, 224x224

    def tearDown(self):
        # Stop the patcher
        self.model_patch.stop()
        # Clean up the output file if it exists
        if os.path.exists("output/voxel_plot.png"):
            os.remove("output/voxel_plot.png")

    def test_generate_3d_model(self):
        # Test the generate_3d_model function
        result = generate_3d_model(self.dummy_input)

        # Check if the returned path is correct
        self.assertEqual(result["voxel_plot_path"], "output/voxel_plot.png")

        # Check if the voxel plot file was created
        self.assertTrue(os.path.exists("output/voxel_plot.png"))

    def test_voxel_output_shape(self):
        # Test if the voxel output shape is as expected
        generate_3d_model(self.dummy_input)
        # Check the shape of the output from the mock model
        self.mock_model.assert_called_once_with(self.dummy_input)
        voxel_output = self.mock_model.return_value
        self.assertEqual(voxel_output.shape, (1, 32, 32, 32))  # Check the shape of the voxel output

if __name__ == '__main__':
    unittest.main()