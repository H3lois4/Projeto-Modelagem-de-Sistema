"""Rota de health check /api/ping."""

from flask import Blueprint, jsonify

ping_bp = Blueprint('ping', __name__)


@ping_bp.route('/api/ping', methods=['GET'])
def ping():
    """Health check — retorna status ok."""
    return jsonify({"status": "ok"})
