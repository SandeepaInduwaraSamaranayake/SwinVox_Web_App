import unittest
import numpy as np
import torch
import cv2
import os
from PIL import Image
from io import BytesIO

# Import the classes to be tested
from lib.data_transforms import Compose, ToTensor, Normalize, CenterCrop, RandomBackground

class TestDataTransforms(unittest.TestCase):
    def setUp(self):
        # Create a sample RGB image (H x W x C)
        self.single_image = np.random.randint(0, 255, size=(100, 100, 3), dtype=np.uint8)
        self.multiple_images = [self.single_image, self.single_image]  # Batch of 2 images

    def test_compose_single_image(self):
        # Define a simple transformation pipeline
        transform = Compose([
            CenterCrop(img_size=(100, 100), crop_size=(80, 80)),
            Normalize(mean=[0.5, 0.5, 0.5], std=[0.5, 0.5, 0.5]),
            ToTensor()
        ])

        # Apply the transformation to a single image
        transformed_image = transform([self.single_image])  # Wrap in a list

        # Check the output type and shape
        self.assertIsInstance(transformed_image, torch.Tensor)
        self.assertEqual(transformed_image.shape, (1, 3, 100, 100))  # Batch size 1, 3 channels, 100x100

    def test_compose_multiple_images(self):
        # Define a simple transformation pipeline
        transform = Compose([
            CenterCrop(img_size=(100, 100), crop_size=(80, 80)),
            Normalize(mean=[0.5, 0.5, 0.5], std=[0.5, 0.5, 0.5]),
            ToTensor()
        ])

        # Apply the transformation to multiple images
        transformed_images = transform(self.multiple_images)

        # Check the output type and shape
        self.assertIsInstance(transformed_images, torch.Tensor)
        self.assertEqual(transformed_images.shape, (2, 3, 100, 100))  # Batch size 2, 3 channels, 100x100

    def test_to_tensor_single_image(self):
        # Create a ToTensor instance
        to_tensor = ToTensor()

        # Apply the transformation to a single image
        tensor_image = to_tensor(np.stack([self.single_image]))  # Wrap in a list and stack

        # Check the output type and shape
        self.assertIsInstance(tensor_image, torch.Tensor)
        self.assertEqual(tensor_image.shape, (1, 3, 100, 100))  # Batch size 1, 3 channels, 100x100


    def test_to_tensor_multiple_images(self):
        # Create a ToTensor instance
        to_tensor = ToTensor()

        # Apply the transformation to multiple images
        tensor_images = to_tensor(np.stack(self.multiple_images))

        # Check the output type and shape
        self.assertIsInstance(tensor_images, torch.Tensor)
        self.assertEqual(tensor_images.shape, (2, 3, 100, 100))  # Batch size 2, 3 channels, 100x100

    def test_normalize_single_image(self):
        # Create a Normalize instance
        normalize = Normalize(mean=[0.5, 0.5, 0.5], std=[0.5, 0.5, 0.5])

        # Apply the transformation to a single image
        normalized_image = normalize([self.single_image])  # Wrap in a list

        # Check the output type and shape
        self.assertIsInstance(normalized_image, np.ndarray)
        self.assertEqual(normalized_image.shape, (1, 100, 100, 3))  # Batch size 1, 100x100, 3 channels

        # Check the normalization formula
        scaled_image = self.single_image.astype(np.float32) / 255.0
        expected_image = (scaled_image - [0.5, 0.5, 0.5]) / [0.5, 0.5, 0.5]
        np.testing.assert_array_almost_equal(normalized_image[0], expected_image)

    def test_normalize_multiple_images(self):
        # Create a Normalize instance
        normalize = Normalize(mean=[0.5, 0.5, 0.5], std=[0.5, 0.5, 0.5])

        # Apply the transformation to multiple images
        normalized_images = normalize(self.multiple_images)

        # Check the output type and shape
        self.assertIsInstance(normalized_images, np.ndarray)
        self.assertEqual(normalized_images.shape, (2, 100, 100, 3))  # Batch size 2, 100x100, 3 channels

    def test_center_crop_single_image(self):
        # Create a CenterCrop instance
        center_crop = CenterCrop(img_size=(100, 100), crop_size=(80, 80))

        # Apply the transformation to a single image
        cropped_image = center_crop([self.single_image])  # Wrap in a list

        # Check the output type and shape
        self.assertIsInstance(cropped_image, np.ndarray)
        self.assertEqual(cropped_image.shape, (1, 100, 100, 3))  # Batch size 1, 100x100, 3 channels

    def test_center_crop_multiple_images(self):
        # Create a CenterCrop instance
        center_crop = CenterCrop(img_size=(100, 100), crop_size=(80, 80))

        # Apply the transformation to multiple images
        cropped_images = center_crop(self.multiple_images)

        # Check the output type and shape
        self.assertIsInstance(cropped_images, np.ndarray)
        self.assertEqual(cropped_images.shape, (2, 100, 100, 3))  # Batch size 2, 100x100, 3 channels

    def test_random_background_single_image(self):
        # Create a sample RGBA image (H x W x 4)
        sample_rgba_image = np.random.randint(0, 255, size=(100, 100, 4), dtype=np.uint8)

        # Create a RandomBackground instance
        random_background = RandomBackground(random_bg_color_range=[[0, 255], [0, 255], [0, 255]])

        # Apply the transformation to a single image
        processed_image = random_background([sample_rgba_image])  # Wrap in a list

        # Check the output type and shape
        self.assertIsInstance(processed_image, np.ndarray)
        self.assertEqual(processed_image.shape, (1, 100, 100, 3))  # Batch size 1, 100x100, 3 channels

    def test_random_background_multiple_images(self):
        # Create a sample RGBA image (H x W x 4)
        sample_rgba_image = np.random.randint(0, 255, size=(100, 100, 4), dtype=np.uint8)
        sample_rgba_images = [sample_rgba_image, sample_rgba_image]  # Batch of 2 images

        # Create a RandomBackground instance
        random_background = RandomBackground(random_bg_color_range=[[0, 255], [0, 255], [0, 255]])

        # Apply the transformation to multiple images
        processed_images = random_background(sample_rgba_images)

        # Check the output type and shape
        self.assertIsInstance(processed_images, np.ndarray)
        self.assertEqual(processed_images.shape, (2, 100, 100, 3))  # Batch size 2, 100x100, 3 channels

    def test_random_background_no_alpha_single_image(self):
        # Create a sample RGB image (H x W x 3)
        sample_rgb_image = np.random.randint(0, 255, size=(100, 100, 3), dtype=np.uint8)

        # Create a RandomBackground instance
        random_background = RandomBackground(random_bg_color_range=[[0, 255], [0, 255], [0, 255]])

        # Apply the transformation to a single image
        processed_image = random_background([sample_rgb_image])  # Wrap in a list

        # Check that the output is unchanged (no alpha channel)
        self.assertIsInstance(processed_image, np.ndarray)
        self.assertEqual(processed_image.shape, (1, 100, 100, 3))  # Batch size 1, 100x100, 3 channels

    def test_random_background_no_alpha_multiple_images(self):
        # Create a sample RGB image (H x W x 3)
        sample_rgb_image = np.random.randint(0, 255, size=(100, 100, 3), dtype=np.uint8)
        sample_rgb_images = [sample_rgb_image, sample_rgb_image]  # Batch of 2 images

        # Create a RandomBackground instance
        random_background = RandomBackground(random_bg_color_range=[[0, 255], [0, 255], [0, 255]])

        # Apply the transformation to multiple images
        processed_images = random_background(sample_rgb_images)

        # Check that the output is unchanged (no alpha channel)
        self.assertIsInstance(processed_images, np.ndarray)
        self.assertEqual(processed_images.shape, (2, 100, 100, 3))  # Batch size 2, 100x100, 3 channels

if __name__ == "__main__":
    unittest.main()