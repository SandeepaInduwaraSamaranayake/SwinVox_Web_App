import unittest
import torch
from PIL import Image
from io import BytesIO
from lib.utils import process_images
import os

class TestProcessImages(unittest.TestCase):

    def setUp(self):
        # Create a valid image for testing
        self.valid_image = Image.new('RGB', (224, 224), color='red')  # Create a red square image
        self.valid_image_bytes = BytesIO()
        self.valid_image.save(self.valid_image_bytes, format='PNG')
        self.valid_image_bytes.seek(0)  # Reset the BytesIO object to the beginning

        # Create an invalid image (corrupted)
        self.invalid_image_bytes = BytesIO(b'not an image')

        # Load a real image for testing
        self.real_image_path = 'sample_test_images/pic_1.png'  # Update this path to your real image
        if not os.path.exists(self.real_image_path):
            raise FileNotFoundError(f"Real image not found at {self.real_image_path}")

    def test_process_valid_image(self):
        # Test processing a valid image
        images = [self.valid_image_bytes.getvalue()]
        processed_images = process_images(images)
        
        # Check if the output is a tensor and has the expected shape
        self.assertIsInstance(processed_images, torch.Tensor)
        self.assertEqual(processed_images.shape, (1, 3, 224, 224))  # (batch_size, channels, height, width)

    def test_process_invalid_image(self):
        # Test processing an invalid image
        images = [self.invalid_image_bytes.getvalue()]
        with self.assertRaises(ValueError) as context:
            process_images(images)
        
        # Check if the error message is as expected
        self.assertIn("Error processing image", str(context.exception))

    def test_process_real_image(self):
        # Test processing a real image
        with open(self.real_image_path, 'rb') as f:
            real_image_bytes = f.read()
        
        images = [real_image_bytes]
        processed_images = process_images(images)

        # Check if the output is a tensor and has the expected shape
        self.assertIsInstance(processed_images, torch.Tensor)
        self.assertEqual(processed_images.shape, (1, 3, 224, 224))  # (batch_size, channels, height, width)

if __name__ == '__main__':
    unittest.main()