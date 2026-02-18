# 🎫 Support Ticket System

A production-ready support ticket system with AI-powered ticket classification using Groq LLM.

## 🚀 Quick Start

### 1. Provide your Groq API Key

Create a `.env` file in the project root:

```bash
cp .env.example .env
```

Edit `.env` and set your key:

```
GROQ_API_KEY=your_groq_api_key_here
```

> **Get a free Groq API key at:** https://console.groq.com

### 2. Run with Docker Compose

```bash
docker-compose up --build
```

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:8000/api/tickets/

That's it. No other setup required.

---

## 🔑 API Key

| Variable | Required | Description |
|---|---|---|
| `GROQ_API_KEY` | Optional* | Enables AI ticket classification |

> *The system works without a key — classification falls back to `general / low` defaults.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Docker Compose                    │
│                                                     │
│  ┌──────────┐    ┌──────────┐    ┌──────────────┐  │
│  │ Frontend │───▶│ Backend  │───▶│  PostgreSQL  │  │
│  │  React   │    │  Django  │    │   (Neon-     │  │
│  │  :3000   │    │  :8000   │    │  compatible) │  │
│  └──────────┘    └────┬─────┘    └──────────────┘  │
│                       │                             │
│                  ┌────▼─────┐                       │
│                  │ Groq LLM │                       │
│                  │  (Groq)  │                       │
│                  └──────────┘                       │
└─────────────────────────────────────────────────────┘
```

### Components

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | React 18 + Vite | SPA with ticket management UI |
| Backend | Django 4.2 + DRF | REST API, business logic |
| Database | PostgreSQL 15 | Persistent storage |
| LLM | Groq (llama3-8b-8192) | Ticket classification |
| Proxy | nginx | Serve frontend + proxy `/api` |

---

## 📡 API Reference

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/tickets/` | Create a ticket |
| `GET` | `/api/tickets/` | List tickets (with filters) |
| `PATCH` | `/api/tickets/<id>/` | Update status/category/priority |
| `GET` | `/api/tickets/stats/` | Aggregated statistics |
| `POST` | `/api/tickets/classify/` | AI-classify a description |

### Filters for `GET /api/tickets/`

```
?category=billing|technical|account|general
?priority=low|medium|high|critical
?status=open|in_progress|resolved|closed
?search=keyword        # searches title + description
```

All filters are combinable.

---

## 🤖 LLM Integration

**Model:** `llama3-8b-8192` via Groq API

**Why Groq?**
- Extremely fast inference (low latency for real-time suggestions)
- Free tier available
- OpenAI-compatible API

**How it works:**
1. User types a ticket description
2. Frontend debounces (700ms) and calls `POST /api/tickets/classify/`
3. Backend sends a structured prompt to Groq
4. Response pre-fills category and priority dropdowns
5. User can override before submitting

**Graceful failure:** If the API key is missing, times out, returns invalid JSON, or hallucinates invalid values, the system returns `{ "suggested_category": "general", "suggested_priority": "low" }` and ticket submission continues normally.

---

## 🗄️ Data Model

```
Ticket
├── title        CharField(max_length=200)
├── description  TextField
├── category     CharField  [billing, technical, account, general]
├── priority     CharField  [low, medium, high, critical]
├── status       CharField  [open, in_progress, resolved, closed]  default=open
└── created_at   DateTimeField(auto_now_add=True)
```

All choices are enforced at the database level via Django `TextChoices`.

---

## 📊 Stats Endpoint

The `/api/tickets/stats/` endpoint uses **pure Django ORM aggregation** — no Python-level loops:

- `Count()` for totals
- `TruncDate` + `Avg` for daily averages
- `values().annotate()` for breakdowns

---

## 📁 Project Structure

```
Support Ticket System/
├── docker-compose.yml
├── .env.example
├── README.md
├── backend/
│   ├── Dockerfile
│   ├── entrypoint.sh          # waits for DB, runs migrations
│   ├── requirements.txt
│   ├── manage.py
│   ├── config/
│   │   ├── settings.py
│   │   ├── urls.py
│   │   └── wsgi.py
│   └── tickets/
│       ├── models.py          # Ticket model
│       ├── serializers.py     # DRF serializers
│       ├── views.py           # All API views
│       ├── filters.py         # DRF FilterSet
│       ├── llm_service.py     # Groq integration
│       ├── urls.py
│       └── migrations/
└── frontend/
    ├── Dockerfile
    ├── nginx.conf             # API proxy + SPA routing
    ├── vite.config.js
    ├── package.json
    └── src/
        ├── App.jsx
        ├── api.js             # Axios service layer
        ├── index.css          # Design system
        └── components/
            ├── TicketForm.jsx     # Create ticket + AI classify
            ├── TicketList.jsx     # List + filter + status update
            └── StatsDashboard.jsx # Stats + charts
```

---

## 🎨 Design Decisions

- **Dark mode first** — reduces eye strain for support agents working long shifts
- **Debounced classify** — 700ms delay prevents excessive API calls while typing
- **Graceful LLM failure** — ticket submission never blocked by LLM unavailability
- **ORM-only stats** — all aggregations happen in the database, not Python
- **nginx proxy** — frontend container proxies `/api` to backend, avoiding CORS in production
- **Healthcheck-based startup** — backend waits for PostgreSQL to be ready before migrating
