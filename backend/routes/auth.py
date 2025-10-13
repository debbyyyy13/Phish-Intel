from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from backend.models import db, User

auth_bp = Blueprint("auth", __name__, url_prefix="/api/v1/auth")

@auth_bp.route("/signup", methods=["POST"])
def signup():
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"error": "No data provided"}), 400

        # Extract fields - simple version without strip/lower
        name = data.get("name")
        email = data.get("email")
        password = data.get("password")
        confirm_password = data.get("confirm_password")

        # Validation
        if not name or not email or not password:
            return jsonify({"error": "Name, email, and password are required"}), 400

        if password != confirm_password:
            return jsonify({"error": "Passwords do not match"}), 400

        # Clean email (only if it's a string)
        if isinstance(email, str):
            email = email.strip().lower()
        
        # Check if user already exists
        existing_user = User.query.filter_by(email=email).first()
        if existing_user:
            return jsonify({"error": "Email already registered"}), 400

        # Create new user
        user = User(name=name, email=email)
        user.set_password(password)

        db.session.add(user)
        db.session.commit()

        # ✅ FIX: Convert user_id to string for JWT subject claim
        access_token = create_access_token(identity=str(user.id))

        return jsonify({
            "access_token": access_token,
            "user": {
                "id": user.id,
                "name": user.name,
                "email": user.email,
                "role": user.role,
                "is_verified": user.is_verified
            }
        }), 201
        
    except Exception as e:
        db.session.rollback()
        print(f"❌ Signup error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": "Signup failed", "details": str(e)}), 500


@auth_bp.route("/login", methods=["POST"])
def login():
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        email = data.get("email")
        password = data.get("password")

        if not email or not password:
            return jsonify({"error": "Email and password are required"}), 400
        
        # Clean email
        if isinstance(email, str):
            email = email.strip().lower()

        # Find user
        user = User.query.filter_by(email=email).first()
        
        if not user:
            print(f"❌ User not found: {email}")
            return jsonify({"error": "Invalid credentials"}), 401
        
        # Check password
        if not user.check_password(password):
            print(f"❌ Invalid password for user: {email}")
            return jsonify({"error": "Invalid credentials"}), 401

        # ✅ FIX: Convert user_id to string for JWT subject claim
        access_token = create_access_token(identity=str(user.id))

        print(f"✅ Login successful for: {email}")
        
        return jsonify({
            "access_token": access_token,
            "user": {
                "id": user.id,
                "email": user.email,
                "name": user.name,
                "role": user.role,
            }
        }), 200
        
    except Exception as e:
        print(f"❌ Login error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": "Login failed", "details": str(e)}), 500


@auth_bp.route("/me", methods=["GET"])
@jwt_required()
def me():
    try:
        # ✅ FIX: get_jwt_identity() now returns a string, convert to int for DB query
        user_id_str = get_jwt_identity()
        user_id = int(user_id_str)
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        return jsonify({
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "role": user.role,
            "is_verified": user.is_verified
        })
    except Exception as e:
        print(f"❌ /me error: {e}")
        return jsonify({"error": "Failed to get user info"}), 500