from datetime import datetime
from enum import Enum
from werkzeug.security import generate_password_hash, check_password_hash
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.sql import func
from backend import db
import backend.models  # ensures all models are registered

db = SQLAlchemy()

# ----------------------------
# Enums
# ----------------------------
class ThreatLevel(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class EmailStatus(str, Enum):
    PROCESSED = "PROCESSED"
    QUARANTINED = "QUARANTINED"
    RELEASED = "RELEASED"


# ----------------------------
# User Model
# ----------------------------
class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)

    # Password (hashed) or Google OAuth
    password_hash = db.Column(db.String(128), nullable=True)
    google_id = db.Column(db.String(255), unique=True, nullable=True)

    avatar = db.Column(db.String(255))
    provider = db.Column(db.String(20), default="local")  # local or google
    role = db.Column(db.String(20), default="user")       # user, admin, analyst
    is_verified = db.Column(db.Boolean, default=False)

    # JSON fields — safer defaults (lambda to avoid mutable shared state)
    preferences = db.Column(db.JSON, default=lambda: {
        "notifications": True,
        "theme": "light",
        "language": "en"
    })
    settings = db.Column(db.JSON, default=dict)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    emails = db.relationship("Email", backref="user", lazy=True)
    quarantines = db.relationship("Quarantine", backref="user", lazy=True)
    analytics = db.relationship("UserAnalytics", backref="user", lazy=True)

    # ---- Methods ----
    def set_password(self, password):
        """Hash and set the password."""
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        """Verify password against stored hash."""
        return check_password_hash(self.password_hash, password)

    def __repr__(self):
        return f"<User {self.email}>"


# ----------------------------
# Config Model
# ----------------------------
class Config(db.Model):
    __tablename__ = "config"

    id = db.Column(db.Integer, primary_key=True)
    type = db.Column(db.String(100), unique=True, nullable=False)
    settings = db.Column(db.JSON, nullable=False)
    updated_by = db.Column(db.Integer, db.ForeignKey("users.id"))
    version = db.Column(db.Integer, default=1)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self):
        return f"<Config {self.type} v{self.version}>"


# ----------------------------
# Email Model
# ----------------------------
class Email(db.Model):
    __tablename__ = "emails"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)

    sender = db.Column(db.String(255))
    recipient = db.Column(db.String(255))
    subject = db.Column(db.String(500))
    body = db.Column(db.Text)
    headers = db.Column(db.JSON, default=dict)

    prediction = db.Column(db.String(50))
    confidence_score = db.Column(db.Float)
    threat_level = db.Column(db.String(20))
    status = db.Column(db.String(20))
    extracted_features = db.Column(db.JSON, default=dict)
    model_version = db.Column(db.String(50))
    processing_time_ms = db.Column(db.Integer)
    urls_found = db.Column(db.JSON, default=list)

    processed_at = db.Column(db.DateTime, default=datetime.utcnow)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f"<Email {self.subject[:20]}...>"


# ----------------------------
# Quarantine Model
# ----------------------------
class Quarantine(db.Model):
    __tablename__ = "quarantine"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)

    sender = db.Column(db.String(255))
    recipient = db.Column(db.String(255))
    subject = db.Column(db.String(500))
    body = db.Column(db.Text)
    headers = db.Column(db.JSON, default=dict)

    reason = db.Column(db.Text)
    threat_indicators = db.Column(db.JSON, default=list)
    prediction = db.Column(db.String(50))
    confidence_score = db.Column(db.Float)
    threat_level = db.Column(db.String(20))

    quarantined_at = db.Column(db.DateTime, default=datetime.utcnow)
    expires_at = db.Column(db.DateTime)
    released = db.Column(db.Boolean, default=False)
    released_at = db.Column(db.DateTime)
    release_reason = db.Column(db.String(255))

    def __repr__(self):
        return f"<Quarantine {self.subject[:20]}...>"


# ----------------------------
# User Analytics Model
# ----------------------------
class UserAnalytics(db.Model):
    __tablename__ = "user_analytics"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)

    # FIX: Use server_default to avoid import-time evaluation
    date = db.Column(db.Date, nullable=False, server_default=func.current_date())

    emails_processed = db.Column(db.Integer, default=0)
    emails_quarantined = db.Column(db.Integer, default=0)
    phishing_detected = db.Column(db.Integer, default=0)
    avg_processing_time_ms = db.Column(db.Float, default=0.0)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self):
        return f"<UserAnalytics user_id={self.user_id} date={self.date}>"
