from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_migrate import Migrate

from backend.config import Config
from backend import db
from backend.routes.users import users_bp
from backend.routes.emails import emails_bp
from backend.routes.auth import auth_bp

app = Flask(__name__)
app.config.from_object(Config)
print("📌 Using database:", app.config["SQLALCHEMY_DATABASE_URI"])

# Initialize extensions
db.init_app(app)
migrate = Migrate(app, db)

# Restrict CORS only to your frontend
CORS(app, resources={r"/api/*": {"origins": "http://localhost:5173"}})

jwt = JWTManager(app)

# Register blueprints
app.register_blueprint(users_bp)
app.register_blueprint(emails_bp)
app.register_blueprint(auth_bp)

@app.route("/api/v1/health", methods=["GET"])
def health():
    return {"status": "ok"}, 200

if __name__ == "__main__":
    with app.app_context():
        db.create_all()
    app.run(host="0.0.0.0", port=8000, debug=True)
