from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from config import Config
from models import db
from routes.users import users_bp
from routes.emails import emails_bp
from routes.auth import auth_bp   # new

app = Flask(__name__)
app.config.from_object(Config)

# Initialize extensions
db.init_app(app)
CORS(app)
jwt = JWTManager(app)  # <-- this goes AFTER app = Flask(__name__)

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
