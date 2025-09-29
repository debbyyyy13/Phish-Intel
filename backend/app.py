import os
from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_migrate import Migrate
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def create_app():
    """Application factory pattern"""
    app = Flask(__name__)
    
    # Configuration
    app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production')
    app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'sqlite:///phishguard.db')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY', 'jwt-secret-key')
    app.config['JWT_ACCESS_TOKEN_EXPIRES'] = 86400  # 24 hours
    
    print("📌 Using database:", app.config["SQLALCHEMY_DATABASE_URI"])
    
    # Import db from models (not from backend)
    from backend.models import db
    db.init_app(app)
    
    # Initialize extensions
    migrate = Migrate(app, db)
    
    # CORS configuration
    CORS(app, resources={
        r"/api/*": {
            "origins": [
                "http://localhost:5173",
                "http://localhost:3000",
                "http://127.0.0.1:5173",
                "http://127.0.0.1:3000",
                "http://localhost:4173",
            ],
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization"],
            "supports_credentials": True
        }
    })
    
    # JWT
    jwt = JWTManager(app)
    
    # Import and register blueprints
    from backend.routes.auth import auth_bp
    from backend.routes.users import users_bp
    app.register_blueprint(auth_bp)
    app.register_blueprint(users_bp)
    print("✅ Auth and Users routes registered")
    
    try:
        from backend.routes.emails import emails_bp
        app.register_blueprint(emails_bp)
        print("✅ Email routes registered")
    except ImportError as e:
        print(f"⚠️ Email routes not available: {e}")
    
    # Health check route
    @app.route("/api/v1/health", methods=["GET"])
    def health():
        return {"status": "ok", "message": "PhishGuard API is running"}, 200
    
    @app.route("/", methods=["GET"])
    def root():
        return {"message": "PhishGuard API", "version": "1.0.0"}, 200
    
    # Error handlers
    @app.errorhandler(404)
    def not_found(error):
        return jsonify({"error": "Route not found"}), 404
    
    @app.errorhandler(500)
    def internal_error(error):
        return jsonify({"error": "Internal server error"}), 500
    
    # Create tables on first run
    with app.app_context():
        try:
            db.create_all()
            print("✅ Database tables created/verified")
        except Exception as e:
            print(f"⚠️ Database initialization error: {e}")
    
    return app

# Create the app
app = create_app()

if __name__ == "__main__":
    print("🚀 Starting PhishGuard Flask Server...")
    print("📍 Health check: http://localhost:8000/api/v1/health")
    
    app.run(
        host=os.environ.get('HOST', '0.0.0.0'),
        port=int(os.environ.get('PORT', 8000)),
        debug=True
    )