import os
import shutil
from flask import Flask, send_from_directory, request as flask_request, jsonify
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

BASE_DIR = os.path.abspath(os.path.dirname(__file__))
FRONTEND_DIR = os.path.abspath(os.path.join(BASE_DIR, '..', 'frontend'))
UPLOADS_DIR = os.path.join(BASE_DIR, 'uploads')


def _run_migrations(app):
    """Add missing columns to existing tables (SQLAlchemy create_all won't do this)."""
    migrations = [
        ("form", "image_data", "TEXT"),
        ("form", "image_path", "VARCHAR(500)"),
        ("form", "people_served", "INTEGER DEFAULT 1"),
        ("form", "age", "INTEGER"),
        ("form", "locality", "VARCHAR(200)"),
        ("post", "image_data", "TEXT"),
        ("post", "image_path", "VARCHAR(500)"),
        ("receipt", "image_data", "TEXT"),
        ("receipt", "image_path", "VARCHAR(500)"),
    ]
    with app.app_context():
        is_postgres = app.config['SQLALCHEMY_DATABASE_URI'].startswith('postgresql')
        for table, column, col_type in migrations:
            try:
                if is_postgres:
                    db.session.execute(db.text(
                        f'ALTER TABLE "{table}" ADD COLUMN IF NOT EXISTS "{column}" {col_type}'
                    ))
                else:
                    db.session.execute(db.text(
                        f'ALTER TABLE "{table}" ADD COLUMN "{column}" {col_type}'
                    ))
                db.session.commit()
            except Exception:
                db.session.rollback()


def create_app():
    app = Flask(__name__, static_folder=None)

    # Database: usa DATABASE_URL (Postgres em produção) ou SQLite local como fallback.
    database_url = os.environ.get('DATABASE_URL')
    if database_url:
        # SQLAlchemy >= 1.4 exige o prefixo "postgresql://" (Render entrega "postgres://").
        if database_url.startswith('postgres://'):
            database_url = database_url.replace('postgres://', 'postgresql://', 1)
    else:
        database_url = 'sqlite:///' + os.path.join(BASE_DIR, 'ide.db')

    app.config['SQLALCHEMY_DATABASE_URI'] = database_url
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['UPLOADS_DIR'] = UPLOADS_DIR
    app.config['ACCESS_PIN'] = os.environ.get('IDE_PIN', os.environ.get('ARIRI_PIN', '1234'))
    app.config['ADMIN_PIN'] = os.environ.get('IDE_ADMIN_PIN', os.environ.get('ARIRI_ADMIN_PIN', '4310'))

    db.init_app(app)

    # CORS: aceita origens via ALLOWED_ORIGINS (separadas por vírgula). Default: tudo.
    allowed_origins_raw = os.environ.get('ALLOWED_ORIGINS', '*')
    if allowed_origins_raw == '*':
        CORS(app)
    else:
        origins = [o.strip() for o in allowed_origins_raw.split(',') if o.strip()]
        CORS(app, resources={r"/api/*": {"origins": origins}}, supports_credentials=False)

    os.makedirs(UPLOADS_DIR, exist_ok=True)

    # Register API blueprints
    _register_blueprints(app)

    with app.app_context():
        try:
            from . import models
        except ImportError:
            pass
        db.create_all()
        _run_migrations(app)

    # Reset all data (protected by PIN)
    @app.route('/api/reset-all', methods=['POST'])
    def reset_all():
        data = flask_request.get_json(silent=True) or {}
        pin = str(data.get('pin', ''))
        if pin != app.config.get('ADMIN_PIN', '4310'):
            return jsonify({"error": "PIN incorreto"}), 403
        try:
            from backend.models import Form, Post, Receipt, Volunteer
            Form.query.delete()
            Post.query.delete()
            Receipt.query.delete()
            Volunteer.query.delete()
            db.session.commit()
            if os.path.isdir(UPLOADS_DIR):
                shutil.rmtree(UPLOADS_DIR)
                os.makedirs(UPLOADS_DIR, exist_ok=True)
            return jsonify({"status": "ok", "message": "Todos os dados foram apagados"}), 200
        except Exception as e:
            db.session.rollback()
            return jsonify({"error": str(e)}), 500

    @app.route('/api/clear/<string:table>', methods=['POST'])
    def clear_table(table):
        data = flask_request.get_json(silent=True) or {}
        pin = str(data.get('pin', ''))
        if pin != app.config.get('ADMIN_PIN', '4310'):
            return jsonify({"error": "PIN incorreto"}), 403
        try:
            from backend.models import Form, Post, Receipt
            tables = {'forms': Form, 'posts': Post, 'receipts': Receipt}
            if table not in tables:
                return jsonify({"error": "Tabela inválida"}), 400
            tables[table].query.delete()
            db.session.commit()
            return jsonify({"status": "ok", "message": table + " apagados"}), 200
        except Exception as e:
            db.session.rollback()
            return jsonify({"error": str(e)}), 500

    # Serve uploaded files
    @app.route('/uploads/<path:filename>')
    def serve_upload(filename):
        return send_from_directory(UPLOADS_DIR, filename)

    # Root
    @app.route('/')
    def serve_index():
        return send_from_directory(FRONTEND_DIR, 'index.html')

    @app.route('/index.html')
    def serve_index_html():
        return send_from_directory(FRONTEND_DIR, 'index.html')

    # Serve static frontend files explicitly (CSS, JS, assets)
    @app.route('/css/<path:filename>')
    def serve_css(filename):
        return send_from_directory(os.path.join(FRONTEND_DIR, 'css'), filename)

    @app.route('/js/<path:filename>')
    def serve_js(filename):
        return send_from_directory(os.path.join(FRONTEND_DIR, 'js'), filename)

    @app.route('/data/<path:filename>')
    def serve_data(filename):
        return send_from_directory(os.path.join(FRONTEND_DIR, 'data'), filename)

    @app.route('/assets/<path:filename>')
    def serve_assets(filename):
        return send_from_directory(os.path.join(FRONTEND_DIR, 'assets'), filename)

    @app.route('/manifest.json')
    def serve_manifest():
        return send_from_directory(FRONTEND_DIR, 'manifest.json')

    @app.route('/sw.js')
    def serve_sw():
        resp = send_from_directory(FRONTEND_DIR, 'sw.js')
        resp.headers['Service-Worker-Allowed'] = '/'
        return resp

    @app.route('/favicon.ico')
    def serve_favicon():
        return send_from_directory(FRONTEND_DIR, 'favicon.ico') if os.path.isfile(os.path.join(FRONTEND_DIR, 'favicon.ico')) else ('', 204)

    return app


def _register_blueprints(app):
    try:
        from backend.routes.ping import ping_bp
        app.register_blueprint(ping_bp)
    except ImportError:
        pass
    try:
        from backend.routes.pin import pin_bp
        app.register_blueprint(pin_bp)
    except ImportError:
        pass
    try:
        from backend.routes.forms import forms_bp
        app.register_blueprint(forms_bp)
    except ImportError:
        pass
    try:
        from backend.routes.posts import posts_bp
        app.register_blueprint(posts_bp)
    except ImportError:
        pass
    try:
        from backend.routes.receipts import receipts_bp
        app.register_blueprint(receipts_bp)
    except ImportError:
        pass
    try:
        from backend.routes.volunteers import volunteers_bp
        app.register_blueprint(volunteers_bp)
    except ImportError:
        pass
    try:
        from backend.routes.schedule import schedule_bp
        app.register_blueprint(schedule_bp)
    except ImportError:
        pass
    try:
        from backend.routes.sync import sync_bp
        app.register_blueprint(sync_bp)
    except ImportError:
        pass


if __name__ == '__main__':
    app = create_app()
    app.run(host='0.0.0.0', port=5000, debug=False)
