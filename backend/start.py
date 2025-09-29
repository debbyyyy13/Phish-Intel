#!/usr/bin/env python3
"""
PhishGuard Server Startup Script
Handles database connection, port conflicts, and environment setup
"""

import os
import sys
import socket
import time
import subprocess
from pathlib import Path

def check_port_available(port, host='localhost'):
    """Check if a port is available"""
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.settimeout(1)
            result = s.connect_ex((host, port))
            return result != 0  # 0 means port is in use
    except:
        return False

def find_available_port(start_port=8000, max_tries=20):
    """Find the next available port"""
    for port in range(start_port, start_port + max_tries):
        if check_port_available(port):
            return port
    return None

def check_database_connection():
    """Check if PostgreSQL is accessible"""
    try:
        import psycopg2
        from dotenv import load_dotenv
        load_dotenv()
        
        db_url = os.environ.get('DATABASE_URL')
        if not db_url:
            return False, "No DATABASE_URL found in environment"
        
        # Parse the database URL
        if db_url.startswith('postgresql://'):
            conn = psycopg2.connect(db_url)
            conn.close()
            return True, "PostgreSQL connection successful"
        
        return False, "DATABASE_URL is not a PostgreSQL URL"
        
    except ImportError:
        return False, "psycopg2 not installed. Run: pip install psycopg2-binary"
    except Exception as e:
        return False, f"Database connection failed: {str(e)}"

def install_requirements():
    """Install required packages"""
    print("📦 Installing requirements...")
    try:
        subprocess.check_call([sys.executable, '-m', 'pip', 'install', '-r', 'requirements.txt'])
        print("✅ Requirements installed successfully")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to install requirements: {e}")
        return False

def update_frontend_env(port):
    """Update frontend .env file with correct API URL"""
    frontend_env_path = Path('../frontend-vite/.env')
    try:
        with open(frontend_env_path, 'w') as f:
            f.write(f'VITE_API_URL=http://localhost:{port}/api/v1\n')
        print(f"✅ Updated frontend .env with port {port}")
    except Exception as e:
        print(f"⚠️ Could not update frontend .env: {e}")

def main():
    print("🚀 PhishGuard Server Startup")
    print("=" * 50)
    
    # Check if requirements.txt exists and install if needed
    if Path('requirements.txt').exists():
        try:
            import flask
            import flask_cors
            import flask_jwt_extended
        except ImportError:
            print("📦 Installing missing dependencies...")
            if not install_requirements():
                sys.exit(1)
    
    # Check database connection
    print("🔍 Checking database connection...")
    db_ok, db_message = check_database_connection()
    print(f"Database: {db_message}")
    
    if not db_ok:
        print("\n⚠️ Database connection failed. Using SQLite fallback...")
        # Set SQLite as fallback
        os.environ['DATABASE_URL'] = 'sqlite:///phishguard.db'
    
    # Find available port
    print("\n🔍 Finding available port...")
    preferred_port = int(os.environ.get('PORT', 8000))
    
    if check_port_available(preferred_port):
        port = preferred_port
        print(f"✅ Port {port} is available")
    else:
        print(f"⚠️ Port {preferred_port} is busy, finding alternative...")
        port = find_available_port(preferred_port)
        if not port:
            print("❌ No available ports found")
            sys.exit(1)
        print(f"✅ Using port {port}")
    
    # Update environment and frontend config
    os.environ['PORT'] = str(port)
    update_frontend_env(port)
    
    # Import and start the app
    print(f"\n🚀 Starting server on http://localhost:{port}")
    print(f"📍 Health check: http://localhost:{port}/api/v1/health")
    print("Press Ctrl+C to stop the server")
    print("=" * 50)
    
    try:
        from app import app
        app.run(
            host='0.0.0.0',
            port=port,
            debug=True,
            use_reloader=False  # Avoid double startup in debug mode
        )
    except KeyboardInterrupt:
        print("\n👋 Server stopped by user")
    except Exception as e:
        print(f"❌ Server error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()