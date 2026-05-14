"""Rota /api/schedule — dados do cronograma da missão."""

import json
import os

from flask import Blueprint, jsonify

schedule_bp = Blueprint('schedule', __name__)

# schedule_data.json lives alongside app.py in the backend directory
_BACKEND_DIR = os.path.abspath(os.path.dirname(os.path.dirname(__file__)))
SCHEDULE_FILE = os.path.join(_BACKEND_DIR, 'schedule_data.json')


@schedule_bp.route('/api/schedule', methods=['GET'])
def get_schedule():
    """Retorna os dados do cronograma a partir de schedule_data.json."""
    if not os.path.isfile(SCHEDULE_FILE):
        return jsonify({
            "days": [],
            "warning": "schedule_data.json não encontrado"
        }), 200

    try:
        with open(SCHEDULE_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except (json.JSONDecodeError, ValueError) as exc:
        return jsonify({
            "error": f"Erro ao ler schedule_data.json: {exc}"
        }), 500

    return jsonify(data), 200
