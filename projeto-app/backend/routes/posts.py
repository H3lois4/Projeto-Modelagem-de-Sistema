"""Rotas da API para postagens do Diário de Bordo (/api/posts)."""
import base64, uuid
from flask import Blueprint, jsonify, request
from backend.app import db
from backend.models import Post

posts_bp = Blueprint('posts', __name__)

def _file_to_base64(file_obj):
    if not file_obj or not file_obj.filename: return None
    data = file_obj.read()
    ext = file_obj.filename.rsplit('.', 1)[-1].lower() if '.' in file_obj.filename else 'jpg'
    mime = 'image/jpeg' if ext in ('jpg','jpeg') else 'image/png' if ext == 'png' else 'image/' + ext
    return 'data:' + mime + ';base64,' + base64.b64encode(data).decode('utf-8')

@posts_bp.route('/api/posts', methods=['POST'])
def create_post():
    try:
        volunteer_name = request.form.get('volunteer_name')
        if not volunteer_name: return jsonify({"error": "volunteer_name é obrigatório"}), 400
        title = request.form.get('title')
        if not title: return jsonify({"error": "title é obrigatório"}), 400

        post = Post(
            id=request.form.get('id') or str(uuid.uuid4()),
            volunteer_name=volunteer_name, title=title,
            description=request.form.get('description'),
            image_data=_file_to_base64(request.files.get('image')),
        )
        db.session.add(post)
        db.session.commit()
        return jsonify({"id": post.id, "title": post.title, "volunteer_name": post.volunteer_name,
            "image_data": post.image_data is not None,
            "created_at": post.created_at.isoformat() if post.created_at else None}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@posts_bp.route('/api/posts', methods=['GET'])
def list_posts():
    try:
        posts = Post.query.order_by(Post.created_at.desc()).all()
        return jsonify([{
            "id": p.id, "volunteer_name": p.volunteer_name, "title": p.title,
            "description": p.description, "image_data": p.image_data,
            "created_at": p.created_at.isoformat() if p.created_at else None,
        } for p in posts]), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@posts_bp.route('/api/posts/<string:post_id>', methods=['DELETE'])
def delete_post(post_id):
    try:
        post = db.session.get(Post, post_id)
        if not post: return jsonify({"error": "Não encontrado"}), 404
        db.session.delete(post)
        db.session.commit()
        return jsonify({"deleted": post_id}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


