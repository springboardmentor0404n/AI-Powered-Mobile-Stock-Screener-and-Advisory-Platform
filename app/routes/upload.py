from flask import Blueprint, request, jsonify
from flask_cors import cross_origin
import pandas as pd
import os

from app.embeddings.embedder import generate_embeddings
from app.embeddings.vector_db import store_embeddings

upload_bp = Blueprint("upload_bp", __name__)

@upload_bp.route("/upload-csv", methods=["POST", "OPTIONS"])
@cross_origin(
    origins="http://localhost:5173",
    supports_credentials=True,
    allow_headers=["Content-Type", "Authorization"]
)
def upload_csv():
    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400

    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "Empty filename"}), 400

    upload_dir = "app/data/uploads"
    os.makedirs(upload_dir, exist_ok=True)

    df = pd.read_csv(file)
    df.to_csv(os.path.join(upload_dir, file.filename), index=False)

    records = df.to_dict(orient="records")
    embeddings = generate_embeddings(records)
    store_embeddings(embeddings, records)

    return jsonify({
        "message": "CSV uploaded successfully",
        "rows": len(df)
    })
