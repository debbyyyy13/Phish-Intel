from flask import Blueprint, request, jsonify
from models import db, User

users_bp = Blueprint("users", __name__)

@users_bp.route("/api/v1/users", methods=["POST"])
def create_user():
    data = request.get_json()
    email = data.get("email")
    if not email:
        return jsonify({"error": "email required"}), 400

    user = User(email=email)
    db.session.add(user)
    db.session.commit()
    return jsonify({"id": user.id, "email": user.email}), 201

@users_bp.route("/api/v1/users", methods=["GET"])
def list_users():
    users = User.query.all()
    return jsonify([{"id": u.id, "email": u.email} for u in users])
