"""Rotas de verificação de PIN."""

from flask import Blueprint, current_app, jsonify, request

pin_bp = Blueprint('pin', __name__)


@pin_bp.route('/api/verify-pin', methods=['POST'])
def verify_pin():
    data = request.get_json(silent=True)
    if not data or 'pin' not in data:
        return jsonify({"error": "Campo 'pin' é obrigatório"}), 400
    correct_pin = current_app.config.get('ACCESS_PIN', '1234')
    if str(data['pin']) == str(correct_pin):
        return jsonify({"valid": True}), 200
    return jsonify({"valid": False, "error": "PIN incorreto"}), 200


@pin_bp.route('/api/verify-admin-pin', methods=['POST'])
def verify_admin_pin():
    data = request.get_json(silent=True)
    if not data or 'pin' not in data:
        return jsonify({"error": "Campo 'pin' é obrigatório"}), 400
    admin_pin = current_app.config.get('ADMIN_PIN', '4310')
    if str(data['pin']) == str(admin_pin):
        return jsonify({"valid": True}), 200
    return jsonify({"valid": False, "error": "PIN incorreto"}), 200
