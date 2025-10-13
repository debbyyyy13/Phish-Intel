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


@emails_bp.route("/quarantine-test", methods=["GET"])
@jwt_required()
def get_quarantine_test():
    """Test endpoint without any validation"""
    try:
        user_id_str = get_jwt_identity()
        user_id = int(user_id_str)
        return jsonify({
            "status": "ok",
            "user_id": user_id,
            "message": "Test endpoint works"
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@emails_bp.route("/quarantine", methods=["GET"])
@jwt_required()
def get_quarantine():
    """Get all quarantined emails for the current user"""
    try:
        # ✅ FIX: Convert string user_id from JWT to integer
        user_id_str = get_jwt_identity()
        user_id = int(user_id_str)
        print(f"🔍 Fetching quarantine for user_id: {user_id}")
        
        # Get all quarantined emails for this user
        quarantined_emails = Quarantine.query.filter_by(
            user_id=user_id,
            released=False
        ).order_by(Quarantine.quarantined_at.desc()).all()
        
        print(f"✅ Found {len(quarantined_emails)} quarantined emails")
        
        # If no emails, return empty array
        if not quarantined_emails:
            return jsonify([]), 200
        
        # Convert to dict with safe string conversion
        result = []
        for email in quarantined_emails:
            try:
                email_dict = {
                    "id": email.id,
                    "sender": str(email.sender) if email.sender is not None else "Unknown",
                    "recipient": str(email.recipient) if email.recipient is not None else "Unknown",
                    "subject": str(email.subject) if email.subject is not None else "No subject",
                    "body": str(email.body[:200]) if email.body is not None else "",
                    "threat_level": str(email.threat_level) if email.threat_level is not None else "unknown",
                    "confidence_score": float(email.confidence_score) if email.confidence_score is not None else 0.0,
                    "reason": str(email.reason) if email.reason is not None else "Suspicious content",
                    "quarantined_at": email.quarantined_at.isoformat() if email.quarantined_at is not None else None,
                    "expires_at": email.expires_at.isoformat() if email.expires_at is not None else None
                }
                result.append(email_dict)
            except Exception as e:
                print(f"⚠️ Error serializing email {email.id}: {e}")
                import traceback
                traceback.print_exc()
                continue
        
        print(f"✅ Returning {len(result)} quarantined emails")
        return jsonify(result), 200
        
    except Exception as e:
        print(f"❌ Quarantine fetch error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": "Failed to fetch quarantine data", "details": str(e)}), 500


@emails_bp.route("/quarantine/<int:q_id>/release", methods=["POST"])
@jwt_required()
def release(q_id):
    """Release an email from quarantine"""
    try:
        # ✅ FIX: Convert string user_id from JWT to integer
        user_id_str = get_jwt_identity()
        user_id = int(user_id_str)
        
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