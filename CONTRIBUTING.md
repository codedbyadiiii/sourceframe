# Contributing

Thanks for helping improve CloudSage AI. Keep changes focused and preserve the evidence, privacy, and manual-verification boundaries described in the README.

## Local checks

```bash
.venv/bin/pytest -q backend
npm run build
```

For backend imports/tests, the repository's pytest configuration adds `backend/` to the Python path.

## Contribution guidelines

- Add tests for changes to parsing, masking, citations, model response handling, or verification behavior.
- Never commit `.env`, API keys, real incident logs, or unredacted sample secrets.
- Do not introduce a closed-model fallback or automatically execute proposed changes.
- Keep deterministic checks distinct from model hypotheses, and require exact source validation for citations.
- Note live provider/Docker checks separately from local tests.
