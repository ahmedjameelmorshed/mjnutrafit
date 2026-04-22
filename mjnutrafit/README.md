# MJNutraFit

Full‑stack fitness + nutrition coaching app:

- **Frontend**: React + Vite (`mjnutrafit-frontend`)
- **Backend**: Node.js + Express + Sequelize + Postgres (`mjnutrafit-backend`)
- **AI Coach**: FastAPI + LangGraph/LangChain + Gemini (`mjnutrafit-ai`)

---

## Prerequisites

- **Node.js**: any stable 20+ version
- **npm**: comes with Node (lockfiles are `package-lock.json`)
- **Python**: **3.11+** (AI service is known-good with **Python 3.11**)
- **Postgres**:
  - Local Postgres (e.g. `localhost:5432`) **or**
  - Hosted Postgres (e.g. Neon) via `DATABASE_URL`
- **Cloudinary** account (optional but required for profile picture upload)
- **Gemini API key** (required for AI coach responses)

---

## Install (after cloning)

From the repo root: 

### 1) Use the pinned Node version

```bash
nvm install
nvm use
node -v
```

Expected: `v24.13.0`

### 2) Backend install

```bash
cd mjnutrafit-backend
cp .env.example .env
npm ci
```

### 3) Frontend install

```bash
cd ../mjnutrafit-frontend
cp .env.example .env
npm ci
```

### 4) AI install (Python)

```bash
cd ../mjnutrafit-ai
cp .env.example .env
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

---

## Configure environment variables

### Backend (`mjnutrafit-backend/.env`)

Start from `mjnutrafit-backend/.env.example`.

Minimum required for a working local setup:

- **Server**
  - `PORT=3000`
  - `NODE_ENV=development`
- **JWT**
  - `JWT_SECRET=...`
  - `REFRESH_TOKEN_SECRET=...`
- **Database** (choose one)
  - **Option A (recommended for hosted DB)**: `DATABASE_URL=postgresql://...`
  - **Option B (local Postgres)**:
    - `DB_HOST=localhost`
    - `DB_PORT=5432`
    - `DB_USERNAME=postgres`
    - `DB_PASSWORD=...`
    - `DB_NAME=mjnutrafit`
- **AI service proxy**
  - `AI_SERVICE_URL=http://localhost:8000`
- **Cloudinary** (only required for image upload)
  - `CLOUDINARY_CLOUD_NAME=...`
  - `CLOUDINARY_API_KEY=...`
  - `CLOUDINARY_API_SECRET=...`

### Frontend (`mjnutrafit-frontend/.env`)

Start from `mjnutrafit-frontend/.env.example`.

- `VITE_API_BASE_URL=http://localhost:3000/api`

### AI (`mjnutrafit-ai/.env`)

Start from `mjnutrafit-ai/.env.example`.

- **Required**
  - `GEMINI_API_KEY=...`
- **Ports / routing**
  - `MJNUTRAFIT_AI_PORT=8000`
  - `BACKEND_URL=http://localhost:3000`
- **Model**
  - `GEMINI_MODEL=gemini-2.5-flash`

---

## Run the apps

### Run Backend (BE)

```bash
cd mjnutrafit-backend
nvm use
npm run dev
```

- **URL**: `http://localhost:3000`
- **API base**: `http://localhost:3000/api`

The backend auto-initializes Sequelize and attempts `sync({ alter: true })` at startup, so a valid Postgres connection is required for most features.

### Run AI Coach (AI)

```bash
cd mjnutrafit-ai
source venv/bin/activate
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

- **URL**: `http://localhost:8000`
- **Health**: `GET /health`
- **Chat**: `POST /chat`

Notes:
- The AI service requires `GEMINI_API_KEY`.
- The AI service calls the backend to fetch live user context using the **same bearer token** the frontend uses.

### Run Frontend (FE)

```bash
cd mjnutrafit-frontend
nvm use
npm run dev
```

By default, Vite is configured to run on **port 8080**.

- **URL**: `http://localhost:8080`

---

## How it works (high level)

### Authentication

- Frontend logs in/registers via backend and stores the returned **JWT** in `localStorage` as `token`.
- Frontend sends requests with `Authorization: Bearer <token>`.
- Backend validates the token and loads `req.user` from Postgres.

### API surfaces

Backend mounts these routers under `/api`:

- **Users**: `/api/users/*` (register, login, profile, current user, client profile)
- **Auth**: `/api/auth/refresh-token`
- **Plans**: `/api/plans/*`
- **Progress**: `/api/progress/*`
- **Coach**: `/api/coach/*`
- **Dashboard**: `/api/dashboard/*`
- **AI coach proxy**: `/api/ai-coach/chat`

### AI Coach flow

1. Frontend calls backend: `POST /api/ai-coach/chat`
2. Backend proxies to the Python AI service: `POST {AI_SERVICE_URL}/chat` and forwards the `Authorization` header
3. AI service fetches the user’s dashboard + progress context from backend, builds a prompt, and calls Gemini

---

## Common troubleshooting

### Backend returns 404 on `/`

That’s expected: the backend only exposes routes under `/api/*`.

### Backend can’t connect to Postgres

- Confirm your `.env` DB settings (either `DATABASE_URL` **or** `DB_HOST/DB_*`).
- Confirm Postgres is reachable and the DB exists.

### AI Coach says `GEMINI_API_KEY not configured`

Set `GEMINI_API_KEY` in `mjnutrafit-ai/.env` and restart the AI server.

### CORS / cookie issues

Backend CORS allows local origins like:
- `http://localhost:8080` (Vite default in this repo)
- `http://localhost:5173` (common Vite default)
- `http://localhost:3000`

If you run FE on a different port, update backend CORS in `mjnutrafit-backend/src/app.js`.

---

## Project structure

```text
mjnutrafit/
  mjnutrafit-frontend/   # React app (Vite)
  mjnutrafit-backend/    # Express API (Sequelize/Postgres)
  mjnutrafit-ai/         # FastAPI AI Coach (Gemini)
```

