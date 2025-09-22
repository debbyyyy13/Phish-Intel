from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

class User(db.Model):
    __tablename__ = "users"
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False)

class Email(db.Model):
    __tablename__ = "emails"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    subject = db.Column(db.Text)
    body = db.Column(db.Text)
    prediction = db.Column(db.String(20))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class Quarantine(db.Model):
    __tablename__ = "quarantine"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    subject = db.Column(db.Text)
    body = db.Column(db.Text)
    prediction = db.Column(db.String(20))
    quarantined_at = db.Column(db.DateTime, default=datetime.utcnow)
    released = db.Column(db.Boolean, default=False)
