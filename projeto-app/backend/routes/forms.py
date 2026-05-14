"""Rotas da API para formulários de ação (/api/forms)."""
import json, base64, uuid
from flask import Blueprint, jsonify, request
from backend.app import db
from backend.models import Form

forms_bp = Blueprint('forms', __name__)

def _file_to_base64(file_obj):
    if not file_obj or not file_obj.filename:
        return None
    data = file_obj.read()
    ext = file_obj.filename.rsplit('.', 1)[-1].lower() if '.' in file_obj.filename else 'jpg'
    mime = 'image/jpeg' if ext in ('jpg','jpeg') else 'image/png' if ext == 'png' else 'image/' + ext
    return 'data:' + mime + ';base64,' + base64.b64encode(data).decode('utf-8')

@forms_bp.route('/api/forms', methods=['POST'])
def create_form():
    try:
        volunteer_name = request.form.get('volunteer_name')
        if not volunteer_name:
            return jsonify({"error": "volunteer_name é obrigatório"}), 400

        raw_actions = request.form.get('actions')
        if raw_actions is None:
            return jsonify({"error": "actions é obrigatório"}), 400
        try:
            actions = json.loads(raw_actions) if isinstance(raw_actions, str) else raw_actions
        except (json.JSONDecodeError, TypeError):
            actions = [raw_actions] if raw_actions else []
        if not isinstance(actions, list): actions = [actions]
        if len(actions) == 0:
            return jsonify({"error": "Ao menos uma ação deve ser selecionada"}), 400

        image_data = _file_to_base64(request.files.get('image'))

        people_served = 1
        ps_raw = request.form.get('people_served')
        if ps_raw:
            try: people_served = int(ps_raw)
            except: pass

        form = Form(
            id=request.form.get('id') or str(uuid.uuid4()),
            volunteer_name=volunteer_name,
            actions=actions,
            full_name=request.form.get('full_name'),
            description=request.form.get('description'),
            image_data=image_data,
            people_served=people_served,
        )
        db.session.add(form)
        db.session.commit()

        return jsonify({
            "id": form.id, "volunteer_name": form.volunteer_name, "actions": form.actions,
            "description": form.description, "people_served": form.people_served,
            "image_data": form.image_data is not None,
            "created_at": form.created_at.isoformat() if form.created_at else None,
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@forms_bp.route('/api/forms', methods=['GET'])
def list_forms():
    try:
        forms = Form.query.order_by(Form.created_at.asc()).all()
        result = []
        for f in forms:
            result.append({
                "id": f.id, "volunteer_name": f.volunteer_name, "actions": f.actions,
                "description": f.description, "people_served": f.people_served,
                "image_data": f.image_data,
                "created_at": f.created_at.isoformat() if f.created_at else None,
            })
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
