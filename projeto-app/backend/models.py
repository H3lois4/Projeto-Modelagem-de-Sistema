"""Modelos SQLAlchemy para o IPRA no Ariri."""

from datetime import datetime, timezone, timedelta

from .app import db

# Fuso horário de Brasília (UTC-3)
BRT = timezone(timedelta(hours=-3))


def _now_brt():
    return datetime.now(BRT).replace(tzinfo=None)


class Form(db.Model):
    """Formulário de ação e pessoa atendida."""

    id = db.Column(db.String(36), primary_key=True)  # UUID
    volunteer_name = db.Column(db.String(100), nullable=False)
    actions = db.Column(db.JSON, nullable=False)  # Lista de ações selecionadas
    full_name = db.Column(db.String(200))
    age = db.Column(db.Integer)
    locality = db.Column(db.String(200))
    description = db.Column(db.Text)
    image_path = db.Column(db.String(500))
    image_data = db.Column(db.Text)  # Base64 da imagem (persistente)
    people_served = db.Column(db.Integer, default=1)
    created_at = db.Column(db.DateTime, default=_now_brt)


class Post(db.Model):
    """Postagem do Diário de Bordo."""

    id = db.Column(db.String(36), primary_key=True)
    volunteer_name = db.Column(db.String(100), nullable=False)
    title = db.Column(db.String(300), nullable=False)
    description = db.Column(db.Text)
    image_path = db.Column(db.String(500))
    image_data = db.Column(db.Text)  # Base64 da imagem (persistente)
    created_at = db.Column(db.DateTime, default=_now_brt)


class Receipt(db.Model):
    """Comprovante de prestação de contas."""

    id = db.Column(db.String(36), primary_key=True)
    title = db.Column(db.String(300), nullable=False)
    description = db.Column(db.Text)
    image_path = db.Column(db.String(500))
    image_data = db.Column(db.Text)  # Base64 da imagem (persistente)
    created_at = db.Column(db.DateTime, default=_now_brt)


class Volunteer(db.Model):
    """Dados do voluntário da equipe."""

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    full_name = db.Column(db.String(200), nullable=False)
    rg = db.Column(db.String(20))
    cpf = db.Column(db.String(14))
    birth_date = db.Column(db.Date)
    gender = db.Column(db.String(20))
    profession = db.Column(db.String(100))
    email = db.Column(db.String(200))
    phone = db.Column(db.String(20))
    address = db.Column(db.Text)
    medical_data_path = db.Column(db.String(500))
