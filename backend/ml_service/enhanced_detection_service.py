"""
Enhanced Detection Service with Advanced Analytics and Performance Monitoring
"""

import os
import re
import joblib
import logging
import time
import hashlib
from datetime import datetime, timedelta
from typing import Dict, List, Tuple, Optional, Union
import numpy as np
from urllib.parse import urlparse
import requests
from collections import Counter

from config import Config
from models import db, Email, Quarantine, User, UserAnalytics, ThreatLevel, EmailStatus
from utils.url_analyzer import analyze_urls
from utils.feature_extractor import extract_advanced_features
from utils.cache import get_cached_result, cache_result

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class DetectionEngine:
    def __init__(self):
        self.model_dir = os.getenv("MODEL_DIR", Config.MODEL_DIR)
        self.batch_size = int(os.getenv("PRED_BATCH_SIZE", Config.PRED_BATCH_SIZE))
        
        # Lazy-loaded ML artifacts
        self._model = None
        self._tfidf = None
        self._scaler = None
        self._feature_names = None
        self._model_version = None
        
        # Threat thresholds
        self.threat_thresholds = {
            'low': 0.3,
            'medium': 0.6,
            'high': 0.8,
            'critical': 0.95
        }
        
    def load_artifacts(self):
        """Load ML model artifacts with error handling and versioning"""
        try:
            if self._model is None:
                model_path = os.path.join(self.model_dir, "xgb_model.pkl")
                self._model = joblib.load(model_path)
                logger.info(f"Loaded model from {model_path}")
                
                # Try to load model version info
                version_path = os.path.join(self.model_dir, "model_version.txt")
                if os.path.exists(version_path):
                    with open(version_path, 'r') as f:
                        self._model_version = f.read().strip()
                else:
                    self._model_version = "1.0.0"
                    
            if self._tfidf is None:
                tfidf_path = os.path.join(self.model_dir, "tfidf.pkl")
                self._tfidf = joblib.load(tfidf_path)
                logger.info(f"Loaded TF-IDF vectorizer from {tfidf_path}")
                
            if self._scaler is None:
                scaler_path = os.path.join(self.model_dir, "scaler.pkl")
                self._scaler = joblib.load(scaler_path)
                logger.info(f"Loaded scaler from {scaler_path}")
                
            if self._feature_names is None:
                # Try to load feature names for interpretability
                features_path = os.path.join(self.model_dir, "feature_names.pkl")
                if os.path.exists(features_path):
                    self._feature_names = joblib.load(features_path)
                    
        except Exception as e:
            logger.error(f"Error loading ML artifacts: {str(e)}")
            raise RuntimeError(f"Failed to load ML models: {str(e)}")
            
        return self._model, self._tfidf, self._scaler
    
    def _extract_urls(self, text: str) -> List[str]:
        """Extract URLs from email content"""
        url_pattern = r'http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\\(\\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+'
        urls = re.findall(url_pattern, text)
        return urls
    
    def _analyze_email_headers(self, headers: Dict) -> Dict:
        """Analyze email headers for suspicious patterns"""
        suspicious_indicators = []
        risk_score = 0.0
        
        if not headers:
            return {"indicators": [], "risk_score": 0.0}
            
        # Check for common spoofing indicators
        if 'Return-Path' in headers and 'From' in headers:
            return_path_domain = headers['Return-Path'].split('@')[-1] if '@' in headers['Return-Path'] else ''
            from_domain = headers['From'].split('@')[-1] if '@' in headers['From'] else ''
            
            if return_path_domain != from_domain and return_path_domain and from_domain:
                suspicious_indicators.append("Domain mismatch between Return-Path and From")
                risk_score += 0.3
        
        # Check for suspicious received headers
        if 'Received' in headers:
            received_count = len(headers['Received']) if isinstance(headers['Received'], list) else 1
            if received_count > 10:
                suspicious_indicators.append("Excessive Received headers")
                risk_score += 0.2
        
        # Check for missing SPF/DKIM
        spf_pass = any('spf=pass' in str(v).lower() for v in headers.values() if v)
        dkim_pass = any('dkim=pass' in str(v).lower() for v in headers.values() if v)
        
        if not spf_pass:
            suspicious_indicators.append("SPF check failed")
            risk_score += 0.1
            
        if not dkim_pass:
            suspicious_indicators.append("DKIM verification failed")
            risk_score += 0.1
            
        return {
            "indicators": suspicious_indicators,
            "risk_score": min(risk_score, 1.0)
        }
    
    def _determine_threat_level(self, confidence_score: float, header_analysis: Dict, url_analysis: Dict) -> ThreatLevel:
        """Determine threat level based on multiple factors"""
        total_risk = confidence_score
        
        # Add header analysis risk
        if header_analysis:
            total_risk += header_analysis.get('risk_score', 0) * 0.2
            
        # Add URL analysis risk
        if url_analysis:
            total_risk += url_analysis.get('risk_score', 0) * 0.3
            
        # Normalize to 0-1 range
        total_risk = min(total_risk, 1.0)
        
        if total_risk >= self.threat_thresholds['critical']:
            return ThreatLevel.CRITICAL
        elif total_risk >= self.threat_thresholds['high']:
            return ThreatLevel.HIGH
        elif total_risk >= self.threat_thresholds['medium']:
            return ThreatLevel.MEDIUM
        else:
            return ThreatLevel.LOW
    
    def _batch_predict(self, texts: List[str]) -> List[Tuple[int, float]]:
        """Predict on batch of texts with performance monitoring"""
        start_time = time.time()
        model, tfidf, scaler = self.load_artifacts()
        results = []
        
        if not texts:
            return results
            
        try:
            # Process in chunks
            for start_idx in range(0, len(texts), self.batch_size):
                chunk = texts[start_idx:start_idx + self.batch_size]
                
                # Vectorize
                X = tfidf.transform(chunk)
                
                # Scale
                X_scaled = scaler.transform(X)
                
                # Convert to dense for XGBoost
                if hasattr(X_scaled, "toarray"):
                    X_dense = X_scaled.toarray()
                else:
                    X_dense = X_scaled
                    
                # Predict
                if hasattr(model, "predict_proba"):
                    probabilities = model.predict_proba(X_dense)
                    predictions = model.predict(X_dense)
                    
                    for pred, prob in zip(predictions, probabilities):
                        confidence = float(prob[1]) if len(prob) > 1 else 0.0
                        results.append((int(pred), confidence))
                else:
                    predictions = model.predict(X_dense)
                    for pred in predictions:
                        results.append((int(pred), 0.0))
                        
        except Exception as e:
            logger.error(f"Error during batch prediction: {str(e)}")
            # Return safe defaults
            results = [(0, 0.0) for _ in texts]
            
        processing_time = (time.time() - start_time) * 1000
        logger.info(f"Processed {len(texts)} emails in {processing_time:.2f}ms")
        
        return results
    
    def classify_single_email(self, email_data: Dict, user_id: int) -> Dict:
        """Classify a single email with comprehensive analysis"""
        start_time = time.time()
        
        try:
            # Extract and sanitize email content
            sender = email_data.get('sender', '')[:255]
            recipient = email_data.get('recipient', '')[:255]
            subject = email_data.get('subject', '')[:500]
            body = email_data.get('body', '')
            headers = email_data.get('headers', {})
            
            # Generate content hash for caching
            content_hash = hashlib.md5(f"{sender}{subject}{body}".encode()).hexdigest()
            
            # Check cache first
            cached_result = get_cached_result(content_hash)
            if cached_result:
                logger.info("Using cached prediction result")
                return cached_result
            
            # Perform ML prediction
            predictions = self._batch_predict([body])
            if not predictions:
                raise ValueError("No prediction returned from model")
                
            label_int, confidence_score = predictions[0]
            prediction_label = "phish" if label_int == 1 else "legit"
            
            # Advanced analysis
            urls = self._extract_urls(body)
            url_analysis = analyze_urls(urls) if urls else {}
            header_analysis = self._analyze_email_headers(headers)
            
            # Extract advanced features for interpretability
            extracted_features = extract_advanced_features(body, subject, sender)
            
            # Determine threat level
            threat_level = self._determine_threat_level(
                confidence_score, header_analysis, url_analysis
            )
            
            processing_time_ms = int((time.time() - start_time) * 1000)
            
            # Create email record
            email_record = Email(
                user_id=user_id,
                sender=sender,
                recipient=recipient,
                subject=subject,
                body=body,
                headers=headers,
                prediction=prediction_label,
                confidence_score=confidence_score,
                threat_level=threat_level,
                status=EmailStatus.PROCESSED,
                extracted_features=extracted_features,
                model_version=self._model_version,
                processing_time_ms=processing_time_ms,
                urls_found=urls,
                processed_at=datetime.utcnow()
            )
            
            result = {
                'email_id': None,
                'quarantine_id': None,
                'prediction': prediction_label,
                'confidence_score': confidence_score,
                'threat_level': threat_level.value,
                'processing_time_ms': processing_time_ms,
                'urls_found': len(urls),
                'header_analysis': header_analysis,
                'url_analysis': url_analysis
            }
            
            # Quarantine logic with improved thresholds
            should_quarantine = (
                label_int == 1 and confidence_score > 0.5
            ) or threat_level in [ThreatLevel.HIGH, ThreatLevel.CRITICAL]
            
            if should_quarantine:
                # Create quarantine record
                quarantine_record = Quarantine(
                    user_id=user_id,
                    sender=sender,
                    recipient=recipient,
                    subject=subject,
                    body=body,
                    headers=headers,
                    reason=f"Detected as {prediction_label} with {confidence_score:.2f} confidence",
                    threat_indicators=header_analysis.get('indicators', []),
                    prediction=prediction_label,
                    confidence_score=confidence_score,
                    threat_level=threat_level,
                    expires_at=datetime.utcnow() + timedelta(days=30)
                )
                
                email_record.status = EmailStatus.QUARANTINED
                
                db.session.add(quarantine_record)
                db.session.add(email_record)
                db.session.commit()
                
                result['quarantine_id'] = quarantine_record.id
                result['email_id'] = email_record.id
                
            else:
                # Store as regular email
                db.session.add(email_record)
                db.session.commit()
                
                result['email_id'] = email_record.id
            
            # Update user analytics
            self._update_user_analytics(user_id, prediction_label, processing_time_ms)
            
            # Cache the result
            cache_result(content_hash, result, ttl=3600)
            
            logger.info(f"Email classified: {prediction_label} ({confidence_score:.3f}) in {processing_time_ms}ms")
            
            return result
            
        except Exception as e:
            logger.error(f"Error classifying email: {str(e)}")
            raise RuntimeError(f"Email classification failed: {str(e)}")
    
    def classify_batch_emails(self, emails_data: List[Dict], user_id: int) -> Dict:
        """Classify multiple emails efficiently"""
        start_time = time.time()
        results = []
        
        try:
            # Extract texts for batch prediction
            texts = []
            sanitized_emails = []
            
            for email_data in emails_data:
                sanitized = {
                    'sender': email_data.get('sender', '')[:255],
                    'recipient': email_data.get('recipient', '')[:255],
                    'subject': email_data.get('subject', '')[:500],
                    'body': email_data.get('body', ''),
                    'headers': email_data.get('headers', {})
                }
                texts.append(sanitized['body'])
                sanitized_emails.append(sanitized)
            
            # Batch prediction
            predictions = self._batch_predict(texts)
            
            # Process each email
            for email_data, (label_int, confidence_score) in zip(sanitized_emails, predictions):
                try:
                    # Individual email processing
                    single_result = self.classify_single_email({
                        **email_data,
                        '_skip_batch_predict': True,
                        '_prediction': (label_int, confidence_score)
                    }, user_id)
                    results.append(single_result)
                    
                except Exception as e:
                    logger.error(f"Error processing email in batch: {str(e)}")
                    results.append({
                        'error': str(e),
                        'prediction': 'error',
                        'confidence_score': 0.0
                    })
            
            total_time_ms = int((time.time() - start_time) * 1000)
            
            return {
                'count': len(results),
                'results': results,
                'total_processing_time_ms': total_time_ms,
                'avg_processing_time_ms': total_time_ms / len(results) if results else 0
            }
            
        except Exception as e:
            logger.error(f"Error in batch classification: {str(e)}")
            raise RuntimeError(f"Batch classification failed: {str(e)}")
    
    def _update_user_analytics(self, user_id: int, prediction: str, processing_time_ms: int):
        """Update user analytics with new email processing data"""
        try:
            today = datetime.utcnow().date()
            
            analytics = UserAnalytics.query.filter_by(
                user_id=user_id, 
                date=today
            ).first()
            
            if not analytics:
                analytics = UserAnalytics(
                    user_id=user_id,
                    date=today,
                    emails_processed=0,
                    emails_quarantined=0,
                    phishing_detected=0,
                    avg_processing_time_ms=0.0
                )
                db.session.add(analytics)
            
            # Update counters
            analytics.emails_processed += 1
            
            if prediction == 'phish':
                analytics.phishing_detected += 1
                analytics.emails_quarantined += 1
            
            # Update rolling average processing time
            if analytics.avg_processing_time_ms:
                analytics.avg_processing_time_ms = (
                    (analytics.avg_processing_time_ms * (analytics.emails_processed - 1) + processing_time_ms)
                    / analytics.emails_processed
                )
            else:
                analytics.avg_processing_time_ms = float(processing_time_ms)
            
            db.session.commit()
            
        except Exception as e:
            logger.error(f"Error updating user analytics: {str(e)}")
    
    def release_from_quarantine(self, quarantine_id: int, user_id: int = None) -> Optional[Dict]:
        """Release email from quarantine with audit trail"""
        try:
            query = Quarantine.query.filter_by(id=quarantine_id)
            if user_id:
                query = query.filter_by(user_id=user_id)
                
            quarantine_record = query.first()
            
            if not quarantine_record:
                return None
            
            if quarantine_record.released:
                return {
                    'status': 'already_released',
                    'message': 'Email was already released from quarantine'
                }
            
            # Create new email record
            released_email = Email(
                user_id=quarantine_record.user_id,
                sender=quarantine_record.sender,
                recipient=quarantine_record.recipient,
                subject=quarantine_record.subject,
                body=quarantine_record.body,
                headers=quarantine_record.headers,
                prediction='released',  # Mark as manually released
                confidence_score=quarantine_record.confidence_score,
                threat_level=ThreatLevel.LOW,  # Reduced threat level after manual review
                status=EmailStatus.RELEASED,
                model_version=self._model_version,
                processed_at=datetime.utcnow()
            )
            
            # Update quarantine record
            quarantine_record.released = True
            quarantine_record.released_at = datetime.utcnow()
            
            db.session.add(released_email)
            db.session.commit()
            
            logger.info(f"Released email {quarantine_id} from quarantine")
            
            return {
                'status': 'released',
                'email_id': released_email.id,
                'quarantine_id': quarantine_id,
                'released_at': quarantine_record.released_at.isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error releasing from quarantine: {str(e)}")
            db.session.rollback()
            raise RuntimeError(f"Failed to release from quarantine: {str(e)}")
    
    def get_detection_stats(self, user_id: int = None, days: int = 7) -> Dict:
        """Get detection statistics for dashboard"""
        try:
            start_date = datetime.utcnow() - timedelta(days=days)
            
            base_query = db.session.query(Email)
            if user_id:
                base_query = base_query.filter_by(user_id=user_id)
            
            base_query = base_query.filter(Email.created_at >= start_date)
            
            total_emails = base_query.count()
            phishing_emails = base_query.filter_by(prediction='phish').count()
            quarantined_emails = base_query.filter(Email.status == EmailStatus.QUARANTINED).count()
            
            # Calculate detection rate
            detection_rate = (phishing_emails / total_emails * 100) if total_emails > 0 else 0
            
            # Get average processing time
            avg_processing_time = db.session.query(
                db.func.avg(Email.processing_time_ms)
            ).filter(
                Email.created_at >= start_date
            )
            
            if user_id:
                avg_processing_time = avg_processing_time.filter_by(user_id=user_id)
            
            avg_time_result = avg_processing_time.scalar() or 0
            
            return {
                'total_emails_processed': total_emails,
                'phishing_detected': phishing_emails,
                'emails_quarantined': quarantined_emails,
                'detection_rate_percentage': round(detection_rate, 2),
                'avg_processing_time_ms': round(avg_time_result, 2),
                'period_days': days
            }
            
        except Exception as e:
            logger.error(f"Error getting detection stats: {str(e)}")
            return {
                'total_emails_processed': 0,
                'phishing_detected': 0,
                'emails_quarantined': 0,
                'detection_rate_percentage': 0.0,
                'avg_processing_time_ms': 0.0,
                'period_days': days
            }

# Global detection engine instance
detection_engine = DetectionEngine()

# Public API functions for backward compatibility
def classify_emails(payload: Union[Dict, List[Dict]]) -> Dict:
    """Main classification function"""
    if not payload:
        raise ValueError("payload is required")
    
    # Extract user_id from payload
    user_id = payload.get('user_id') if isinstance(payload, dict) else None
    if not user_id:
        raise ValueError("user_id is required")
    
    # Handle single email vs batch
    if isinstance(payload, dict) and 'emails' in payload:
        return detection_engine.classify_batch_emails(payload['emails'], user_id)
    else:
        result = detection_engine.classify_single_email(payload, user_id)
        return {'count': 1, 'results': [result]}

def release_from_quarantine(quarantine_id: int, user_id: int = None) -> Optional[Dict]:
    """Release email from quarantine"""
    return detection_engine.release_from_quarantine(quarantine_id, user_id)