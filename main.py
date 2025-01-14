from flask import Flask, jsonify, request, render_template
from lib.utils import process_images, generate_3d_model
import torch
from logging.config import dictConfig
import base64
import io

# app.logger.debug("A debug message")
# app.logger.info("An info message")
# app.logger.warning("A warning message")
# app.logger.error("An error message")
# app.logger.critical("A critical message")


dictConfig(
    {
        "version": 1,
        "formatters": {
            "default": {
                "format": "[%(asctime)s] %(levelname)s in %(module)s: %(message)s",
            }
        },
        "handlers": {
            "console": {
                "class": "logging.StreamHandler",
                "stream": "ext://sys.stdout",
                "formatter": "default",
            },
            "file": {
                "class": "logging.handlers.RotatingFileHandler",
                "filename": "logs/swinvox.log",
                "maxBytes": 1024 * 1024 * 5,  # 5 MB
                "backupCount": 3,  # Keep up to 3 backup files
                "formatter": "default",
            },
        },
        "root": {"level": "DEBUG", "handlers": ["console", "file"]},
    }
)

app = Flask(__name__)

@app.route('/')
def root():
    app.logger.debug("-----------------------initializing app----------------------")
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
        processed_images = process_images(images)
        app.logger.info("Processed images shape: %s", processed_images.shape)

        # Generate 3D model
        model_output = generate_3d_model(processed_images)
        #model_output = generate_3d_model(torch.rand(1, 1, 3, 224, 224))

        app.logger.info("Model output: %s", model_output)


        # Check if the model output contains the base64 string
        if "model_path" in model_output:
            voxel_plot_base64 = model_output["model_path"]
            return jsonify({"model_path": voxel_plot_base64}), 200
        else:
            app.logger.error("Model output does not contain 'model_path'")
            return jsonify({"error": "Model generation failed"}), 500

    except Exception as e:
        app.logger.error("Error in upload_images: %s", str(e))  # Log the error
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=8080, debug=True)
