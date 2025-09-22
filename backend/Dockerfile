# Use official Python image
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt gunicorn

# Copy backend source code
COPY . .

# Expose backend port
EXPOSE 5000

# Run backend with Gunicorn (Flask app: app inside app.py)
# Adjust if your Flask entry file/app variable differs
CMD ["gunicorn", "-w", "4", "-b", "0.0.0.0:5000", "app:app"]
