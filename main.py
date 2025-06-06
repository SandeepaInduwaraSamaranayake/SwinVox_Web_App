import base64
from io import BytesIO
from flask import Flask, jsonify, request, render_template, send_file, Response
from lib.utils import process_images, generate_3d_model, load_model
from logging.config import dictConfig
from model.config import cfg
from lib.models import db, Model3D
from flask import jsonify, request

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

# Database configuration
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///models.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db.init_app(app)

with app.app_context():
    db.create_all()

# Load the model once at startup
model = None
model = load_model(cfg)

@app.route('/')
def root():
    try:
        app.logger.debug("-----------------------initializing app----------------------")
        return render_template("index.html")
    except Exception as e:
        app.logger.error("Error in app initialization: %s", str(e))
        return jsonify({"error": str(e)}), 500

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

# # get all models 
# @app.route('/api/models', methods=['GET'])
# def get_models():
#     try:
#         models = Model3D.query.all()
#         return jsonify([{
#             'id': model.id,
#             'filename': model.filename,
#             'created_at': model.created_at.isoformat()
#         } for model in models])
#     except Exception as e:
#         app.logger.error("Error fetching models: %s", str(e))
#         return jsonify({"error": str(e)}), 500




@app.route('/api/models', methods=['GET'])
def get_models():
    try:
        models = Model3D.query.all()
        return jsonify([{
            'id': model.id,
            'filename': model.filename,
            'thumbnail': base64.b64encode(model.thumbnail).decode('utf-8') if model.thumbnail else None,
            'created_at': model.created_at.isoformat()
        } for model in models])
    except Exception as e:
        app.logger.error("Error fetching models: %s", str(e))
        return jsonify({"error": str(e)}), 500





# get a specific model by id
@app.route('/api/models/<int:model_id>', methods=['DELETE'])
def delete_model(model_id):
    try:
        model = Model3D.query.get_or_404(model_id)
        db.session.delete(model)
        db.session.commit()
        return jsonify({'message': 'Model deleted'})
    except Exception as e:
        app.logger.error("Error deleting model: %s", str(e))
        return jsonify({"error": str(e)}), 500

# Save a model to the database
# @app.route('/save-model', methods=['POST'])
# def save_model():
#     try:
#         file = request.files['model']

#         new_model = Model3D(
#             filename=file.filename,
#             data=file.read(),
#         )
#         db.session.add(new_model)
#         db.session.commit()
#         return jsonify({'message': 'Model saved', 'id': new_model.id})
#     except Exception as e:
#         app.logger.error("Error saving models: %s", str(e))
#         return jsonify({"error": str(e)}), 500



@app.route('/save-model', methods=['POST'])
def save_model():
    try:
        file = request.files['model']
        thumbnail = request.files['thumbnail']

        new_model = Model3D(
            filename=file.filename,
            data=file.read(),
            thumbnail=thumbnail.read() if thumbnail else None
        )
        db.session.add(new_model);
        db.session.commit()
        return jsonify({'message': 'Model saved', 'id': new_model.id})
    except Exception as e:
        app.logger.error("Error saving model: %s", str(e))
        return jsonify({"error": str(e)}), 500



# Fetch individual model data.
@app.route('/api/models/<int:model_id>', methods=['GET'])
def get_model(model_id):
    try:
        model = Model3D.query.get_or_404(model_id)
        return Response(
            model.data,
            mimetype='model/gltf-binary',
            headers={
                'Content-Disposition': f'attachment; filename={model.filename}'
            }
        )
    except Exception as e:
        app.logger.error("Error fetching model: %s", str(e))
        return jsonify({"error": str(e)}), 500

        
if __name__ == "__main__":
    app.run(host="127.0.0.1", port=8080, debug=True)
