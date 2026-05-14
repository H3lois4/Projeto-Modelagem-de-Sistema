"""Script para iniciar o servidor IPRA no Ariri com HTTPS."""
import sys
import os
import ssl

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from generate_cert import generate_cert, CERT_FILE, KEY_FILE
from backend.app import create_app

# Gerar certificado se não existir
generate_cert()

app = create_app()

if __name__ == '__main__':
    # Criar contexto SSL
    context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    context.load_cert_chain(CERT_FILE, KEY_FILE)

    print('\n=== IPRA no Ariri ===')
    print('Acesse no celular: https://<seu-ip>:5000')
    print('Na primeira vez, toque em "Avançado" > "Continuar" no aviso de segurança.')
    print('=====================\n')

    app.run(host='0.0.0.0', port=5000, debug=False, ssl_context=context)
