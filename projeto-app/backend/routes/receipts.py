"""Rotas da API para comprovantes (/api/receipts)."""
import base64, uuid
from flask import Blueprint, jsonify, request
from backend.app import db
from backend.models import Receipt

receipts_bp = Blueprint('receipts', __name__)

def _file_to_base64(file_obj):
    if not file_obj or not file_obj.filename: return None
    data = file_obj.read()
    ext = file_obj.filename.rsplit('.', 1)[-1].lower() if '.' in file_obj.filename else 'jpg'
    mime = 'image/jpeg' if ext in ('jpg','jpeg') else 'image/png' if ext == 'png' else 'image/' + ext
    return 'data:' + mime + ';base64,' + base64.b64encode(data).decode('utf-8')

@receipts_bp.route('/api/receipts', methods=['POST'])
def create_receipt():
    try:
        title = request.form.get('title')
        if not title: return jsonify({"error": "title é obrigatório"}), 400
        receipt = Receipt(
            id=request.form.get('id') or str(uuid.uuid4()),
            title=title, description=request.form.get('description'),
            image_data=_file_to_base64(request.files.get('image')),
        )
        db.session.add(receipt)
        db.session.commit()
        return jsonify({"id": receipt.id, "title": receipt.title,
            "image_data": receipt.image_data is not None,
            "created_at": receipt.created_at.isoformat() if receipt.created_at else None}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@receipts_bp.route('/api/receipts', methods=['GET'])
def list_receipts():
    try:
        receipts = Receipt.query.order_by(Receipt.created_at.desc()).all()
        return jsonify([{
            "id": r.id, "title": r.title, "description": r.description,
            "image_data": r.image_data,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        } for r in receipts]), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@receipts_bp.route('/api/receipts/<string:receipt_id>', methods=['DELETE'])
def delete_receipt(receipt_id):
    try:
        r = db.session.get(Receipt, receipt_id)
        if not r: return jsonify({"error": "Não encontrado"}), 404
        db.session.delete(r)
        db.session.commit()
        return jsonify({"deleted": receipt_id}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


