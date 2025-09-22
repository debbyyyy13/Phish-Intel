import os

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'your-super-secret-key-please-change-in-production'
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or 'sqlite:///site.db'
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # Detection Engine Configuration
    MODEL_DIR = os.environ.get('MODEL_DIR', 'models')
    PRED_BATCH_SIZE = int(os.environ.get('PRED_BATCH_SIZE', 100)) # Batch size for predictions

    # JWT Configuration for Authentication (if using)
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY') or 'jwt-super-secret-key'
    JWT_ACCESS_TOKEN_EXPIRES = 3600 # 1 hour
    # Add other configurations as needed (e.g., email server, logging)