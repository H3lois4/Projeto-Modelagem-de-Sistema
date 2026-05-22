"""Bootstrap da aplicação Flask.

Responsabilidade dividida em funções privadas por aspecto:
- _configure_database: monta a URL do banco e flags do SQLAlchemy
- _configure_cors: aplica CORS conforme ALLOWED_ORIGINS
- _register_blueprints: registra todos os blueprints da API
- _register_static_routes: serve frontend estático e uploads
- _run_migrations: aplica ALTER TABLE idempotentes
"""

import os
from flask import Flask, send_from_directory
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

BASE_DIR = os.path.abspath(os.path.dirname(__file__))
FRONTEND_DIR = os.path.abspath(os.path.join(BASE_DIR, '..', 'frontend'))
UPLOADS_DIR = os.path.join(BASE_DIR, 'uploads')


# ─── Configuração ───

def _configure_database(app):
    """Configura a URL do banco. Usa DATABASE_URL (Postgres) ou SQLite local."""
    database_url = os.environ.get('DATABASE_URL')
    if database_url:
        # SQLAlchemy >= 1.4 exige "postgresql://" (Render entrega "postgres://").
        if database_url.startswith('postgres://'):
            database_url = database_url.replace('postgres://', 'postgresql://', 1)
    else:
        database_url = 'sqlite:///' + os.path.join(BASE_DIR, 'ide.db')

    app.config['SQLALCHEMY_DATABASE_URI'] = database_url
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['UPLOADS_DIR'] = UPLOADS_DIR
    app.config['ACCESS_PIN'] = os.environ.get('IDE_PIN', os.environ.get('ARIRI_PIN', '1234'))
    app.config['ADMIN_PIN'] = os.environ.get('IDE_ADMIN_PIN', os.environ.get('ARIRI_ADMIN_PIN', '4310'))


def _configure_cors(app):
    """Aplica CORS. ALLOWED_ORIGINS é uma lista separada por vírgula ou '*'."""
    raw = os.environ.get('ALLOWED_ORIGINS', '*')
    if raw == '*':
        CORS(app)
        return
    origins = [o.strip() for o in raw.split(',') if o.strip()]
    CORS(app, resources={r"/api/*": {"origins": origins}}, supports_credentials=False)


# ─── Migrations ───

# Colunas a serem garantidas em tabelas existentes (idempotente).
_PENDING_MIGRATIONS = [
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


def _run_migrations(app):
    """Garante colunas que `db.create_all()` não cria em tabelas pré-existentes."""
    with app.app_context():
        is_postgres = app.config['SQLALCHEMY_DATABASE_URI'].startswith('postgresql')
        for table, column, col_type in _PENDING_MIGRATIONS:
            try:
                if is_postgres:
                    sql = f'ALTER TABLE "{table}" ADD COLUMN IF NOT EXISTS "{column}" {col_type}'
                else:
                    sql = f'ALTER TABLE "{table}" ADD COLUMN "{column}" {col_type}'
                db.session.execute(db.text(sql))
                db.session.commit()
            except Exception:
                db.session.rollback()


# ─── Blueprints ───

# Lista declarativa (módulo, atributo) → registra todos em loop.
_BLUEPRINT_SPECS = [
    ('backend.routes.ping', 'ping_bp'),
    ('backend.routes.pin', 'pin_bp'),
    ('backend.routes.forms', 'forms_bp'),
    ('backend.routes.posts', 'posts_bp'),
    ('backend.routes.receipts', 'receipts_bp'),
    ('backend.routes.volunteers', 'volunteers_bp'),
    ('backend.routes.schedule', 'schedule_bp'),
    ('backend.routes.sync', 'sync_bp'),
    ('backend.routes.admin', 'admin_bp'),
]


def _register_blueprints(app):
    """Registra todos os blueprints listados em _BLUEPRINT_SPECS."""
    import importlib
    for module_path, attr in _BLUEPRINT_SPECS:
        try:
            module = importlib.import_module(module_path)
            app.register_blueprint(getattr(module, attr))
        except ImportError:
            # Blueprint opcional ausente — não falha o boot.
            pass


# ─── Rotas estáticas (frontend + uploads) ───

# Mapeamento path-no-app → subdiretório dentro do FRONTEND_DIR.
_STATIC_DIRS = [
    ('/css/<path:filename>', 'css'),
    ('/js/<path:filename>', 'js'),
    ('/data/<path:filename>', 'data'),
    ('/assets/<path:filename>', 'assets'),
]


def _register_static_routes(app):
    """Configura rotas que servem o frontend estático e os uploads."""

    @app.route('/uploads/<path:filename>')
    def serve_upload(filename):
        return send_from_directory(UPLOADS_DIR, filename)

    @app.route('/')
    @app.route('/index.html')
    def serve_index():
        return send_from_directory(FRONTEND_DIR, 'index.html')

    # Gera dinamicamente as rotas de css/js/data/assets em loop.
    for url_rule, sub_dir in _STATIC_DIRS:
        endpoint = 'serve_' + sub_dir
        target = os.path.join(FRONTEND_DIR, sub_dir)

        def make_handler(directory):
            def handler(filename):
                return send_from_directory(directory, filename)
            return handler

        app.add_url_rule(url_rule, endpoint=endpoint, view_func=make_handler(target))

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
        favicon_path = os.path.join(FRONTEND_DIR, 'favicon.ico')
        if os.path.isfile(favicon_path):
            return send_from_directory(FRONTEND_DIR, 'favicon.ico')
        return ('', 204)


# ─── Application Factory ───

def create_app():
    """Constrói e configura a aplicação Flask."""
    app = Flask(__name__, static_folder=None)

    _configure_database(app)
    db.init_app(app)
    _configure_cors(app)

    os.makedirs(UPLOADS_DIR, exist_ok=True)

    _register_blueprints(app)
    _register_static_routes(app)

    with app.app_context():
        # Importa modelos para que db.create_all() os enxergue.
        try:
            from . import models  # noqa: F401
        except ImportError:
            pass
        db.create_all()
        _run_migrations(app)

    return app


if __name__ == '__main__':
    app = create_app()
    app.run(host='0.0.0.0', port=5000, debug=False)
