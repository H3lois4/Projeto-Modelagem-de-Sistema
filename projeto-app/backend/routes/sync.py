"""Rota da API para sincronização em lote (/api/sync)."""

import json
from datetime import datetime

from flask import Blueprint, jsonify, request

from backend.app import db
from backend.models import Form, Post, Receipt

sync_bp = Blueprint('sync', __name__)


def _ensure_base64_data_uri(base64_data):
    """Garante que o dado base64 tenha o prefixo data URI. Retorna None se vazio."""
    if not base64_data:
        return None

    # Já tem prefixo data URI — retorna como está
    if base64_data.startswith('data:'):
        return base64_data

    # Sem prefixo — adiciona como JPEG por padrão
    return 'data:image/jpeg;base64,' + base64_data


def _parse_created_at(value):
    """Parse ISO 8601 created_at string into a datetime object (horário de Brasília)."""
    if not value:
        from backend.models import _now_brt
        return _now_brt()
    try:
        # Handle trailing Z (UTC indicator)
        if isinstance(value, str) and value.endswith('Z'):
            value = value[:-1] + '+00:00'
        dt = datetime.fromisoformat(value)
        # Se veio com timezone, converte para BRT; senão assume que já é local
        if dt.tzinfo is not None:
            from backend.models import BRT
            dt = dt.astimezone(BRT)
        return dt.replace(tzinfo=None)
    except (ValueError, TypeError):
        from backend.models import _now_brt
        return _now_brt()


def _sync_form(item_id, data, created_at):
    """Cria um registro Form a partir dos dados de sincronização."""
    actions = data.get('actions', [])
    if isinstance(actions, str):
        try:
            actions = json.loads(actions)
        except (json.JSONDecodeError, TypeError):
            actions = [actions]

    image_data = _ensure_base64_data_uri(data.get('image'))

    age = data.get('age')
    age_int = None
    if age is not None and age != '':
        try:
            age_int = int(age)
        except (ValueError, TypeError):
            age_int = None

    form = Form(
        id=item_id,
        volunteer_name=data.get('volunteer_name', ''),
        actions=actions if isinstance(actions, list) else [actions],
        full_name=data.get('full_name'),
        age=age_int,
        locality=data.get('locality'),
        description=data.get('description'),
        image_data=image_data,
        people_served=int(data.get('people_served', 1) or 1),
        created_at=created_at,
    )
    db.session.add(form)


def _sync_post(item_id, data, created_at):
    """Cria um registro Post a partir dos dados de sincronização."""
    image_data = _ensure_base64_data_uri(data.get('image'))

    post = Post(
        id=item_id,
        volunteer_name=data.get('volunteer_name', ''),
        title=data.get('title', ''),
        description=data.get('description'),
        image_data=image_data,
        created_at=created_at,
    )
    db.session.add(post)


def _sync_receipt(item_id, data, created_at):
    """Cria um registro Receipt a partir dos dados de sincronização."""
    image_data = _ensure_base64_data_uri(data.get('image'))

    receipt = Receipt(
        id=item_id,
        title=data.get('title', ''),
        description=data.get('description'),
        image_data=image_data,
        created_at=created_at,
    )
    db.session.add(receipt)


# Map type names to their handler and model
_TYPE_HANDLERS = {
    'form': (_sync_form, Form),
    'post': (_sync_post, Post),
    'receipt': (_sync_receipt, Receipt),
}


@sync_bp.route('/api/sync', methods=['POST'])
def batch_sync():
    """Recebe array de itens e sincroniza em lote."""
    try:
        body = request.get_json(silent=True)
        if not body or 'items' not in body:
            return jsonify({"error": "Campo 'items' é obrigatório"}), 400

        items = body['items']
        if not isinstance(items, list):
            return jsonify({"error": "'items' deve ser uma lista"}), 400

        synced = []
        errors = []

        for item in items:
            item_id = item.get('id')
            item_type = item.get('type')
            data = item.get('data', {})
            created_at_raw = item.get('created_at')

            if not item_id:
                errors.append({"id": item_id, "error": "Campo 'id' é obrigatório"})
                continue

            if item_type not in _TYPE_HANDLERS:
                errors.append({"id": item_id, "error": f"Tipo '{item_type}' não suportado"})
                continue

            handler, model = _TYPE_HANDLERS[item_type]

            # Check for duplicate — already exists in DB
            existing = db.session.get(model, item_id)
            if existing:
                synced.append(item_id)
                continue

            created_at = _parse_created_at(created_at_raw)

            try:
                handler(item_id, data, created_at)
                db.session.commit()
                synced.append(item_id)
            except Exception as e:
                db.session.rollback()
                errors.append({"id": item_id, "error": str(e)})

        return jsonify({"synced": synced, "errors": errors}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500
