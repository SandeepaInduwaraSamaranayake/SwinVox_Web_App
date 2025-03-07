from io import BytesIO
from flask import Flask, jsonify, request, render_template, send_file
from lib.utils import process_images, generate_3d_model, load_model
from logging.config import dictConfig
from model.config import cfg

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

# Load the model once at startup
model = None
model = load_model(cfg)

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
        processed_images = process_images(images, cfg)
        app.logger.info("Processed images shape: %s", processed_images.shape)

        # Generate 3D model
        model_output = generate_3d_model(processed_images, model)

        # Ensure model_output is in the correct format
        if not isinstance(model_output, bytes):
            app.logger.error("Model output is not in bytes format.")
            return jsonify({"error": "Model generation failed, output is not in bytes."}), 500

        # if len(model_output) == 0:
        #     app.logger.error("Model output is empty.")
        #     return jsonify({"error": "Model generation failed, output is empty."}), 500

        # app.logger.info("Model output is valid, length: %d bytes", len(model_output))

        # Send the GLB model as a response
        return send_file(BytesIO(model_output), mimetype='model/gltf-binary', as_attachment=False, download_name='model.glb')

    except Exception as e:
        app.logger.error("Error in upload_images: %s", str(e))
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=8080, debug=True)
