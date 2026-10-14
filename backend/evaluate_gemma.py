"""Run sequential, live Gemma checks over four safe sample incidents.

This deliberately does not save raw inputs or responses. It prints only case
labels, returned status/model, verified citation counts, syntax-validation
counts, and sanitized provider errors.
"""

import asyncio
import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import HTTPException

from app.analyzer import diagnose
from app.models import DiagnoseRequest

load_dotenv(Path(__file__).resolve().parents[1] / ".env", override=False)

CASES = [
    (
        "wrong database port",
        "Starting app\nDatabase connection failed: dial tcp db:5433: connection refused",
        """services:
  app:
    image: example/app
    environment:
      DB_HOST: db
      DB_PORT: "5433"
      DB_NAME: demo
      DB_USER: demo
      DB_PASSWORD: demo-only
    depends_on:
      db:
        condition: service_healthy
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: demo
      POSTGRES_USER: demo
      POSTGRES_PASSWORD: demo-only
    ports:
      - "5433:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U demo -d demo"]
      interval: 2s
      timeout: 2s
      retries: 10
""",
    ),
    (
        "database name mismatch",
        'Database connection established\nFATAL: database "inventory" does not exist',
        """services:
  app:
    image: example/app
    environment:
      DB_HOST: db
      DB_PORT: "5432"
      DB_NAME: inventory
      DB_USER: demo
      DB_PASSWORD: demo-only
    depends_on:
      db:
        condition: service_healthy
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: catalog
      POSTGRES_USER: demo
      POSTGRES_PASSWORD: demo-only
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U demo -d catalog"]
      interval: 2s
      timeout: 2s
      retries: 10
""",
    ),
    (
        "incomplete context",
        "ERROR: connection failed\nRetrying...",
        "services:\n  app:\n    image: example/app:latest\n",
    ),
    (
        "healthy input",
        "GET /health 200 OK\nDatabase query succeeded",
        """services:
  app:
    image: example/app
    environment:
      DB_HOST: db
      DB_PORT: "5432"
      DB_NAME: demo
      DB_USER: demo
      DB_PASSWORD: demo-only
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: demo
      POSTGRES_USER: demo
      POSTGRES_PASSWORD: demo-only
    ports:
      - "5433:5432"
""",
    ),
]


async def run() -> int:
    if not os.getenv("GEMINI_API_KEY"):
        print("NOT RUN: GEMINI_API_KEY is not configured in the environment or root .env file.")
        return 2

    print(f"Live model evaluation requested: {os.getenv('GEMMA_MODEL', 'gemma-4-26b-a4b-it')}")
    print("Inputs use dummy demo credentials. One sequential SDK call per case; no application-level retries; no results are saved.")
    failed = False
    for name, logs, compose in CASES:
        try:
            result = await diagnose(DiagnoseRequest(logs=logs, compose=compose))
        except HTTPException as error:
            failed = True
            print(f"\n{name}: REQUEST FAILED ({error.status_code}) — {error.detail}")
            if error.status_code == 429:
                print("Stopping after quota/rate-limit response; no retries were made.")
                break
            continue
        citation_count = sum(len(finding.evidence) for finding in result.findings)
        matched_count = sum(
            len(finding.evidence) for finding in result.findings if finding.source_matched
        )
        valid_changes = sum(change.yaml_valid for change in result.proposed_changes)
        print(f"\n{name}")
        print(f"  status: {result.status}")
        print(f"  model returned: {result.model_identifier}")
        print(f"  validated source citations: {matched_count}/{citation_count}")
        print(f"  YAML syntax-valid proposals: {valid_changes}/{len(result.proposed_changes)}")
        print(f"  missing-information items: {len(result.missing_information)}")
        print("  summary: " + result.summary.replace("\n", " ")[:240])
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(run()))
