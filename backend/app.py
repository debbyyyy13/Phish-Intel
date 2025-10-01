import os
import logging
from datetime import datetime

from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_migrate import Migrate
from dotenv import load_dotenv

# ML / Detection imports
import xgboost as xgb
import numpy as np
import joblib

# Load env vars
load_dotenv()

# ----------------------------
# Globals
# ----------------------------
MODEL_DIR = "ml_models"   # << switched from models/ to ml_models/
MODEL_PATH_FEATURES = os.path.join(MODEL_DIR, "email_detector.json")
MODEL_PATH_TEXT = os.path.join(MODEL_DIR, "xgb_model.pkl")
TFIDF_PATH = os.path.join(MODEL_DIR, "tfidf.pkl")
SCALER_PATH = os.path.join(MODEL_DIR, "scaler.pkl")

model_features = None
model_text = None
tfidf = None
scaler = None

FEATURE_NAMES = [
    "has_suspicious_tld",
    "sender_domain_age",
    "has_display_name_mismatch",
    "subject_length",
    "body_length",
    "has_urgent_keywords",
    "has_financial_keywords",
    "num_links",
    "num_external_links",
    "has_shortened_urls",
    "has_suspicious_attachments",
    "html_to_text_ratio",
    "has_hidden_text",
    "num_images",
    "is_reply",
    "time_of_day",
    "has_spf_pass",
    "has_dkim_pass",
]

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ----------------------------
# Detection utils
# ----------------------------
def load_models():
    """Load both structured and text-based models"""
    global model_features, model_text, tfidf, scaler
    try:
        if os.path.exists(MODEL_PATH_FEATURES):
            model_features = xgb.Booster()
            model_features.load_model(MODEL_PATH_FEATURES)
            logger.info("✅ XGBoost feature-based model loaded")
        else:
            logger.warning("⚠️ Feature-based model not found")

        if os.path.exists(MODEL_PATH_TEXT):
            model_text = joblib.load(MODEL_PATH_TEXT)
            tfidf = joblib.load(TFIDF_PATH)
            scaler = joblib.load(SCALER_PATH)
            logger.info("✅ Text-based model + TF-IDF + scaler loaded")
        else:
            logger.warning("⚠️ Text-based pipeline not found")
    except Exception as e:
        logger.error(f"Error loading models: {e}")

def preprocess_features(features: dict):
    feature_vector = [features.get(name, 0) for name in FEATURE_NAMES]
    return np.array([feature_vector], dtype=np.float32)

def rule_based_detection(features: dict):
    score = 0
    max_score = 10
    if features.get("has_suspicious_attachments", 0) == 1:
        score += 3
    if features.get("has_display_name_mismatch", 0) == 1:
        score += 2
    if features.get("has_shortened_urls", 0) == 1:
        score += 2
    if features.get("has_urgent_keywords", 0) == 1 and features.get("has_financial_keywords", 0) == 1:
        score += 2
    if features.get("num_external_links", 0) > 5:
        score += 1
    if features.get("has_suspicious_tld", 0) == 1:
        score += 1
    if features.get("has_spf_pass", 0) == 0:
        score += 1
    if features.get("has_dkim_pass", 0) == 0:
        score += 1
    confidence = min(score / max_score, 1.0)
    prediction = 1 if score >= 4 else 0
    return prediction, confidence

def classify_threat_type(features, probability):
    if features.get("has_suspicious_attachments", 0) == 1:
        return "malware"
    elif features.get("has_display_name_mismatch", 0) == 1:
        return "phishing"
    elif features.get("has_financial_keywords", 0) == 1 and features.get("has_urgent_keywords", 0) == 1:
        return "financial fraud"
    elif features.get("has_shortened_urls", 0) == 1:
        return "link manipulation"
    elif features.get("num_external_links", 0) > 5:
        return "spam"
    else:
        return "suspicious activity"

# ----------------------------
# Flask Application Factory
# ----------------------------
def create_app():
    app = Flask(__name__)

    # Config
    app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", "dev-secret-key")
    app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get("DATABASE_URL", "sqlite:///phishguard.db")
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["JWT_SECRET_KEY"] = os.environ.get("JWT_SECRET_KEY", "jwt-secret-key")
    app.config["JWT_ACCESS_TOKEN_EXPIRES"] = 86400

    # Extensions
    from backend.models import db
    db.init_app(app)
    Migrate(app, db)
    CORS(app, resources={r"/api/*": {"origins": "*"}}, supports_credentials=True)
    JWTManager(app)

    # Blueprints
    try:
        from backend.routes.auth import auth_bp
        from backend.routes.users import users_bp
        from backend.routes.emails import emails_bp
        app.register_blueprint(auth_bp)
        app.register_blueprint(users_bp)
        app.register_blueprint(emails_bp)
    except ImportError as e:
        logger.warning(f"Some routes missing: {e}")

    # ----------------------------
    # API Endpoints
    # ----------------------------
    @app.route("/api/v1/health", methods=["GET"])
    def health():
        return {
            "status": "ok",
            "message": "PhishGuard API running",
            "feature_model_loaded": model_features is not None,
            "text_model_loaded": model_text is not None,
            "timestamp": datetime.utcnow().isoformat(),
        }, 200

    @app.route("/api/v1/analyze", methods=["POST"])
    def analyze_email():
        data = request.get_json()
        if not data:
            return jsonify({"error": "No input"}), 400

        try:
            # --- structured features mode ---
            if "features" in data:
                features = data["features"]
                if model_features:
                    arr = preprocess_features(features)
                    dmatrix = xgb.DMatrix(arr, feature_names=FEATURE_NAMES)
                    probability = float(model_features.predict(dmatrix)[0])
                    prediction = 1 if probability > 0.5 else 0
                else:
                    prediction, probability = rule_based_detection(features)

                threat_type = classify_threat_type(features, probability) if prediction == 1 else None
                return jsonify({
                    "mode": "structured",
                    "isThreat": bool(prediction),
                    "confidence": probability,
                    "threatType": threat_type,
                    "timestamp": datetime.utcnow().isoformat(),
                })

            # --- raw email text mode ---
            elif "email_body" in data:
                email_text = data["email_body"]
                if not model_text or not tfidf or not scaler:
                    return jsonify({"error": "Text-based model not available"}), 500

                X = tfidf.transform([email_text])
                X_scaled = scaler.transform(X).astype(np.float32)
                prediction = model_text.predict(X_scaled)[0]
                probability = model_text.predict_proba(X_scaled)[0][1]

                return jsonify({
                    "mode": "text",
                    "isThreat": bool(prediction),
                    "confidence": float(probability),
                    "timestamp": datetime.utcnow().isoformat(),
                })

            else:
                return jsonify({"error": "Provide either 'features' or 'email_body'"}), 400

        except Exception as e:
            logger.error(f"Error analyzing: {e}")
            return jsonify({"error": str(e)}), 500

    return app

# ----------------------------
# Run the app
# ----------------------------
app = create_app()

if __name__ == "__main__":
    load_models()
    port = int(os.environ.get("PORT", 8000))
    logger.info(f"🚀 Starting PhishGuard on port {port}")
    app.run(host="0.0.0.0", port=port, debug=True)
