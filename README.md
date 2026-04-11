# DocFlow AI

**AI-powered document processing platform with pipeline automation**

![Python](https://img.shields.io/badge/Python-3.12-3776ab?logo=python&logoColor=white)
![Django](https://img.shields.io/badge/Django-4.2-092e20?logo=django&logoColor=white)
![React](https://img.shields.io/badge/React-18-61dafb?logo=react&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-4169e1?logo=postgresql&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-7-dc382d?logo=redis&logoColor=white)
![Celery](https://img.shields.io/badge/Celery-5-37814a?logo=celery&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ed?logo=docker&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green)

---

## What is DocFlow AI?

DocFlow AI is a multi-tenant SaaS platform that turns unstructured documents into structured, actionable data using AI. Upload any document and let the system do the heavy lifting.

- **Upload any document** — invoices, contracts, reports, or anything else. DocFlow AI accepts PDFs, Word documents, images, and plain text.
- **AI field extraction** — Claude extracts structured fields automatically, assigning a confidence score to every value so you always know how reliable each result is.
- **Configurable pipelines** — build automation pipelines from four stage types: **Extract → Validate → Transform → Deliver**. Drag stages into any order and run them against any document in your workspace.
- **Human-in-the-loop review** — extractions that score below 80% confidence are flagged and routed to a review queue. Reviewers can edit field values inline and approve or reject results before they continue downstream.
- **Real-time updates** — processing progress is pushed to the browser over WebSocket the moment each Celery worker job completes, no polling required.

---

## Screenshots

```
[Dashboard Screenshot]
```
<img width="1470" height="836" alt="Captura de Tela 2026-04-11 às 14 15 00" src="https://github.com/user-attachments/assets/84a886ea-8688-4b5c-9fa0-f714d0a6a223" />

```
[Analytics Screenshot]
```
<img width="1470" height="836" alt="Captura de Tela 2026-04-11 às 14 15 26" src="https://github.com/user-attachments/assets/b6877a59-23b0-4234-a906-ec9de8d47639" />

```
[Pipeline Builder Screenshot]
```
<img width="1470" height="837" alt="Captura de Tela 2026-04-11 às 14 15 12" src="https://github.com/user-attachments/assets/f0b541b7-0759-412a-be2c-a7e1a7813b6b" />

```
[Review Queue Screenshot]
```
<img width="1470" height="835" alt="Captura de Tela 2026-04-11 às 14 23 42" src="https://github.com/user-attachments/assets/2091732a-8187-4738-9d36-09f63b9c5b79" />

---

## Features

| Feature | Details |
|---|---|
| Multi-tenant workspaces | Each user gets an isolated workspace; all data is scoped to workspace membership |
| JWT authentication | Email/password login with short-lived access tokens and refresh tokens |
| Drag-and-drop upload | Drop files directly onto the dashboard; status updates appear in real time |
| AI field extraction | Per-field confidence scores; configurable field lists per pipeline |
| Visual pipeline builder | Drag-and-drop stage composer with Extract, Validate, Transform, and Deliver stages |
| Real-time WebSocket | Processing status pushed to all connected clients in the workspace group |
| Analytics dashboard | Document counts by status, average confidence, and daily processing totals |
| Human review queue | Inline field editing with confidence-coloured inputs; one-click approve or reject |
| REST API | Full CRUD API with JWT auth; Swagger UI available at `/api/docs/` |

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Backend API** | Django 4.2, Django REST Framework, djangorestframework-simplejwt |
| **AI Processing** | Anthropic Claude (claude-sonnet-4), custom pipeline runner |
| **Async workers** | Celery 5, Redis broker |
| **Real-time** | Django Channels, channels-redis, Daphne ASGI server |
| **Database** | PostgreSQL 15 |
| **Frontend** | React 18, Vite, Tailwind CSS, @dnd-kit, Axios |
| **Infrastructure** | Docker Compose, Redis 7 |
| **API docs** | drf-spectacular, Swagger UI |

---

## Quick Start

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and Docker Compose
- [Node.js](https://nodejs.org/) 18+ (for the frontend dev server)

### Steps

**1. Clone the repository**

```bash
git clone https://github.com/your-org/docflow-ai.git
cd docflow-ai
```

**2. Configure environment**

```bash
cp .env.example .env
```

**3. Add your Anthropic API key**

Open `.env` and set:

```
ANTHROPIC_API_KEY=your-anthropic-api-key
```

> The platform ships with a mock AI processor so it works fully without an API key during development. Set `ANTHROPIC_API_KEY` only when you are ready to switch to real extractions.

**4. Start the backend**

```bash
docker compose up --build
```

This starts Django (port 8001), PostgreSQL, Redis, and a Celery worker. Migrations run automatically on first start.

**5. Start the frontend**

```bash
cd frontend
npm install
npm run dev
```

**6. Open the app**

```
http://localhost:3000
```

Register an account, upload a document, and watch it process in real time.

---

## API Overview

All endpoints are prefixed with `/api/v1/`. Authentication uses `Authorization: Bearer <token>`.

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/v1/auth/register/` | Create a new user and workspace |
| `POST` | `/api/v1/auth/token/` | Obtain access + refresh tokens |
| `POST` | `/api/v1/auth/token/refresh/` | Refresh an access token |
| `GET` | `/api/v1/documents/` | List documents in your workspaces |
| `POST` | `/api/v1/documents/` | Upload a new document (multipart) |
| `GET` | `/api/v1/documents/{id}/` | Retrieve a single document |
| `GET` | `/api/v1/pipelines/` | List pipelines |
| `POST` | `/api/v1/pipelines/` | Create a pipeline |
| `POST` | `/api/v1/pipelines/{id}/run/` | Run a pipeline against a document |
| `GET` | `/api/v1/processing-jobs/` | List processing jobs |
| `GET` | `/api/v1/processing-jobs/{id}/` | Retrieve a single job and its results |

**Interactive docs:** [http://localhost:8001/api/docs/](http://localhost:8001/api/docs/)

**WebSocket:**

```
ws://localhost:8001/ws/documents/{workspace_id}/?token={access_token}
```

Connect to receive real-time `job_update` events for every document in your workspace. Send `{"type": "ping"}` to keep the connection alive.

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                   React Frontend                    │
│         (Vite · Tailwind · @dnd-kit · Axios)        │
└──────────────────────┬──────────────────────────────┘
                       │ HTTP / WebSocket
┌──────────────────────▼──────────────────────────────┐
│                  Django / Daphne                    │
│      REST API (DRF)  ·  Channels (WebSocket)        │
└──────┬─────────────────────────┬────────────────────┘
       │                         │
┌──────▼──────┐         ┌────────▼────────┐
│ PostgreSQL  │         │  Redis          │
│  (data)     │         │  (broker +      │
└─────────────┘         │   channel layer)│
                        └────────┬────────┘
                                 │
                        ┌────────▼────────┐
                        │  Celery Worker  │
                        │                 │
                        │  PipelineRunner │
                        │  → Extract      │
                        │  → Validate     │
                        │  → Transform    │
                        │  → Deliver      │
                        │                 │
                        │  AI Processor   │
                        │  (Claude API)   │
                        └─────────────────┘
```

**Request flow for document processing:**

1. Client uploads a file → Django saves it and creates a `Document` record
2. Django enqueues `process_document_task` on Redis via Celery
3. Celery worker picks up the task, runs the pipeline or basic extraction
4. Worker updates `ProcessingJob` and `Document` status in PostgreSQL
5. Worker calls `DocumentConsumer.send_job_update` → Redis channel layer broadcasts to all WebSocket clients in the workspace group
6. Browser receives `job_update` frame and updates the document card without a page refresh

---

## License

MIT © DocFlow AI Contributors
