from flask import Blueprint, request, jsonify
from backend.models import db, User

users_bp = Blueprint("users", __name__, url_prefix="/api/v1/users")

@users_bp.route("", methods=["POST"])
def create_user():
    data = request.get_json()
    email = data.get("email")
    if not email:
        return jsonify({"error": "Email is required"}), 400

    user = User(email=email)
    db.session.add(user)
    db.session.commit()
    return jsonify({"id": user.id, "email": user.email}), 201

@users_bp.route("", methods=["GET"])
def list_users():
    users = User.query.all()
    return jsonify([{"id": u.id, "email": u.email} for u in users])
