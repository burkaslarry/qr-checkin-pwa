#!/bin/bash
# Install dependencies
pip install -r backend/requirements.txt

# Run the server
# Reload is enabled for development
cd backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000


