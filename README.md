# Ide

Aplicação web _offline-first_ para registro de ações, postagens, comprovantes e dados de equipe, desenvolvida como trabalho final da disciplina de Modelagem de Sistemas.

- **Frontend** (Vercel): https://projeto-modelagem-de-sistema.vercel.app
- **Backend** (Render): https://ide-backend-wfoy.onrender.com

---

## Arquitetura

A aplicação adota uma **arquitetura cliente-servidor em duas camadas físicas (frontend e backend)**, com **camadas lógicas separadas dentro de cada lado** e **persistência relacional em PostgreSQL**. A comunicação entre cliente e servidor é feita por **API REST sobre HTTP** (JSON e `multipart/form-data`).

### Visão geral

```
┌─────────────────────────────────────────────┐
│  CLIENTE — SPA (Vercel)                     │
│  HTML + CSS + JavaScript (vanilla)          │
│  IndexedDB (cache local) + Service Worker   │
└──────────────────┬──────────────────────────┘
                   │ HTTP / JSON / multipart
                   │ rewrite Vercel → Render
┌──────────────────▼──────────────────────────┐
│  SERVIDOR — API REST (Render)               │
│  Flask + Blueprints + SQLAlchemy ORM        │
└──────────────────┬──────────────────────────┘
                   │ SQL
┌──────────────────▼──────────────────────────┐
│  BANCO — PostgreSQL (Render)                │
└─────────────────────────────────────────────┘
```

### Camadas lógicas no backend

#### Padrão arquitetural

O backend segue uma **Arquitetura em Camadas (_Layered Architecture_)** simplificada em duas camadas lógicas, no estilo **API REST com _Blueprint per feature_** característico de aplicações Flask. Pode ser descrito também como **"thin server" REST**, em que cada _handler_ é um ponto de entrada HTTP que delega persistência diretamente ao ORM, sem uma camada de serviço intermediária.

Características do padrão:

- **Separação por responsabilidade técnica**: cada arquivo cuida de uma fatia bem definida (configuração, modelos, rotas).
- **Modularização horizontal por recurso (_feature_)**: cada recurso da API tem o seu próprio _Blueprint_ em `routes/`, isolando endpoints e dependências por contexto de negócio.
- **ORM como abstração de persistência**: SQLAlchemy expõe os modelos como classes; as rotas operam sobre `db.session` diretamente. Não há camada DAO/_Repository_.
- **_App Factory_ + WSGI**: a aplicação é construída por uma função `create_app()` (padrão recomendado pelo Flask) e exposta ao `gunicorn` por um módulo WSGI separado.

#### Estrutura de pastas

```
projeto-app/backend/
├── app.py          ← bootstrap da aplicação, configuração, CORS, migrations
├── models.py       ← camada de Domínio/Persistência (modelos SQLAlchemy)
├── routes/         ← camada de Apresentação/API (handlers HTTP por recurso)
│   ├── forms.py
│   ├── posts.py
│   ├── receipts.py
│   ├── volunteers.py
│   ├── schedule.py
│   ├── sync.py
│   ├── pin.py
│   └── ping.py
└── uploads/        ← (placeholder) uploads transitórios
```

- **Apresentação/API** (`routes/*.py`): cada arquivo é um Flask `Blueprint` que expõe os endpoints de um recurso (`/api/forms`, `/api/posts`, etc.). Recebe a requisição HTTP, valida os campos e devolve JSON.
- **Persistência/Domínio** (`models.py`): modelos SQLAlchemy (`Form`, `Post`, `Receipt`, `Volunteer`) que mapeiam tabelas do PostgreSQL. As rotas falam diretamente com o ORM via `db.session`.
- **Configuração e bootstrap** (`app.py`): factory `create_app()`, leitura de variáveis de ambiente (`DATABASE_URL`, PINs, `ALLOWED_ORIGINS`), CORS, registro de blueprints e migrations idempotentes (`ALTER TABLE ... ADD COLUMN IF NOT EXISTS` em PostgreSQL).
- **Entry point WSGI** (`projeto-app/wsgi.py`): expõe `app = create_app()` para o `gunicorn` em produção (Render).

### Camadas lógicas no frontend

#### Padrão arquitetural

O frontend é uma **SPA (_Single Page Application_) modular**, organizada por _feature_ e construída sem _framework_ (apenas JavaScript _vanilla_). É também uma **PWA _offline-first_**: combina um Service Worker com um cache local (IndexedDB) para que a aplicação funcione mesmo sem rede e sincronize quando o backend ficar acessível.

Características do padrão:

- **SPA com _hash-based routing_** (`app.js`): a URL muda apenas o _hash_ (`#/forms`, `#/diary`, etc.) e o roteador troca a tela renderizada no DOM, sem recarregar a página.
- **Modularização por tela (_feature_)**: cada arquivo em `js/pages/*.js` é responsável por uma página, expondo uma função `window.render<Nome>Page(container)` que o roteador chama.
- **Camada de dados em duas frentes**:
  - cache local em IndexedDB (`db.js`) para armazenar itens criados offline (`pending_forms`, `pending_posts`, `pending_receipts`);
  - chamadas HTTP via `fetch` para a API REST, com _base URL_ resolvida por `Sync.getServerUrl()`.
- **Sincronização eventual** (`sync.js`): _polling_ a cada 30 s no `/api/ping`. Quando o backend responde, envia tudo que está pendente em ordem cronológica via `POST /api/sync` e marca como sincronizado.
- **PWA** (`manifest.json` + `sw.js`): instalável em dispositivos móveis, com Service Worker fazendo cache do _shell_ da aplicação e de respostas idempotentes da API.

#### Estrutura de pastas

```
projeto-app/frontend/
├── index.html
├── manifest.json    ← PWA
├── sw.js            ← Service Worker (cache de páginas e API)
├── vercel.json      ← rewrite de /api e /uploads para o backend
├── css/
│   └── style.css
└── js/
    ├── app.js       ← roteador SPA (hash-based) e tela de identificação
    ├── config.js    ← API_BASE_URL e configurações de runtime
    ├── db.js        ← acesso ao IndexedDB (cache local offline)
    ├── sync.js      ← sincronização com o servidor (poll a cada 30s)
    ├── resize.js    ← utilitário de compressão de imagem
    └── pages/       ← módulos por tela (forms, diary, accounts, team, etc.)
```

- **Roteamento e bootstrap de UI** (`app.js`): roteador SPA baseado em _hash_, controle de identificação do voluntário e renderização das telas iniciais (splash e identificação).
- **Apresentação por página** (`js/pages/*.js`): cada arquivo é responsável por renderizar uma tela e tratar seus eventos. Padrão modular por _feature_.
- **Acesso a dados** dividido em duas frentes:
  - **Cache local (IndexedDB)** via `db.js`, com _stores_ `pending_forms`, `pending_posts` e `pending_receipts` para suportar uso offline.
  - **API remota** via `fetch` direto, com _base URL_ resolvida por `Sync.getServerUrl()` (lê de `localStorage` ou de `window.API_BASE_URL`).
- **Sincronização** (`sync.js`): faz _polling_ do `/api/ping` a cada 30s. Quando o backend está alcançável, envia os itens pendentes do IndexedDB em ordem cronológica via `POST /api/sync` e marca como sincronizados.
- **PWA** (`manifest.json` + `sw.js`): permite instalar a aplicação no celular e funcionar offline. O Service Worker cacheia o _shell_ da aplicação e respostas de leitura.

### Modelo de dados

Quatro entidades principais, todas com `created_at` em horário de Brasília:

| Entidade   | Chave        | Campos relevantes                                                              |
|------------|--------------|--------------------------------------------------------------------------------|
| `Form`     | UUID (`id`)  | `volunteer_name`, `actions` (JSON), `full_name`, `age`, `locality`, `description`, `image_data` (base64), `people_served` |
| `Post`     | UUID (`id`)  | `volunteer_name`, `title`, `description`, `image_data`                         |
| `Receipt`  | UUID (`id`)  | `title`, `description`, `image_data`                                           |
| `Volunteer`| inteiro auto | `full_name`, `rg`, `cpf`, `birth_date`, `gender`, `profession`, `email`, `phone`, `address`, `medical_data_path` |

As imagens são persistidas como **base64 dentro do banco** (campo `image_data`). Essa decisão simplifica o _deploy_ no plano gratuito do Render, cujo sistema de arquivos é efêmero (qualquer arquivo gravado em `uploads/` se perde a cada redeploy).

### Comunicação cliente ↔ servidor

A API segue o estilo **REST**, organizada por recurso:

| Recurso       | Endpoints principais                                            |
|---------------|------------------------------------------------------------------|
| Formulários   | `GET /api/forms`, `POST /api/forms`                              |
| Postagens     | `GET /api/posts`, `POST /api/posts`, `DELETE /api/posts/<id>`    |
| Comprovantes  | `GET /api/receipts`, `POST /api/receipts`, `DELETE /api/receipts/<id>` |
| Voluntários   | `GET /api/volunteers`, `GET /api/volunteers/<id>`                |
| Cronograma    | `GET /api/schedule`                                              |
| Sincronização | `POST /api/sync`, `GET /api/ping`                                |
| Autenticação  | `POST /api/verify-pin`, `POST /api/verify-admin-pin`             |
| Manutenção    | `POST /api/clear/<tabela>`, `POST /api/reset-all`                |

A integração entre **Vercel** (frontend) e **Render** (backend) usa um _rewrite_ no `vercel.json` que reescreve `/api/*` e `/uploads/*` para o domínio do backend. Isso elimina configuração de CORS e mantém o frontend chamando endpoints em mesma origem.

### Estilos arquiteturais aplicados

Além da divisão em camadas, o sistema combina os seguintes estilos:

- **Cliente-servidor** com fronteira de rede definida (HTTP/JSON).
- **REST**: recursos identificáveis por URL e operações via verbos HTTP.
- **SPA (Single Page Application)** com roteamento _hash-based_.
- **PWA / offline-first**: Service Worker e cache local (IndexedDB) com sincronização eventual.
- **Organização modular por _feature_**: tanto `routes/` no backend quanto `pages/` no frontend são divididos por funcionalidade.

### Por que não é uma "multicamadas clássica"

A arquitetura multicamadas tradicional (_n-tier_) define **três ou mais camadas lógicas com separação rígida**, geralmente:

1. **Apresentação** (_controllers_ e _views_)
2. **Aplicação/Negócio** (camada de _services_ com regras de negócio isoladas)
3. **Persistência** (camada de _repositories_/DAO que abstraem o ORM)

No nosso projeto:

- A **camada de serviço/negócio não existe separadamente**: a lógica de validação, conversão de imagem em base64 e montagem do payload acontece dentro do próprio _handler_ de rota.
- A **camada de persistência não tem _repository_/DAO**: as rotas chamam o ORM SQLAlchemy diretamente (`db.session.add`, `Model.query`).

Essa simplificação é uma escolha pragmática para um sistema de pequeno porte com poucas regras de negócio. Em uma evolução futura, valeria extrair `services/` e `repositories/` para isolar regras e facilitar testes unitários.

---

## _Stack_

**Frontend**
- HTML, CSS e JavaScript _vanilla_
- IndexedDB (cache local) e Service Worker (PWA)
- _Hosting_: Vercel (estático)

**Backend**
- Python 3.11
- Flask, Flask-CORS, Flask-SQLAlchemy
- gunicorn (WSGI)
- _Hosting_: Render (Web Service)

**Banco de dados**
- PostgreSQL (Render)
- Driver: `psycopg2-binary`
- Em desenvolvimento local, _fallback_ para SQLite (`ide.db`)

---

## Execução local

```cmd
cd projeto-app
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python run.py
```

A aplicação fica disponível em http://localhost:5000.

## Variáveis de ambiente (produção)

| Variável            | Descrição                                                       |
|---------------------|------------------------------------------------------------------|
| `DATABASE_URL`      | URL de conexão do PostgreSQL (Render).                           |
| `IDE_PIN`           | PIN de acesso comum (fallback: `ARIRI_PIN`, default `1234`).     |
| `IDE_ADMIN_PIN`     | PIN administrativo (fallback: `ARIRI_ADMIN_PIN`, default `4310`).|
| `ALLOWED_ORIGINS`   | Domínio do frontend autorizado (CORS), separado por vírgula.     |
| `PYTHON_VERSION`    | Versão do Python no Render (recomendado `3.11.9`).               |
