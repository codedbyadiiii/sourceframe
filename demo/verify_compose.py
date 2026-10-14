"""Run the isolated broken/fixed PostgreSQL Compose demonstration end to end."""

from __future__ import annotations

import os
import subprocess
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PROJECT = f"cloudsage-demo-phase3-{os.getpid()}"
CASES = (
    ("broken host-published port", "demo/compose.host-port.broken.yaml", 503),
    ("corrected container port", "demo/compose.host-port.fixed.yaml", 200),
    ("mismatched database name", "demo/compose.database-name.broken.yaml", 503),
)


class DemoFailure(RuntimeError):
    pass


def compose(file: str, *args: str, timeout: int = 180) -> subprocess.CompletedProcess[str]:
    command = ["docker", "compose", "-p", PROJECT, "-f", file, *args]
    result = subprocess.run(command, cwd=ROOT, capture_output=True, text=True, timeout=timeout)
    if result.returncode:
        detail = (result.stderr or result.stdout).strip()
        raise DemoFailure(f"Compose command failed ({' '.join(command)}): {detail}")
    return result


def wait_for_app(file: str, timeout_seconds: int = 120) -> str:
    deadline = time.monotonic() + timeout_seconds
    logs = ""
    while time.monotonic() < deadline:
        result = compose(file, "logs", "--no-color", "app", timeout=15)
        logs = result.stdout
        if "Uvicorn running on" in logs:
            return logs
        time.sleep(2)
    raise DemoFailure(f"App did not start its HTTP server within {timeout_seconds}s. App logs:\n{logs}")


def health_status() -> tuple[int, str]:
    try:
        with urllib.request.urlopen("http://127.0.0.1:8080/health", timeout=5) as response:
            return response.status, response.read().decode("utf-8", errors="replace")
    except urllib.error.HTTPError as response:
        return response.code, response.read().decode("utf-8", errors="replace")


def run_case(name: str, file: str, expected_status: int) -> None:
    print(f"\n=== {name} ({file}) ===", flush=True)
    compose(file, "config", "-q")
    try:
        compose(file, "up", "--build", "-d", timeout=600)
        logs = wait_for_app(file)
        status, body = health_status()
        print(f"/health HTTP {status} (expected {expected_status}): {body}")
        print("--- app logs ---")
        print(logs.rstrip())
        if status != expected_status:
            raise DemoFailure(f"{name}: expected HTTP {expected_status}, got {status}.")
    finally:
        compose(file, "down", "-v", "--remove-orphans")
        remaining = compose(file, "ps", "-q").stdout.strip()
        if remaining:
            raise DemoFailure(f"Compose project {PROJECT} still has running containers after teardown.")
    print("Isolated Compose project torn down.", flush=True)


def main() -> int:
    try:
        subprocess.run(["docker", "info"], check=True, capture_output=True, text=True, timeout=15)
        for case in CASES:
            run_case(*case)
    except (OSError, subprocess.SubprocessError, DemoFailure) as error:
        print(f"LIVE DEMO FAILED: {error}")
        return 1
    print("\nAll live Compose demo checks passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
