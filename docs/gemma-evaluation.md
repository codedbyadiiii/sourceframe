# Gemma live evaluation

## Current result

**Not run: no `GEMINI_API_KEY` is configured in this checkout.** Therefore access to the requested `gemma-4-26b-a4b-it` model and live responses for the four cases are not verified. No accuracy or success result is claimed.

The Google Gen AI Python SDK is installed, and the backend's structured JSON response schema is accepted by the installed SDK. That verifies local SDK configuration compatibility only; it does not prove API access or model availability.

## Run when credentials are available

Set `GEMINI_API_KEY` and `GEMMA_MODEL` in the repository-root `.env` file. Keep `.env` local and uncommitted. Then run:

```bash
.venv/bin/python backend/evaluate_gemma.py
```

The evaluator makes one sequential SDK call per case with no application-level retry loop, prints only outcome metadata and a short summary, and does not write raw samples or provider responses to disk. It stops after a quota response. The cases use dummy credentials and cover wrong database port, database-name mismatch, incomplete context, and healthy input. Record the observed output here only after the run; do not replace actual results with expected diagnoses.

## Interpretation limits

- A successful response and source-matched citation demonstrate API behavior and traceability, not causal correctness.
- The healthy case is an input for model evaluation, not a runtime health check.
- A YAML syntax-valid suggestion is not proof of deployment recovery.
- Provider/model availability can depend on the account and may change over time.
