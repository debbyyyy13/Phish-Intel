from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from backend.models import db, Email, Quarantine

emails_bp = Blueprint("emails", __name__, url_prefix="/api/v1")

@emails_bp.route("/classify", methods=["POST"])
@jwt_required()
def classify():
    """Classify an email for phishing"""
    try:
        payload = request.get_json()
        if not payload:
            return jsonify({"error": "invalid payload"}), 400
        
        # Here you would call your ML service
        # results = classify_emails(payload)
        
        # Mock response for now
        return jsonify({
            "prediction": "safe",
            "confidence_score": 0.95,
            "threat_level": "low"
        })
    except Exception as e:
        print(f"Classify error: {e}")
        return jsonify({"error": str(e)}), 500


@emails_bp.route("/quarantine", methods=["GET"])
@jwt_required()
def get_quarantine():
    """Get all quarantined emails for the current user"""
    try:
        user_id = get_jwt_identity()
        
        # Get all quarantined emails for this user
        quarantined_emails = Quarantine.query.filter_by(
            user_id=user_id,
            released=False
        ).order_by(Quarantine.quarantined_at.desc()).all()
        
        # Convert to dict
        result = []
        for email in quarantined_emails:
            result.append({
                "id": email.id,
                "sender": email.sender,
                "recipient": email.recipient,
                "subject": email.subject,
                "body": email.body[:200] if email.body else None,  # First 200 chars
                "threat_level": email.threat_level,
                "confidence_score": email.confidence_score,
                "reason": email.reason,
                "quarantined_at": email.quarantined_at.isoformat() if email.quarantined_at else None,
                "expires_at": email.expires_at.isoformat() if email.expires_at else None
            })
        
        print(f"✅ Found {len(result)} quarantined emails for user {user_id}")
        return jsonify(result), 200
        
    except Exception as e:
        print(f"❌ Quarantine fetch error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": "Failed to fetch quarantine data"}), 500


@emails_bp.route("/quarantine/<int:q_id>/release", methods=["POST"])
@jwt_required()
def release(q_id):
    """Release an email from quarantine"""
    try:
        user_id = get_jwt_identity()
        
        # Find the quarantined email
        email = Quarantine.query.filter_by(id=q_id, user_id=user_id).first()
        
        if not email:
            return jsonify({"error": "Email not found or access denied"}), 404
        
        # Mark as released
        email.released = True
        email.released_at = db.func.now()
        email.release_reason = "User released"
        
        db.session.commit()
        
        return jsonify({
            "message": "Email released from quarantine",
            "id": email.id
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Release error: {e}")
        return jsonify({"error": "Failed to release email"}), 500


@emails_bp.route("/quarantine/<int:q_id>", methods=["DELETE"])
@jwt_required()
def delete_quarantine(q_id):
    """Delete a quarantined email"""
    try:
        user_id = get_jwt_identity()
        
        # Find the quarantined email
        email = Quarantine.query.filter_by(id=q_id, user_id=user_id).first()
        
        if not email:
            return jsonify({"error": "Email not found or access denied"}), 404
        
        db.session.delete(email)
        db.session.commit()
        
        return jsonify({"message": "Email deleted from quarantine"}), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Delete error: {e}")
        return jsonify({"error": "Failed to delete email"}), 500