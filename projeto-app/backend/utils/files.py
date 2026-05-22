"""Utilidades de arquivo compartilhadas entre rotas."""

import base64

# Mapa de extensão → mime-type. Centraliza a regra que estava espalhada nas rotas.
_MIME_BY_EXT = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
}


def file_to_base64(file_obj):
    """Converte um upload (FileStorage) em data URI base64.

    Retorna None se o arquivo for vazio ou inexistente. Default de mime é jpeg.
    """
    if not file_obj or not file_obj.filename:
        return None

    data = file_obj.read()
    ext = file_obj.filename.rsplit('.', 1)[-1].lower() if '.' in file_obj.filename else 'jpg'
    mime = _MIME_BY_EXT.get(ext, 'image/' + ext)
    return 'data:' + mime + ';base64,' + base64.b64encode(data).decode('utf-8')
