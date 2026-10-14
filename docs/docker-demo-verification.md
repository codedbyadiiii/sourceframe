# Live Docker demo verification

## Observed run

Verified on 2026-10-13 using Docker Engine 29.6.2 and the checked-in Compose files. `python3 demo/verify_compose.py` ran all cases sequentially, checked each Compose file, waited for the app HTTP server, queried `/health`, printed the captured app logs, and tore down each uniquely named Compose project.

| Case | Relevant configuration | Observed `/health` | Result |
| --- | --- | --- | --- |
| Broken host port | App connects to `db:15432`; database publishes `15432:5432` | HTTP 503, `connection refused` | Passed: intended failure reproduced |
| Corrected port | App connects to `db:5432`; database publishes `15432:5432` | HTTP 200, `{"status":"healthy","database":"query succeeded"}` | Passed: database query succeeded |
| Database-name mismatch | App requests `inventory`; Postgres initializes `catalog` | HTTP 503, `database does not exist` | Passed: intended failure reproduced |

The captured app logs included `connection refused` for the port mismatch and `database does not exist` for the name mismatch. Sanitized live captures are committed under [`demo/captures/`](../demo/captures/). The demo app reports only sanitized diagnostic categories; it does not log database credentials, host addresses, or raw driver messages.

## Reproduce

```bash
python3 demo/verify_compose.py
```

The script uses a per-run Compose project name, stops on an unexpected result, tears down each scenario with `down -v --remove-orphans`, and verifies the project has no remaining containers. It uses only dummy Compose credentials. This is a live test of the sample application/configurations, not evidence that a separate user deployment has recovered.
