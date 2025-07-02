import unittest
import json
from flask import Flask
from main import app
from lib.utils import generate_3d_model

class FlaskAppTests(unittest.TestCase):

    def setUp(self):
        # Set up the Flask test client
        self.app = app.test_client()
        self.app.testing = True

    def test_root(self):
        # Test the root route
        response = self.app.get('/')
        self.assertEqual(response.status_code, 200)
        self.assertIn(b'SwinVox 3D Reconstruction', response.data)  # Check for a specific text in the response

    def test_upload_no_files(self):
        # Test uploading with no files
        response = self.app.post('/upload')
        self.assertEqual(response.status_code, 400)
        self.assertEqual(json.loads(response.data), {"error": "No images uploaded"})

    def test_upload_valid_image(self):
        # Test uploading a valid image
        with open('sample_test_images/pic_1.png', 'rb') as f:  # Make sure to have a valid image at this path
            response = self.app.post('/upload', data={'images[]': f})
            self.assertEqual(response.status_code, 200)
            data = json.loads(response.data)
            self.assertIn("voxel_plot_path", data)
            self.assertTrue(data["voxel_plot_path"].endswith("voxel_plot.png"))  # Check if the path is correct

    def test_generate_3d_model(self):
        # Mock the generate_3d_model function to avoid actual model inference
        with unittest.mock.patch('lib.utils.generate_3d_model') as mock_generate:
            mock_generate.return_value = {"voxel_plot_path": "output/voxel_plot.png"}
            with open('sample_test_images/pic_1.png', 'rb') as f:
                response = self.app.post('/upload', data={'images[]': f})
                self.assertEqual(response.status_code, 200)
                data = json.loads(response.data)
                self.assertEqual(data["voxel_plot_path"], "output/voxel_plot.png")

if __name__ == '__main__':
    unittest.main()