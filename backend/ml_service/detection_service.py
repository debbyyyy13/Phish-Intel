"""
Unified Email Detection Service
Comprehensive email phishing detection with advanced analytics, performance monitoring,
and quarantine management. Combines features from both detection services.
"""

import os
import re
import joblib
import logging
import time
import hashlib
from math import ceil
from datetime import datetime, timedelta
from typing import Dict, List, Tuple, Optional, Union, Any
import numpy as np
from urllib.parse import urlparse
import requests
from collections import Counter

from backend.config import Config
from backend.models import (
    db, Email, Quarantine, User, UserAnalytics, 
    ThreatLevel, EmailStatus
)

# Optional imports with fallback
try:
    from utils.url_analyzer import analyze_urls
except ImportError:
    def analyze_urls(urls): 
        return {"risk_score": 0.0, "suspicious_urls": []}

try:
    from utils.feature_extractor import extract_advanced_features
except ImportError:
    def extract_advanced_features(body, subject, sender):
        return {"word_count": len(body.split()), "has_urls": bool(re.search(r'http', body))}

try:
    from utils.cache import get_cached_result, cache_result
except ImportError:
    def get_cached_result(key): 
        return None
    def cache_result(key, value, ttl=3600): 
        pass

# Configuration
MODEL_DIR = os.getenv("MODEL_DIR", getattr(Config, 'MODEL_DIR', './models'))
PRED_BATCH_SIZE = int(os.getenv("PRED_BATCH_SIZE", getattr(Config, 'PRED_BATCH_SIZE', 100)))

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class UnifiedDetectionEngine:
    """
    Unified detection engine combining features from both services:
    - Basic ML classification with XGBoost
    - Advanced threat analysis with headers and URLs
    - Performance monitoring and caching
    - Comprehensive quarantine management
    - User analytics and dashboard statistics
    """
    
    def __init__(self):
        self.model_dir = MODEL_DIR
        self.batch_size = PRED_BATCH_SIZE
        
        # Lazy-loaded ML artifacts
        self._model = None
        self._tfidf = None
        self._scaler = None
        self._feature_names = None
        self._model_version = None
        self._artifacts_loaded = False
        
        # Threat assessment thresholds
        self.threat_thresholds = {
            'low': 0.3,
            'medium': 0.6,
            'high': 0.8,
            'critical': 0.95
        }
        
        # Performance tracking
        self._prediction_times = []
        self._error_count = 0
        
    def load_artifacts(self) -> Tuple[Any, Any, Any]:
        """Load ML model artifacts with comprehensive error handling"""
        if self._artifacts_loaded:
            return self._model, self._tfidf, self._scaler
            
        try:
            # Load XGBoost model
            if self._model is None:
                model_path = os.path.join(self.model_dir, "xgb_model.pkl")
                if not os.path.exists(model_path):
                    raise FileNotFoundError(f"Model file not found: {model_path}")
                    
                self._model = joblib.load(model_path)
                logger.info(f"Loaded XGBoost model from {model_path}")
                
                # Load model version if available
                version_path = os.path.join(self.model_dir, "model_version.txt")
                if os.path.exists(version_path):
                    with open(version_path, 'r') as f:
                        self._model_version = f.read().strip()
                else:
                    self._model_version = "1.0.0"
                    
            # Load TF-IDF vectorizer
            if self._tfidf is None:
                tfidf_path = os.path.join(self.model_dir, "tfidf.pkl")
                if not os.path.exists(tfidf_path):
                    raise FileNotFoundError(f"TF-IDF file not found: {tfidf_path}")
                    
                self._tfidf = joblib.load(tfidf_path)
                logger.info(f"Loaded TF-IDF vectorizer from {tfidf_path}")
                
            # Load scaler
            if self._scaler is None:
                scaler_path = os.path.join(self.model_dir, "scaler.pkl")
                if not os.path.exists(scaler_path):
                    raise FileNotFoundError(f"Scaler file not found: {scaler_path}")
                    
                self._scaler = joblib.load(scaler_path)
                logger.info(f"Loaded scaler from {scaler_path}")
                
            # Load feature names for interpretability (optional)
            features_path = os.path.join(self.model_dir, "feature_names.pkl")
            if os.path.exists(features_path):
                self._feature_names = joblib.load(features_path)
                logger.info("Loaded feature names for interpretability")
                
            self._artifacts_loaded = True
            logger.info(f"All ML artifacts loaded successfully (version: {self._model_version})")
            
        except Exception as e:
            logger.error(f"Failed to load ML artifacts: {str(e)}")
            self._error_count += 1
            raise RuntimeError(f"ML model initialization failed: {str(e)}")
            
        return self._model, self._tfidf, self._scaler
    
    def _sanitize_email(self, email_data: Dict) -> Dict:
        """Sanitize and validate email data"""
        if not isinstance(email_data, dict):
            email_data = {}
            
        return {
            "sender": str(email_data.get("sender", ""))[:255],
            "recipient": str(email_data.get("recipient", ""))[:255], 
            "subject": str(email_data.get("subject", ""))[:500],
            "body": str(email_data.get("body", "")),
            "user_id": email_data.get("user_id"),
            "headers": email_data.get("headers", {})
        }
    
    def _extract_urls(self, text: str) -> List[str]:
        """Extract URLs from email content using robust regex"""
        if not text:
            return []
            
        # Comprehensive URL pattern
        url_patterns = [
            r'http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\\(\\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+',
            r'www\.(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\\(\\),])+',
            r'[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}'
        ]
        
        urls = []
        for pattern in url_patterns:
            urls.extend(re.findall(pattern, text, re.IGNORECASE))
            
        # Remove duplicates while preserving order
        return list(dict.fromkeys(urls))
    
    def _analyze_email_headers(self, headers: Dict) -> Dict:
        """Comprehensive email header analysis for suspicious patterns"""
        suspicious_indicators = []
        risk_score = 0.0
        
        if not headers or not isinstance(headers, dict):
            return {"indicators": [], "risk_score": 0.0, "checks_performed": 0}
            
        checks_performed = 0
        
        try:
            # Domain spoofing check
            if 'Return-Path' in headers and 'From' in headers:
                checks_performed += 1
                return_path = str(headers['Return-Path']).lower()
                from_header = str(headers['From']).lower()
                
                return_domain = return_path.split('@')[-1] if '@' in return_path else ''
                from_domain = from_header.split('@')[-1] if '@' in from_header else ''
                
                if return_domain and from_domain and return_domain != from_domain:
                    suspicious_indicators.append("Domain mismatch between Return-Path and From")
                    risk_score += 0.3
            
            # Received headers analysis
            if 'Received' in headers:
                checks_performed += 1
                received_headers = headers['Received']
                received_count = len(received_headers) if isinstance(received_headers, list) else 1
                
                if received_count > 10:
                    suspicious_indicators.append("Excessive Received headers (possible forwarding chain)")
                    risk_score += 0.2
                elif received_count == 0:
                    suspicious_indicators.append("Missing Received headers")
                    risk_score += 0.1
            
            # SPF check
            checks_performed += 1
            spf_results = ['spf=pass', 'spf=fail', 'spf=neutral', 'spf=softfail']
            header_content = ' '.join(str(v).lower() for v in headers.values() if v)
            
            spf_pass = 'spf=pass' in header_content
            spf_fail = 'spf=fail' in header_content
            
            if spf_fail:
                suspicious_indicators.append("SPF check failed")
                risk_score += 0.2
            elif not spf_pass and any(spf in header_content for spf in spf_results):
                suspicious_indicators.append("SPF check inconclusive")
                risk_score += 0.1
            
            # DKIM check
            checks_performed += 1
            dkim_pass = 'dkim=pass' in header_content
            dkim_fail = 'dkim=fail' in header_content
            
            if dkim_fail:
                suspicious_indicators.append("DKIM verification failed")
                risk_score += 0.15
            elif not dkim_pass and 'dkim=' in header_content:
                suspicious_indicators.append("DKIM verification inconclusive")
                risk_score += 0.05
            
            # DMARC check
            checks_performed += 1
            dmarc_fail = 'dmarc=fail' in header_content
            if dmarc_fail:
                suspicious_indicators.append("DMARC policy violation")
                risk_score += 0.25
            
            # Suspicious Message-ID patterns
            if 'Message-ID' in headers:
                checks_performed += 1
                message_id = str(headers['Message-ID']).lower()
                
                # Check for obviously fake Message-IDs
                suspicious_patterns = ['localhost', '127.0.0.1', 'example.com', 'test.com']
                if any(pattern in message_id for pattern in suspicious_patterns):
                    suspicious_indicators.append("Suspicious Message-ID")
                    risk_score += 0.1
            
            # X-Originating-IP check
            if 'X-Originating-IP' in headers:
                checks_performed += 1
                orig_ip = str(headers['X-Originating-IP'])
                # Check for private/local IPs in X-Originating-IP (suspicious for external emails)
                if any(pattern in orig_ip for pattern in ['192.168.', '10.', '172.16.', '127.']):
                    suspicious_indicators.append("Private IP in X-Originating-IP")
                    risk_score += 0.1
                    
        except Exception as e:
            logger.warning(f"Error in header analysis: {str(e)}")
            
        return {
            "indicators": suspicious_indicators,
            "risk_score": min(risk_score, 1.0),
            "checks_performed": checks_performed
        }
    
    def _determine_threat_level(self, confidence_score: float, header_analysis: Dict, 
                              url_analysis: Dict, extracted_features: Dict) -> ThreatLevel:
        """Enhanced threat level determination using multiple signals"""
        # Base score from ML model
        total_risk = confidence_score
        
        # Add header analysis risk (20% weight)
        if header_analysis and header_analysis.get('risk_score', 0) > 0:
            total_risk += header_analysis['risk_score'] * 0.2
            
        # Add URL analysis risk (30% weight)
        if url_analysis and url_analysis.get('risk_score', 0) > 0:
            total_risk += url_analysis['risk_score'] * 0.3
            
        # Add feature-based risk (10% weight)
        if extracted_features:
            feature_risk = 0.0
            
            # High urgency words
            urgency_words = ['urgent', 'immediate', 'expires', 'act now', 'limited time']
            if any(word in extracted_features.get('subject_lower', '') for word in urgency_words):
                feature_risk += 0.2
                
            # Suspicious attachments
            if extracted_features.get('has_attachments') and extracted_features.get('suspicious_attachments', 0) > 0:
                feature_risk += 0.3
                
            total_risk += feature_risk * 0.1
        
        # Normalize to 0-1 range
        total_risk = min(total_risk, 1.0)
        
        # Determine threat level with enhanced logic
        if total_risk >= self.threat_thresholds['critical']:
            return ThreatLevel.CRITICAL
        elif total_risk >= self.threat_thresholds['high']:
            return ThreatLevel.HIGH
        elif total_risk >= self.threat_thresholds['medium']:
            return ThreatLevel.MEDIUM
        else:
            return ThreatLevel.LOW
    
    def _batch_predict(self, texts: List[str]) -> List[Tuple[int, float]]:
        """Optimized batch prediction with performance monitoring"""
        if not texts:
            return []
            
        start_time = time.time()
        results = []
        
        try:
            model, tfidf, scaler = self.load_artifacts()
            
            # Process in configurable chunks for memory efficiency
            for start_idx in range(0, len(texts), self.batch_size):
                chunk = texts[start_idx:start_idx + self.batch_size]
                
                # Vectorize text
                X = tfidf.transform(chunk)
                
                # Scale features (StandardScaler with_mean=False supports sparse matrices)
                X_scaled = scaler.transform(X)
                
                # Convert to dense array for XGBoost
                if hasattr(X_scaled, "toarray"):
                    X_dense = X_scaled.toarray()
                else:
                    X_dense = X_scaled
                    
                # Predict with probability
                if hasattr(model, "predict_proba"):
                    probabilities = model.predict_proba(X_dense)
                    predictions = model.predict(X_dense)
                    
                    for pred, prob in zip(predictions, probabilities):
                        confidence = float(prob[1]) if len(prob) > 1 else 0.0
                        results.append((int(pred), confidence))
                else:
                    # Fallback for models without predict_proba
                    predictions = model.predict(X_dense)
                    for pred in predictions:
                        results.append((int(pred), 0.0))
                        
        except Exception as e:
            logger.error(f"Error during batch prediction: {str(e)}")
            self._error_count += 1
            # Return safe defaults on error
            results = [(0, 0.0) for _ in texts]
            
        processing_time = (time.time() - start_time) * 1000
        self._prediction_times.append(processing_time)
        
        logger.info(f"Batch processed {len(texts)} emails in {processing_time:.2f}ms "
                   f"(avg: {processing_time/len(texts):.2f}ms per email)")
        
        return results
    
    def classify_single_email(self, email_data: Dict, **kwargs) -> Dict:
        """Classify single email with comprehensive analysis"""
        start_time = time.time()
        
        try:
            # Sanitize input
            sanitized = self._sanitize_email(email_data)
            user_id = sanitized.get('user_id')
            
            if not user_id:
                raise ValueError("user_id is required for email classification")
            
            # Generate content hash for caching
            content_key = f"{sanitized['sender']}{sanitized['subject']}{sanitized['body']}"
            content_hash = hashlib.md5(content_key.encode('utf-8')).hexdigest()
            
            # Check cache first
            cached_result = get_cached_result(content_hash)
            if cached_result and not kwargs.get('force_reprocess'):
                logger.info(f"Using cached result for email hash: {content_hash[:8]}...")
                return cached_result
            
            # Extract content for analysis
            sender = sanitized['sender']
            recipient = sanitized['recipient']
            subject = sanitized['subject']
            body = sanitized['body']
            headers = sanitized['headers']
            
            # Skip batch prediction if already provided (for batch processing efficiency)
            if '_prediction' in kwargs:
                label_int, confidence_score = kwargs['_prediction']
            else:
                # Perform ML prediction
                predictions = self._batch_predict([body])
                if not predictions:
                    raise RuntimeError("No prediction returned from ML model")
                label_int, confidence_score = predictions[0]
            
            prediction_label = "phish" if label_int == 1 else "legit"
            
            # Advanced content analysis
            urls = self._extract_urls(body + ' ' + subject)
            url_analysis = analyze_urls(urls) if urls else {"risk_score": 0.0, "suspicious_urls": []}
            header_analysis = self._analyze_email_headers(headers)
            extracted_features = extract_advanced_features(body, subject, sender)
            
            # Determine threat level
            threat_level = self._determine_threat_level(
                confidence_score, header_analysis, url_analysis, extracted_features
            )
            
            processing_time_ms = int((time.time() - start_time) * 1000)
            
            # Enhanced quarantine logic
            should_quarantine = self._should_quarantine(
                label_int, confidence_score, threat_level, url_analysis, header_analysis
            )
            
            # Create email record
            email_record = self._create_email_record(
                user_id, sender, recipient, subject, body, headers,
                prediction_label, confidence_score, threat_level,
                extracted_features, urls, processing_time_ms, should_quarantine
            )
            
            result = {
                'email_id': email_record.id,
                'prediction': prediction_label,
                'confidence_score': round(confidence_score, 4),
                'threat_level': threat_level.value if hasattr(threat_level, 'value') else str(threat_level),
                'processing_time_ms': processing_time_ms,
                'urls_found': len(urls),
                'header_analysis': header_analysis,
                'url_analysis': url_analysis,
                'model_version': self._model_version,
                'quarantined': should_quarantine
            }
            
            # Handle quarantine
            if should_quarantine:
                quarantine_record = self._create_quarantine_record(
                    user_id, sender, recipient, subject, body, headers,
                    prediction_label, confidence_score, threat_level,
                    header_analysis, url_analysis
                )
                result['quarantine_id'] = quarantine_record.id
                
                # Update email record status
                email_record.status = EmailStatus.QUARANTINED
                db.session.commit()
            
            # Update user analytics
            self._update_user_analytics(user_id, prediction_label, processing_time_ms, should_quarantine)
            
            # Cache result
            cache_result(content_hash, result, ttl=3600)
            
            logger.info(f"Email classified: {prediction_label} ({confidence_score:.3f}) "
                       f"threat_level={threat_level} in {processing_time_ms}ms")
            
            return result
            
        except Exception as e:
            logger.error(f"Error classifying single email: {str(e)}")
            self._error_count += 1
            raise RuntimeError(f"Email classification failed: {str(e)}")
    
    def _should_quarantine(self, label_int: int, confidence_score: float, 
                          threat_level: Any, url_analysis: Dict, header_analysis: Dict) -> bool:
        """Enhanced quarantine decision logic"""
        # Primary ML-based quarantine
        if label_int == 1 and confidence_score > 0.5:
            return True
            
        # Threat level-based quarantine
        if hasattr(threat_level, 'value'):
            threat_val = threat_level.value
        else:
            threat_val = str(threat_level)
            
        if threat_val in ['HIGH', 'CRITICAL']:
            return True
            
        # URL-based quarantine
        if url_analysis.get('risk_score', 0) > 0.7:
            return True
            
        # Header-based quarantine
        if header_analysis.get('risk_score', 0) > 0.6:
            return True
            
        return False
    
    def _create_email_record(self, user_id: int, sender: str, recipient: str, 
                           subject: str, body: str, headers: Dict,
                           prediction: str, confidence: float, threat_level: Any,
                           features: Dict, urls: List[str], processing_time: int,
                           quarantined: bool) -> Email:
        """Create comprehensive email record"""
        status = EmailStatus.QUARANTINED if quarantined else EmailStatus.PROCESSED
        
        email_record = Email(
            user_id=user_id,
            sender=sender,
            recipient=recipient,
            subject=subject,
            body=body,
            headers=headers,
            prediction=prediction,
            confidence_score=confidence,
            threat_level=threat_level,
            status=status,
            extracted_features=features,
            model_version=self._model_version,
            processing_time_ms=processing_time,
            urls_found=urls,
            processed_at=datetime.utcnow(),
            created_at=datetime.utcnow()
        )
        
        db.session.add(email_record)
        db.session.commit()
        
        return email_record
    
    def _create_quarantine_record(self, user_id: int, sender: str, recipient: str,
                                subject: str, body: str, headers: Dict,
                                prediction: str, confidence: float, threat_level: Any,
                                header_analysis: Dict, url_analysis: Dict) -> Quarantine:
        """Create comprehensive quarantine record"""
        # Build reason string
        reasons = [f"Detected as {prediction} with {confidence:.2f} confidence"]
        
        if header_analysis.get('indicators'):
            reasons.extend(header_analysis['indicators'])
            
        if url_analysis.get('suspicious_urls'):
            reasons.append(f"Contains {len(url_analysis['suspicious_urls'])} suspicious URLs")
        
        quarantine_record = Quarantine(
            user_id=user_id,
            sender=sender,
            recipient=recipient,
            subject=subject,
            body=body,
            headers=headers,
            reason="; ".join(reasons),
            threat_indicators=header_analysis.get('indicators', []),
            prediction=prediction,
            confidence_score=confidence,
            threat_level=threat_level,
            quarantined_at=datetime.utcnow(),
            expires_at=datetime.utcnow() + timedelta(days=30),
            released=False
        )
        
        db.session.add(quarantine_record)
        db.session.commit()
        
        return quarantine_record
    
    def classify_batch_emails(self, emails_data: List[Dict], user_id: int = None) -> Dict:
        """Efficient batch classification with progress tracking"""
        start_time = time.time()
        results = []
        
        if not emails_data:
            return {'count': 0, 'results': [], 'total_processing_time_ms': 0}
        
        try:
            # Extract user_id if not provided
            if user_id is None and emails_data:
                user_id = emails_data[0].get('user_id')
                
            if not user_id:
                raise ValueError("user_id is required for batch classification")
            
            # Sanitize all emails
            sanitized_emails = [self._sanitize_email(email) for email in emails_data]
            
            # Extract texts for batch prediction
            texts = [email['body'] for email in sanitized_emails]
            
            # Perform batch prediction
            predictions = self._batch_predict(texts)
            
            # Process each email individually with batch prediction results
            for email_data, (label_int, confidence_score) in zip(sanitized_emails, predictions):
                try:
                    # Set user_id if missing
                    if not email_data.get('user_id'):
                        email_data['user_id'] = user_id
                    
                    # Process individual email with pre-computed prediction
                    result = self.classify_single_email(
                        email_data, 
                        _prediction=(label_int, confidence_score)
                    )
                    results.append(result)
                    
                except Exception as e:
                    logger.error(f"Error processing email in batch: {str(e)}")
                    results.append({
                        'error': str(e),
                        'prediction': 'error',
                        'confidence_score': 0.0,
                        'quarantined': False
                    })
            
            total_time_ms = int((time.time() - start_time) * 1000)
            
            # Calculate statistics
            successful_results = [r for r in results if 'error' not in r]
            phishing_count = sum(1 for r in successful_results if r.get('prediction') == 'phish')
            quarantined_count = sum(1 for r in successful_results if r.get('quarantined', False))
            
            return {
                'count': len(results),
                'results': results,
                'total_processing_time_ms': total_time_ms,
                'avg_processing_time_ms': total_time_ms / len(results) if results else 0,
                'statistics': {
                    'successful_classifications': len(successful_results),
                    'errors': len(results) - len(successful_results),
                    'phishing_detected': phishing_count,
                    'emails_quarantined': quarantined_count,
                    'detection_rate': round(phishing_count / len(successful_results) * 100, 2) if successful_results else 0
                }
            }
            
        except Exception as e:
            logger.error(f"Error in batch classification: {str(e)}")
            self._error_count += 1
            raise RuntimeError(f"Batch classification failed: {str(e)}")
    
    def _update_user_analytics(self, user_id: int, prediction: str, 
                             processing_time_ms: int, quarantined: bool = False):
        """Enhanced user analytics tracking"""
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
                
            if quarantined:
                analytics.emails_quarantined += 1
            
            # Update rolling average processing time
            old_avg = analytics.avg_processing_time_ms or 0.0
            old_count = analytics.emails_processed - 1
            
            if old_count > 0:
                analytics.avg_processing_time_ms = (
                    (old_avg * old_count + processing_time_ms) / analytics.emails_processed
                )
            else:
                analytics.avg_processing_time_ms = float(processing_time_ms)
            
            db.session.commit()
            
        except Exception as e:
            logger.error(f"Error updating user analytics: {str(e)}")
            db.session.rollback()
    
    def release_from_quarantine(self, quarantine_id: int, user_id: int = None, 
                              release_reason: str = None) -> Optional[Dict]:
        """Enhanced quarantine release with audit trail"""
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
                    'message': 'Email was already released from quarantine',
                    'released_at': quarantine_record.released_at.isoformat() if quarantine_record.released_at else None
                }
            
            # Create released email record
            released_email = Email(
                user_id=quarantine_record.user_id,
                sender=quarantine_record.sender,
                recipient=quarantine_record.recipient,
                subject=quarantine_record.subject,
                body=quarantine_record.body,
                headers=quarantine_record.headers,
                prediction='released',  # Special status for manually released emails
                confidence_score=quarantine_record.confidence_score,
                threat_level=ThreatLevel.LOW,  # Reduced after manual review
                status=EmailStatus.RELEASED,
                model_version=self._model_version,
                processing_time_ms=0,  # No processing time for release
                release_reason=release_reason,
                processed_at=datetime.utcnow(),
                created_at=datetime.utcnow()
            )
            
            # Update quarantine record
            quarantine_record.released = True
            quarantine_record.released_at = datetime.utcnow()
            quarantine_record.release_reason = release_reason
            
            db.session.add(released_email)
            db.session.commit()
            
            logger.info(f"Released email {quarantine_id} from quarantine. Reason: {release_reason}")
            
            return {
                'status': 'released',
                'email_id': released_email.id,
                'quarantine_id': quarantine_id,
                'released_at': quarantine_record.released_at.isoformat(),
                'release_reason': release_reason
            }
            
        except Exception as e:
            logger.error(f"Error releasing from quarantine: {str(e)}")
            db.session.rollback()
            raise RuntimeError(f"Failed to release from quarantine: {str(e)}")
    
    def bulk_release_from_quarantine(self, quarantine_ids: List[int], 
                                   user_id: int = None, release_reason: str = None) -> Dict:
        """Release multiple emails from quarantine efficiently"""
        results = []
        errors = []
        
        for q_id in quarantine_ids:
            try:
                result = self.release_from_quarantine(q_id, user_id, release_reason)
                if result:
                    results.append(result)
                else:
                    errors.append({'quarantine_id': q_id, 'error': 'Not found'})
            except Exception as e:
                errors.append({'quarantine_id': q_id, 'error': str(e)})
        
        return {
            'released': len(results),
            'errors': len(errors),
            'results': results,
            'error_details': errors
        }
    
    def get_detection_stats(self, user_id: int = None, days: int = 7) -> Dict:
        """Comprehensive detection statistics for dashboard"""
        try:
            start_date = datetime.utcnow() - timedelta(days=days)
            
            # Base email query
            email_query = db.session.query(Email).filter(Email.created_at >= start_date)
            if user_id:
                email_query = email_query.filter_by(user_id=user_id)
            
            # Base quarantine query  
            quarantine_query = db.session.query(Quarantine).filter(Quarantine.quarantined_at >= start_date)
            if user_id:
                quarantine_query = quarantine_query.filter_by(user_id=user_id)
            
            # Basic counts
            total_emails = email_query.count()
            phishing_emails = email_query.filter_by(prediction='phish').count()
            quarantined_emails = quarantine_query.filter_by(released=False).count()
            released_emails = quarantine_query.filter_by(released=True).count()
            
            # Calculate rates
            detection_rate = (phishing_emails / total_emails * 100) if total_emails > 0 else 0
            quarantine_rate = (quarantined_emails / total_emails * 100) if total_emails > 0 else 0
            release_rate = (released_emails / (quarantined_emails + released_emails) * 100) if (quarantined_emails + released_emails) > 0 else 0
            
            # Performance metrics
            avg_processing_time = email_query.with_entities(
                db.func.avg(Email.processing_time_ms)
            ).scalar() or 0
            
            max_processing_time = email_query.with_entities(
                db.func.max(Email.processing_time_ms)
            ).scalar() or 0
            
            # Threat level distribution
            threat_distribution = {}
            if hasattr(Email, 'threat_level'):
                for level in ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']:
                    count = email_query.filter(Email.threat_level == level).count()
                    threat_distribution[level.lower()] = count
            
            # Daily breakdown for the period
            daily_stats = []
            for i in range(days):
                day_start = (datetime.utcnow() - timedelta(days=i)).replace(hour=0, minute=0, second=0, microsecond=0)
                day_end = day_start + timedelta(days=1)
                
                day_query = email_query.filter(
                    Email.created_at >= day_start,
                    Email.created_at < day_end
                )
                
                day_total = day_query.count()
                day_phishing = day_query.filter_by(prediction='phish').count()
                
                daily_stats.append({
                    'date': day_start.strftime('%Y-%m-%d'),
                    'total_emails': day_total,
                    'phishing_detected': day_phishing,
                    'detection_rate': (day_phishing / day_total * 100) if day_total > 0 else 0
                })
            
            # Recent activity (last 24 hours)
            last_24h = datetime.utcnow() - timedelta(hours=24)
            recent_emails = email_query.filter(Email.created_at >= last_24h).count()
            recent_phishing = email_query.filter(
                Email.created_at >= last_24h,
                Email.prediction == 'phish'
            ).count()
            
            return {
                'period_days': days,
                'total_emails_processed': total_emails,
                'phishing_detected': phishing_emails,
                'emails_quarantined': quarantined_emails,
                'emails_released': released_emails,
                'detection_rate_percentage': round(detection_rate, 2),
                'quarantine_rate_percentage': round(quarantine_rate, 2),
                'release_rate_percentage': round(release_rate, 2),
                'performance': {
                    'avg_processing_time_ms': round(avg_processing_time, 2),
                    'max_processing_time_ms': max_processing_time,
                    'total_prediction_calls': len(self._prediction_times),
                    'error_count': self._error_count
                },
                'threat_distribution': threat_distribution,
                'daily_breakdown': list(reversed(daily_stats)),  # Most recent first
                'recent_activity_24h': {
                    'total_emails': recent_emails,
                    'phishing_detected': recent_phishing
                },
                'model_info': {
                    'version': self._model_version,
                    'artifacts_loaded': self._artifacts_loaded
                }
            }
            
        except Exception as e:
            logger.error(f"Error getting detection stats: {str(e)}")
            return {
                'period_days': days,
                'total_emails_processed': 0,
                'phishing_detected': 0,
                'emails_quarantined': 0,
                'emails_released': 0,
                'detection_rate_percentage': 0.0,
                'quarantine_rate_percentage': 0.0,
                'release_rate_percentage': 0.0,
                'performance': {
                    'avg_processing_time_ms': 0.0,
                    'max_processing_time_ms': 0,
                    'total_prediction_calls': 0,
                    'error_count': self._error_count
                },
                'threat_distribution': {},
                'daily_breakdown': [],
                'recent_activity_24h': {'total_emails': 0, 'phishing_detected': 0},
                'model_info': {'version': self._model_version, 'artifacts_loaded': self._artifacts_loaded},
                'error': str(e)
            }
    
    def get_quarantine_summary(self, user_id: int = None, days: int = 30) -> Dict:
        """Get comprehensive quarantine summary"""
        try:
            start_date = datetime.utcnow() - timedelta(days=days)
            
            query = db.session.query(Quarantine).filter(Quarantine.quarantined_at >= start_date)
            if user_id:
                query = query.filter_by(user_id=user_id)
            
            total_quarantined = query.count()
            currently_quarantined = query.filter_by(released=False).count()
            released_count = query.filter_by(released=True).count()
            expired_count = query.filter(Quarantine.expires_at < datetime.utcnow()).count()
            
            # Quarantine reasons analysis
            recent_quarantines = query.order_by(Quarantine.quarantined_at.desc()).limit(100).all()
            
            reason_analysis = {}
            threat_level_count = {}
            
            for q in recent_quarantines:
                # Analyze reasons
                reason = q.reason or "Unknown"
                reason_key = reason.split(';')[0]  # Take first part of compound reasons
                reason_analysis[reason_key] = reason_analysis.get(reason_key, 0) + 1
                
                # Threat level distribution
                threat_level = str(q.threat_level) if q.threat_level else "UNKNOWN"
                threat_level_count[threat_level] = threat_level_count.get(threat_level, 0) + 1
            
            return {
                'period_days': days,
                'total_quarantined': total_quarantined,
                'currently_quarantined': currently_quarantined,
                'released_count': released_count,
                'expired_count': expired_count,
                'release_rate_percentage': round(released_count / total_quarantined * 100, 2) if total_quarantined > 0 else 0,
                'top_quarantine_reasons': dict(sorted(reason_analysis.items(), key=lambda x: x[1], reverse=True)[:10]),
                'threat_level_distribution': threat_level_count,
                'pending_review': currently_quarantined - expired_count
            }
            
        except Exception as e:
            logger.error(f"Error getting quarantine summary: {str(e)}")
            return {
                'error': str(e),
                'period_days': days,
                'total_quarantined': 0,
                'currently_quarantined': 0,
                'released_count': 0
            }
    
    def health_check(self) -> Dict:
        """System health check for monitoring"""
        try:
            health_status = {
                'status': 'healthy',
                'timestamp': datetime.utcnow().isoformat(),
                'components': {}
            }
            
            # Check ML artifacts
            try:
                self.load_artifacts()
                health_status['components']['ml_models'] = {
                    'status': 'healthy',
                    'model_version': self._model_version,
                    'artifacts_loaded': self._artifacts_loaded
                }
            except Exception as e:
                health_status['components']['ml_models'] = {
                    'status': 'unhealthy',
                    'error': str(e)
                }
                health_status['status'] = 'degraded'
            
            # Check database connectivity
            try:
                db.session.execute(db.text('SELECT 1')).scalar()
                health_status['components']['database'] = {'status': 'healthy'}
            except Exception as e:
                health_status['components']['database'] = {
                    'status': 'unhealthy',
                    'error': str(e)
                }
                health_status['status'] = 'unhealthy'
            
            # Performance metrics
            if self._prediction_times:
                avg_prediction_time = sum(self._prediction_times[-100:]) / len(self._prediction_times[-100:])
                health_status['performance'] = {
                    'avg_prediction_time_ms': round(avg_prediction_time, 2),
                    'total_predictions': len(self._prediction_times),
                    'error_count': self._error_count,
                    'error_rate': self._error_count / len(self._prediction_times) if self._prediction_times else 0
                }
            
            return health_status
            
        except Exception as e:
            return {
                'status': 'unhealthy',
                'timestamp': datetime.utcnow().isoformat(),
                'error': str(e)
            }


# Global detection engine instance
detection_engine = UnifiedDetectionEngine()


# Public API functions for backward compatibility and easy integration
def classify_emails(payload: Union[Dict, List[Dict]]) -> Dict:
    """
    Main email classification function with backward compatibility
    
    Args:
        payload: Single email dict or {'emails': [list of email dicts]}
                Must include 'user_id' field
    
    Returns:
        Dict with 'count' and 'results' fields
    """
    if not payload:
        raise ValueError("payload is required")
    
    try:
        # Handle different input formats
        if isinstance(payload, dict):
            if 'emails' in payload and isinstance(payload['emails'], list):
                # Batch format: {'emails': [...], 'user_id': ...}
                emails_list = payload['emails']
                user_id = payload.get('user_id')
                
                if not user_id and emails_list:
                    user_id = emails_list[0].get('user_id')
                
                if not user_id:
                    raise ValueError("user_id is required")
                
                return detection_engine.classify_batch_emails(emails_list, user_id)
            
            else:
                # Single email format
                user_id = payload.get('user_id')
                if not user_id:
                    raise ValueError("user_id is required")
                
                result = detection_engine.classify_single_email(payload)
                return {'count': 1, 'results': [result]}
        
        elif isinstance(payload, list):
            # Direct list of emails
            if not payload:
                return {'count': 0, 'results': []}
                
            user_id = payload[0].get('user_id') if payload else None
            if not user_id:
                raise ValueError("user_id is required in first email")
            
            return detection_engine.classify_batch_emails(payload, user_id)
        
        else:
            raise ValueError("payload must be dict or list")
            
    except Exception as e:
        logger.error(f"Error in classify_emails: {str(e)}")
        raise


def release_from_quarantine(quarantine_id: int, user_id: int = None, 
                          release_reason: str = None) -> Optional[Dict]:
    """
    Release email from quarantine
    
    Args:
        quarantine_id: ID of quarantine record
        user_id: Optional user ID for authorization
        release_reason: Optional reason for release
    
    Returns:
        Dict with release details or None if not found
    """
    return detection_engine.release_from_quarantine(quarantine_id, user_id, release_reason)


def bulk_release_from_quarantine(quarantine_ids: List[int], user_id: int = None,
                                release_reason: str = None) -> Dict:
    """Release multiple emails from quarantine"""
    return detection_engine.bulk_release_from_quarantine(quarantine_ids, user_id, release_reason)


def get_detection_stats(user_id: int = None, days: int = 7) -> Dict:
    """Get detection statistics for dashboard"""
    return detection_engine.get_detection_stats(user_id, days)


def get_quarantine_summary(user_id: int = None, days: int = 30) -> Dict:
    """Get quarantine summary statistics"""
    return detection_engine.get_quarantine_summary(user_id, days)


def health_check() -> Dict:
    """System health check"""
    return detection_engine.health_check()


# Legacy function aliases for backward compatibility
def _sanitize(email_data):
    """Legacy function for backward compatibility"""
    return detection_engine._sanitize_email(email_data)


def _batch_predict(texts):
    """Legacy function for backward compatibility"""
    return detection_engine._batch_predict(texts)


def load_artifacts():
    """Legacy function for backward compatibility"""
    return detection_engine.load_artifacts()


# Module initialization
logger.info("Unified Detection Service initialized")
logger.info(f"Model directory: {MODEL_DIR}")
logger.info(f"Batch size: {PRED_BATCH_SIZE}")

# Validate configuration on import
if __name__ == "__main__":
    # Self-test when run directly
    try:
        health = health_check()
        print("Health Check Results:")
        print(f"Status: {health['status']}")
        
        if health['status'] != 'healthy':
            print("Issues found:")
            for component, status in health.get('components', {}).items():
                if status.get('status') != 'healthy':
                    print(f"  - {component}: {status.get('error', 'Unknown issue')}")
        else:
            print("All systems operational")
            
    except Exception as e:
        print(f"Self-test failed: {e}")
        exit(1)