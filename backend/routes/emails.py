# backend/routes/emails.py - Updated with extension support

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from backend.models import db, Email, Quarantine, User, EmailStatus, ThreatLevel
from backend.ml_service.detection_service import classify_emails
from datetime import datetime
import logging

emails_bp = Blueprint('emails', __name__, url_prefix='/api/v1')
logger = logging.getLogger(__name__)

@emails_bp.route('/classify', methods=['POST'])
@jwt_required()
def classify():
    """
    Endpoint for classifying emails - used by both frontend and extension
    """
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        # Support both single email and batch
        if isinstance(data, list):
            emails_data = data
        elif 'emails' in data:
            emails_data = data['emails']
        else:
            # Single email
            emails_data = [data]
        
        # Add user_id to each email
        for email_data in emails_data:
            email_data['user_id'] = user_id
        
        # Classify using the detection service
        result = classify_emails({'emails': emails_data, 'user_id': user_id})
        
        return jsonify({
            'success': True,
            'count': result.get('count', len(result.get('results', []))),
            'results': result.get('results', []),
            'statistics': result.get('statistics', {})
        }), 200
        
    except Exception as e:
        logger.error(f"Classification error: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@emails_bp.route('/analyze', methods=['POST'])
def analyze_email():
    """
    Public endpoint for browser extension (with API key auth)
    This allows extension to work without JWT
    """
    try:
        # Get API key from header
        api_key = request.headers.get('Authorization', '').replace('Bearer ', '')
        
        # For demo, accept any key or 'demo-key'
        # In production, validate against user's API key in database
        
        data = request.get_json()
        email_data = data.get('email', {})
        features = data.get('features', {})
        
        # Extract user_id from email_data or use demo
        user_id = email_data.get('user_id', 1)
        
        # Prepare email for classification
        email_to_classify = {
            'user_id': user_id,
            'from': email_data.get('sender', ''),
            'subject': email_data.get('subject', ''),
            'body': email_data.get('body', ''),
            'timestamp': email_data.get('timestamp', datetime.utcnow().isoformat()),
            'provider': email_data.get('provider', 'unknown')
        }
        
        # Classify the email
        result = classify_emails(email_to_classify)
        
        if result and 'results' in result and len(result['results']) > 0:
            classification = result['results'][0]
            
            return jsonify({
                'success': True,
                'prediction': classification.get('prediction', 'legit'),
                'is_phishing': classification.get('prediction') == 'phish',
                'confidence_score': classification.get('confidence_score', 0),
                'threat_level': classification.get('threat_level', 'LOW'),
                'threat_type': classification.get('threatType', 'phishing'),
                'model_version': classification.get('model_version', '1.0.0'),
                'urls_found': classification.get('urls_found', 0),
                'processing_time_ms': classification.get('processing_time_ms', 0),
                'quarantined': classification.get('quarantined', False)
            }), 200
        else:
            return jsonify({
                'success': False,
                'error': 'Classification failed'
            }), 500
            
    except Exception as e:
        logger.error(f"Analysis error: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@emails_bp.route('/report-false-positive', methods=['POST'])
def report_false_positive():
    """
    Endpoint for reporting false positives from extension
    """
    try:
        data = request.get_json()
        
        # Log the false positive for model retraining
        logger.info(f"False positive reported: {data.get('emailData', {}).get('subject', 'Unknown')}")
        
        # TODO: Store in TrainingEmail table for retraining
        
        return jsonify({
            'success': True,
            'message': 'False positive reported successfully'
        }), 200
        
    except Exception as e:
        logger.error(f"Error reporting false positive: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@emails_bp.route('/quarantine', methods=['GET'])
@jwt_required()
def get_quarantine():
    """Get quarantined emails for current user"""
    try:
        user_id = get_jwt_identity()
        
        # Get all quarantined emails for this user
        quarantined = Quarantine.query.filter_by(
            user_id=user_id,
            released=False
        ).order_by(Quarantine.quarantined_at.desc()).all()
        
        result = []
        for q in quarantined:
            result.append({
                'id': q.id,
                'sender': q.sender,
                'recipient': q.recipient,
                'subject': q.subject,
                'body': q.body[:200] if q.body else '',  # First 200 chars
                'reason': q.reason,
                'threat_level': q.threat_level,
                'confidence_score': q.confidence_score,
                'prediction': q.prediction,
                'quarantined_at': q.quarantined_at.isoformat() if q.quarantined_at else None,
                'expires_at': q.expires_at.isoformat() if q.expires_at else None
            })
        
        return jsonify(result), 200
        
    except Exception as e:
        logger.error(f"Error fetching quarantine: {str(e)}")
        return jsonify({
            'error': str(e)
        }), 500


@emails_bp.route('/quarantine/<int:quarantine_id>/release', methods=['POST'])
@jwt_required()
def release_quarantine(quarantine_id):
    """Release email from quarantine"""
    try:
        user_id = get_jwt_identity()
        
        quarantine = Quarantine.query.filter_by(
            id=quarantine_id,
            user_id=user_id
        ).first()
        
        if not quarantine:
            return jsonify({'error': 'Quarantine entry not found'}), 404
        
        quarantine.released = True
        quarantine.released_at = datetime.utcnow()
        quarantine.release_reason = 'User released'
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Email released from quarantine'
        }), 200
        
    except Exception as e:
        logger.error(f"Error releasing quarantine: {str(e)}")
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@emails_bp.route('/quarantine/<int:quarantine_id>', methods=['DELETE'])
@jwt_required()
def delete_quarantine(quarantine_id):
    """Permanently delete quarantined email"""
    try:
        user_id = get_jwt_identity()
        
        quarantine = Quarantine.query.filter_by(
            id=quarantine_id,
            user_id=user_id
        ).first()
        
        if not quarantine:
            return jsonify({'error': 'Quarantine entry not found'}), 404
        
        db.session.delete(quarantine)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Email permanently deleted'
        }), 200
        
    except Exception as e:
        logger.error(f"Error deleting quarantine: {str(e)}")
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@emails_bp.route('/emails', methods=['GET'])
@jwt_required()
def get_emails():
    """Get email history for current user"""
    try:
        user_id = get_jwt_identity()
        
        # Get query parameters
        limit = request.args.get('limit', 50, type=int)
        offset = request.args.get('offset', 0, type=int)
        
        # Query emails
        emails = Email.query.filter_by(user_id=user_id)\
            .order_by(Email.created_at.desc())\
            .limit(limit)\
            .offset(offset)\
            .all()
        
        result = []
        for email in emails:
            result.append({
                'id': email.id,
                'sender': email.sender,
                'subject': email.subject,
                'prediction': email.prediction,
                'confidence_score': email.confidence_score,
                'threat_level': email.threat_level,
                'status': email.status,
                'created_at': email.created_at.isoformat() if email.created_at else None,
                'processed_at': email.processed_at.isoformat() if email.processed_at else None
            })
        
        return jsonify({
            'emails': result,
            'total': Email.query.filter_by(user_id=user_id).count(),
            'limit': limit,
            'offset': offset
        }), 200
        
    except Exception as e:
        logger.error(f"Error fetching emails: {str(e)}")
        return jsonify({'error': str(e)}), 500


@emails_bp.route('/stats', methods=['GET'])
@jwt_required()
def get_stats():
    """Get statistics for current user's emails"""
    try:
        user_id = get_jwt_identity()
        
        # Get total counts
        total_emails = Email.query.filter_by(user_id=user_id).count()
        threats_detected = Email.query.filter_by(
            user_id=user_id,
            prediction='phish'
        ).count()
        quarantined = Quarantine.query.filter_by(
            user_id=user_id,
            released=False
        ).count()
        
        # Get provider-specific stats
        from sqlalchemy import func
        provider_stats = db.session.query(
            Email.extracted_features['provider'].astext.label('provider'),
            func.count(Email.id).label('count')
        ).filter_by(user_id=user_id)\
         .group_by('provider')\
         .all()
        
        providers = {}
        for provider, count in provider_stats:
            if provider:
                providers[provider] = count
        
        return jsonify({
            'total_scanned': total_emails,
            'threats_detected': threats_detected,
            'emails_quarantined': quarantined,
            'safe_emails': total_emails - threats_detected,
            'provider_stats': providers,
            'detection_rate': (threats_detected / total_emails * 100) if total_emails > 0 else 0
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting stats: {str(e)}")
        return jsonify({'error': str(e)}), 500