import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .analyzer import diagnose
from .models import DiagnoseRequest, DiagnoseResponse

app = FastAPI(title="CloudSage AI", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


@app.get("/api/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/diagnose", response_model=DiagnoseResponse)
async def diagnose_endpoint(request: DiagnoseRequest) -> DiagnoseResponse:
    return await diagnose(request)
