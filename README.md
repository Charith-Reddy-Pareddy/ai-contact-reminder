# AI Contact Reminder

A full-stack relationship-tracking tool. It flags contacts you're overdue to follow up with and drafts an outreach message for you — using a real LLM when an API key is configured, falling back to a template generator otherwise.

**Live demo:** [ai-contact-reminder-1.onrender.com](https://ai-contact-reminder-1.onrender.com) or [charith-reddy-pareddy.github.io/ai-contact-reminder](https://charith-reddy-pareddy.github.io/ai-contact-reminder/)
**API:** [ai-contact-reminder-backend.onrender.com](https://ai-contact-reminder-backend.onrender.com)

> The backend runs on Render's free tier and spins down after inactivity. The first request after a period of idleness can take 30–50 seconds while it wakes up — the UI shows a loading state during this time rather than an empty list. The GitHub Pages copy of the frontend is deployed automatically on every push to `main` (see `.github/workflows/deploy-pages.yml`) and points at the same Render backend, so both demos share the same live data.

---

## Features

- **CRUD contact management** — add, edit, delete, and search contacts (name, email, company, last contact date, notes)
- **Follow-up recommendations** — contacts not touched in 30+ days, or tagged `mentor` / `investor` / `advisor` / `friend` in their notes, are surfaced and ranked by priority keyword then recency
- **AI-drafted outreach messages** — given a contact, relationship type, and topic, generates a short follow-up message via OpenAI (`gpt-4o-mini`); if no API key is set or the call fails, a template-based generator produces a message instead so the feature always works

## Tech stack

| | |
|---|---|
| Frontend | React 18, Vite |
| Backend | Node.js, Express |
| AI | OpenAI API (`gpt-4o-mini`), with a local fallback generator |
| Storage | JSON file on disk |
| Deployment | Render (static site + web service) |

---

## Running locally

**Backend**

```bash
cd backend
npm install
cp .env.example .env   # optionally add OPENAI_API_KEY for real AI generation
npm run dev
```

Runs at `http://localhost:4000`.

**Frontend** (new terminal)

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Runs at `http://localhost:5173`.

Without an `OPENAI_API_KEY`, message generation still works — it just uses the fallback template generator instead of a real LLM call.

**Tests**

```bash
cd backend
npm test
```

Runs the `node:test` suite covering contact validation and recommendation scoring — no extra dependencies required.

---

## Project structure

```
backend/
  server.js                    Express app, routes, error handling
  utils/
    fileStore.js                Read/write contacts.json
    recommendationService.js    Follow-up scoring and sorting
    messageService.js           OpenAI call + fallback generator
    validation.js               Contact validation and normalization
  test/                         node:test unit tests
  contacts.json                 Data store

frontend/
  src/
    App.jsx                     State, data fetching, layout
    components/
      ContactList.jsx
      ContactForm.jsx
      ContactProfile.jsx
      RecommendationPanel.jsx
      MessageGenerator.jsx
```

## API

| Method | Route | |
|---|---|---|
| GET | `/contacts` | List all contacts |
| POST | `/contacts` | Create a contact |
| PUT | `/contacts/:id` | Update a contact |
| DELETE | `/contacts/:id` | Delete a contact |
| GET | `/recommendations` | Contacts due for follow-up, ranked |
| POST | `/generate-message` | Draft an outreach message |

---

## Known limitations

This is a portfolio prototype, not a production CRM:

- **Storage isn't durable.** Contacts live in a JSON file on the backend's disk. Render's free tier uses an ephemeral filesystem, so data can be lost on redeploy or restart. A real deployment would use Postgres/SQLite with a persistent volume.
- **No authentication.** Anyone with the API URL can read, edit, or delete all contacts.
- **Recommendation logic is keyword-based, not ML.** "Priority" comes from matching words like `mentor` or `investor` in the notes field, not from any learned model.
- **Single user, no multi-tenancy.**

## Possible next steps

- Swap the JSON file for a real database with a persistent volume
- Add authentication and per-user contact lists
- Move recommendation scoring to something more robust than keyword matching

---

## Environment variables

**Backend** (`backend/.env`, see `.env.example`)

| Variable | Required | Purpose |
|---|---|---|
| `OPENAI_API_KEY` | No | Enables real LLM message generation. Omit to use the fallback generator. |
| `PORT` | No | Defaults to `4000`. |
| `FRONTEND_ORIGIN` | No | Restricts CORS to a specific origin. Defaults to `*`. |

**Frontend** (`frontend/.env`, see `.env.example`)

| Variable | Required | Purpose |
|---|---|---|
| `VITE_API_BASE_URL` | No | Backend URL. Defaults to `http://localhost:4000`. |
