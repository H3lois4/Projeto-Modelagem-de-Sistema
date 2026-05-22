"""Rotas administrativas: limpeza por tabela e reset total (protegidas por PIN)."""

import os
import shutil

from flask import Blueprint, current_app, jsonify, request

from backend.app import db
from backend.models import Form, Post, Receipt, Volunteer

admin_bp = Blueprint('admin', __name__)

# Mapa de tabelas limpáveis. Centraliza a regra que estava espalhada.
_CLEARABLE_TABLES = {
    'forms': Form,
    'posts': Post,
    'receipts': Receipt,
}


def _check_admin_pin():
    """Valida o PIN de admin. Retorna None se ok, ou uma response de erro."""
    data = request.get_json(silent=True) or {}
    pin = str(data.get('pin', ''))
    if pin != current_app.config.get('ADMIN_PIN', '4310'):
        return jsonify({"error": "PIN incorreto"}), 403
    return None


@admin_bp.route('/api/reset-all', methods=['POST'])
def reset_all():
    """Apaga todos os dados (forms, posts, receipts, volunteers) e a pasta uploads."""
    auth_error = _check_admin_pin()
    if auth_error:
        return auth_error

    try:
        for model in (Form, Post, Receipt, Volunteer):
            model.query.delete()
        db.session.commit()

        uploads_dir = current_app.config.get('UPLOADS_DIR')
        if uploads_dir and os.path.isdir(uploads_dir):
            shutil.rmtree(uploads_dir)
            os.makedirs(uploads_dir, exist_ok=True)

        return jsonify({"status": "ok", "message": "Todos os dados foram apagados"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


@admin_bp.route('/api/clear/<string:table>', methods=['POST'])
def clear_table(table):
    """Apaga todos os registros de uma tabela específica."""
    auth_error = _check_admin_pin()
    if auth_error:
        return auth_error

    if table not in _CLEARABLE_TABLES:
        return jsonify({"error": "Tabela inválida"}), 400

    try:
        _CLEARABLE_TABLES[table].query.delete()
        db.session.commit()
        return jsonify({"status": "ok", "message": table + " apagados"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500
