# CloudSage AI

**Diagnose deployment failures with evidence.** CloudSage connects application logs to Docker Compose configuration, asks Gemma for a structured investigation, validates each source citation against the submitted text, and presents proposed changes for a human to review and apply.

CloudSage does not guarantee that a diagnosis or proposed change is correct. Matching citations show traceability, not causality. It sends best-effort redacted content to a hosted Google model and requires internet access.

## Architecture

- `src/`: React, TypeScript, and Vite dashboard; inputs and incident state remain in browser memory.
- `backend/app/`: FastAPI, Pydantic, PyYAML `safe_load`, Compose fact extraction and deterministic checks, redaction, Google Gen AI SDK.
- `demo/`: PostgreSQL-backed sample application and deliberately broken/corrected Compose cases.
- No database or persistent log storage for CloudSage itself.

## Prerequisites

- Python 3.11+ (tested here with Python 3.14)
- Node.js 20+ and npm
- Docker Desktop for the live Compose demonstration
- Google AI Studio API key with access to a compatible Gemma model for live analysis

## Setup

```bash
git clone <your-cloudsage-repo-url>
cd cloudsage-ai
cp .env.example .env
# Edit .env locally; never commit it or paste your API key into a chat.
python3 -m venv .venv
.venv/bin/pip install -r backend/requirements.txt
npm install
```

Set `GEMINI_API_KEY` and `GEMMA_MODEL` in the root `.env`. Load those variables into the backend process using your shell's environment loader, for example:

```bash
set -a
source .env
set +a
cd backend
../.venv/bin/uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

In another terminal:

```bash
cd cloudsage-ai
npm run dev
```

Open <http://localhost:5173>. The frontend contacts `http://localhost:8000` by default. Configure `VITE_API_BASE_URL` in the root `.env` before starting Vite to change the API origin; the existing `VITE_API_URL` name is retained as a fallback. The Settings view can also apply a temporary in-memory API URL for the current tab. Backend CORS allows only `FRONTEND_ORIGIN` (default `http://localhost:5173`).

## Model configuration and status

- `GEMINI_API_KEY`: server-side only; never sent to the frontend or included in API responses.
- `GEMMA_MODEL`: defaults to the requested `gemma-4-26b-a4b-it`.
- Backend uses the Google Gen AI Python SDK (`google-genai`); the SDK package and structured JSON schema configuration install successfully.
- **Live availability/access to the requested model has not been verified:** no API key is configured in this environment. Availability depends on Google API support and the account's model access. CloudSage does not silently substitute another provider or model. If the model is not available to your key, set `GEMMA_MODEL` to a Gemma model your account can access.
- Provider calls have a 30-second SDK timeout, no application-level retry loop, and clear quota/unavailable/network/malformed-output responses. No saved diagnosis is substituted for a failed live request.
- To run the sequential, four-case live evaluation when credentials are available, see [`docs/gemma-evaluation.md`](docs/gemma-evaluation.md). It makes no retries and does not save raw sample inputs or outputs.

## Demo walkthrough commands

Docker must be running. The cases use dummy credentials and a dedicated Compose project name so teardown is isolated.

Run all three cases, wait for the app to start, capture its actual logs, verify expected HTTP statuses, and tear down each isolated project with:

```bash
python3 demo/verify_compose.py
```

The runner expects HTTP 503 for each broken case and HTTP 200 for the corrected case; it exits nonzero if a live result differs.

```bash
# Broken case: the app uses the host-published port from inside the Compose network.
docker compose -p cloudsage-demo -f demo/compose.host-port.broken.yaml up --build -d
curl -i http://localhost:8080/health
docker compose -p cloudsage-demo -f demo/compose.host-port.broken.yaml logs app
docker compose -p cloudsage-demo -f demo/compose.host-port.broken.yaml down -v

# Corrected case: app connects to service `db` on its container port 5432.
docker compose -p cloudsage-demo -f demo/compose.host-port.fixed.yaml up --build -d
curl -i http://localhost:8080/health
docker compose -p cloudsage-demo -f demo/compose.host-port.fixed.yaml down -v

# Second incident: the app requests inventory, while Postgres initializes catalog.
docker compose -p cloudsage-demo -f demo/compose.database-name.broken.yaml up --build -d
curl -i http://localhost:8080/health
docker compose -p cloudsage-demo -f demo/compose.database-name.broken.yaml logs app
docker compose -p cloudsage-demo -f demo/compose.database-name.broken.yaml down -v
```

The application waits briefly for startup, but its `/health` endpoint itself tests `SELECT 1` and returns HTTP 503 if the database query fails. Compose dependency readiness checks avoid startup timing obscuring the intended issue. Confirm health with `curl` after startup rather than inferring recovery from quiet logs.

If Docker is unavailable, the labeled host-port sample and other dashboard samples remain usable as **fixtures**; fixture text is not live runtime evidence.

The checked-in broken/fixed Docker demo and database-name mismatch were live-tested with Docker Engine 29.6.2; observed HTTP results and scope are recorded in [`docs/docker-demo-verification.md`](docs/docker-demo-verification.md). This verifies only the demo stack.

The merged frontend/backend rehearsal and remaining live-AI blocker are recorded in [`docs/end-to-end-rehearsal.md`](docs/end-to-end-rehearsal.md).

## Checks

```bash
.venv/bin/pytest -q backend demo/app/test_diagnostics.py
npm run test
npm run build
```

Tests use dummy provider credentials only in mocked calls; they never send secrets to Google.

## How evidence and safety work

- Logs and Compose input are limited to 100 KB per field, YAML is parsed with `yaml.safe_load`, and no uploaded content is executed.
- Common `password`, `token`, `api_key`, bearer-token, and URL-password forms are masked before the provider request. This is best-effort, not comprehensive. The editor displays the returned redacted text after analysis.
- Source line numbers are assigned before model submission. Every citation must quote the exact corresponding span of redacted input; unsupported or out-of-range citations reject the response.
- Findings separate observed facts from AI hypotheses. Deterministic checks are shown separately from model interpretation. Custom container ports are valid; host-published ports should not be presumed to be internal ports.
- Proposed YAML receives a syntax check only. CloudSage never applies changes, executes suggested commands, or performs arbitrary URL health checks.
- Verification compares the fresh logs with the exact original log evidence and reports app health separately as a manually supplied result. “Not observed” does not mean healthy.

## Limitations and status

- Live Gemma response evaluation on the four sample cases remains unverified until a usable key/model is configured.
- Docker daemon availability and live broken/fixed application behavior remain unverified in environments where Docker is not running.
- Secret masking is heuristic; review/redact sensitive content before sending it to any hosted service.
- Model-generated changes are suggestions and may be incomplete or wrong. Review them, preserve your original files, and independently verify application health.
- Current Compose fact extraction supports common environment map/list forms, short/long port syntax, explicit dependencies, and common DB host/name/port fields. It does not implement full Compose interpolation or runtime environment resolution.

## Three-minute demo script

1. **0:00–0:25 — Set context:** Open the app, point out that logs/config are browser-session inputs and that Gemma analysis is hosted and redacted best-effort.
2. **0:25–1:00 — Break it:** Start the `demo/compose.host-port.broken.yaml` stack. Show `/health` returning 503 and the app container's connection error. Load the matching labeled fixture (or paste the captured live logs and Compose).
3. **1:00–1:45 — Diagnose:** Click **Diagnose deployment**. Walk through the observed log line, the Compose port mapping, the deterministic host-port mismatch check, and the model's separately labeled hypothesis. Click citations to highlight exact source lines.
4. **1:45–2:15 — Review the fix:** Read the proposed before/after diff. Note that YAML syntax validation is distinct from runtime validation. Copy the safe suggestion and manually change `DB_PORT` to `5432` in the corrected demo Compose file.
5. **2:15–2:45 — Verify:** Restart with the fixed Compose file, confirm `/health` returns 200, paste fresh logs, record health as manually passed, and compare. Explain that error-not-observed alone would not establish health.
6. **2:45–3:00 — Wrap:** Mention the separate database-name incident and limitations; do not claim correctness from one case.

## License

Application code is MIT-licensed; see [LICENSE](LICENSE). Google Gen AI, Gemma model, and other service/model terms are separate.
