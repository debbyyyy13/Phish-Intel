import os, logging
from datetime import datetime
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_migrate import Migrate
from dotenv import load_dotenv
from apscheduler.schedulers.background import BackgroundScheduler

import joblib, xgboost as xgb, numpy as np

load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

MODEL_DIR = "ml_models"
MODEL_PATH_TEXT = os.path.join(MODEL_DIR,"xgb_model.pkl")
TFIDF_PATH = os.path.join(MODEL_DIR,"tfidf.pkl")
SCALER_PATH = os.path.join(MODEL_DIR,"scaler.pkl")

model_text, tfidf, scaler = None, None, None

def load_models():
    global model_text, tfidf, scaler
    try:
        model_text = joblib.load(MODEL_PATH_TEXT)
        tfidf = joblib.load(TFIDF_PATH)
        scaler = joblib.load(SCALER_PATH)
        logger.info("✅ Models loaded")
    except Exception as e:
        logger.warning(f"⚠️ Could not load models: {e}")

def retrain_from_db(app):
    with app.app_context():
        from backend.models import db, TrainingEmail
        from backend.ml_service.train_and_save import train_and_save
        try:
            train_and_save((db, TrainingEmail), model_dir="ml_models", from_db=True)
            load_models()
            logger.info("✅ Retrained from DB")
        except Exception as e:
            logger.warning(f"⚠️ Retraining skipped: {e}")

def schedule_retrain(app):
    scheduler = BackgroundScheduler()
    scheduler.add_job(lambda: retrain_from_db(app), "interval", weeks=1, id="weekly_retrain", replace_existing=True)
    scheduler.start()

def create_app():
    app = Flask(__name__)
    app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY","dev")
    app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get("DATABASE_URL","sqlite:///phishguard.db")
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["JWT_SECRET_KEY"] = os.environ.get("JWT_SECRET_KEY","jwt-secret")
    app.config["JWT_ACCESS_TOKEN_EXPIRES"] = 86400

    from backend.models import db
    db.init_app(app)
    Migrate(app, db)
    CORS(app, resources={r"/api/*": {"origins":"*"}}, supports_credentials=True)
    JWTManager(app)

    from backend.routes.auth import auth_bp
    from backend.routes.users import users_bp
    from backend.routes.emails import emails_bp
    app.register_blueprint(auth_bp)
    app.register_blueprint(users_bp)
    app.register_blueprint(emails_bp)

    @app.route("/api/v1/health")
    def health():
        return {"status":"ok","models_loaded": model_text is not None, "time": datetime.utcnow().isoformat()}

    # ✅ ADD DASHBOARD ROUTE (INSIDE create_app function)
    @app.route("/api/v1/dashboard", methods=['GET'])
    def dashboard():
        return jsonify({
            'total_reports': 150,
            'active_users': 25,
            'threats_detected': 45,
            'safe_emails': 105,
            'last_scan': datetime.utcnow().isoformat()
        }), 200

    # ✅ ADD QUARANTINE ROUTE (INSIDE create_app function)
    @app.route("/api/v1/quarantine", methods=['GET'])
    def get_quarantine():
        return jsonify([]), 200

    # ✅ This stays inside create_app
    with app.app_context():
        db.create_all()
        schedule_retrain(app)

    return app

app = create_app()

if __name__=="__main__":
    if not os.path.exists(MODEL_PATH_TEXT):
        # Initial training from CSV
        from backend.ml_service.train_and_save import train_and_save
        files = [
            r"C:/Users/debby/OneDrive/Desktop/final year project/datasets/Phishing_validation_emails.csv",
            r"C:/Users/debby/OneDrive/Desktop/final year project/datasets/SpamAssasin.csv",
            # add others...
        ]
        train_and_save(files, model_dir="ml_models")
    load_models()
    app.run(host="0.0.0.0", port=8000, debug=True)