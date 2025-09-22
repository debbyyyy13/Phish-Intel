from flask import Blueprint, request, jsonify
from models import db, Email, Quarantine
from ml_service.detection_service import classify_emails, release_from_quarantine

emails_bp = Blueprint("emails", __name__)

@emails_bp.route("/api/v1/classify", methods=["POST"])
def classify():
    payload = request.get_json()
    if not payload:
        return jsonify({"error": "invalid payload"}), 400
    results = classify_emails(payload)
    return jsonify(results)

@emails_bp.route("/api/v1/quarantine/<int:q_id>/release", methods=["POST"])
def release(q_id):
    result = release_from_quarantine(q_id)
    if not result:
        return jsonify({"error": "not found"}), 404
    return jsonify(result)
