# Phase 4: end-to-end rehearsal

## Result

**Partially rehearsed on 2026-10-13 against merged `main` (`ef93de9`).** Local frontend/backend integration, the explicit synthetic preview workflow, automated UI interactions, and all live Compose health scenarios passed. The real Gemma diagnosis step was intentionally not attempted: the only locally supplied credential had previously been pasted into chat, and a replacement/rotation was not confirmed for this rehearsal. The backend was started without loading the local `.env`; no provider request was made with that exposed credential.

This is not a claim that the complete live-AI user journey passed.

## Observed checks

| Check | Observed result |
| --- | --- |
| Vite dashboard at `http://localhost:5173` | Dev server returned the CloudSage document; browser opened |
| Backend `GET /api/health` | HTTP 200, `{"status":"ok"}` |
| Backend CORS for `http://localhost:5173` | `Access-Control-Allow-Origin` matched the configured frontend origin |
| `POST /api/diagnose` with dummy data and no backend key | HTTP 503 with the expected missing-`GEMINI_API_KEY` message; no saved/demo answer substituted |
| Frontend UI tests | 17 passed across 4 files; includes sample fill without analysis, mocked live API contract and citations, evidence navigation/highlighting, result views, separated manual health comparison, and explicit demo badge |
| Backend and demo tests | 17 passed; two upstream deprecation warnings |
| Production frontend build | Passed |
| Live broken host-port Compose case | HTTP 503, `connection refused` |
| Live corrected Compose case | HTTP 200, database query succeeded |
| Live database-name mismatch | HTTP 503, `database does not exist` |
| Isolated Docker teardown | Passed; no demo listener/container remained |

Live Docker output and sanitized captured logs are recorded in [`docker-demo-verification.md`](docker-demo-verification.md) and `demo/captures/`.

## Complete the remaining live-AI rehearsal

After the exposed key has been rotated in Google AI Studio, set the new key only in the ignored local `.env`. Do not paste it into chat or commit it. Restart the backend with that environment, then:

1. Load **Wrong database port** and click **Diagnose deployment**; verify the top bar says live analysis and reports the model returned by the API.
2. Confirm source citations are marked matched only for backend-validated quotations; click them and inspect the redacted log/Compose lines.
3. Review the proposed diff and syntax status. Apply the change yourself; do not let the demo or UI alter Compose automatically.
4. Start the fixed Compose file, collect fresh logs, record application health as manually passed, and compare the original failure signature separately.
5. Export the incident report and confirm it is redacted and labels the actual model/source.
6. Run `backend/evaluate_gemma.py` for the four provider cases and record actual results. A passing Docker test does not establish model access or diagnosis correctness.

If the provider again returns 500/504, record the live-AI portion as blocked; do not use synthetic preview results as a substitute.

## Local startup for this rehearsal

```bash
cd /Users/adityavishe/cloudsage-ai
.venv/bin/uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000
```

In another terminal:

```bash
cd /Users/adityavishe/cloudsage-ai
npm run dev
```

The backend command above intentionally does not load `.env`. For a live provider call after rotating the credential, follow the secured setup instructions in `README.md`.
