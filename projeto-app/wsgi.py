"""WSGI entry point para o gunicorn (deploy no Render)."""
from backend.app import create_app

app = create_app()
