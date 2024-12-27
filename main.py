from flask import Flask, jsonify, request, render_template
from lib.utils import process_images, generate_3d_model
import torch

app = Flask(__name__)

@app.route('/')
def root():
    app.logger.info("-----------------------initializing app----------------------")
    return render_template("index.html")

@app.route('/upload', methods=['POST'])
def upload_images():
    try:
        app.logger.info("------------------starting upload route----------------------")
        # Get uploaded files
        files = request.files.getlist("images[]")
        app.logger.info("Received files: %s", [file.filename for file in files])
        if not files:
            app.logger.info("------------------no files received----------------------")    
            return jsonify({"error": "No images uploaded"}), 400

        # Process uploaded images
        images = [file.read() for file in files]
        app.logger.info("------------------about to run preprocessing----------------------")
        processed_images = process_images(images)
        app.logger.info("Processed images shape: %s", processed_images.shape)

        app.logger.info("------------------Moving to generating stage----------------------")

        # Generate 3D model
        #model_output = generate_3d_model(processed_images)
        model_output = generate_3d_model(torch.rand(1, 3, 224, 224))

        app.logger.info("Model output: %s", model_output)

        # Save and return voxel plot path
        voxel_plot_path = model_output["voxel_plot_path"]
        return jsonify({"voxel_plot_path": voxel_plot_path}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=8080, debug=True)
