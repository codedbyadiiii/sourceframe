from typing import Literal

from pydantic import BaseModel, Field, model_validator


class Evidence(BaseModel):
    source: Literal["logs", "compose"]
    start_line: int = Field(ge=1)
    end_line: int = Field(ge=1)
    quote: str = Field(min_length=1)


class Finding(BaseModel):
    title: str
    explanation: str
    kind: Literal["observed_fact", "hypothesis"]
    evidence: list[Evidence] = Field(default_factory=list)
    beginner_note: str | None = None


class ProposedChange(BaseModel):
    explanation: str
    before: str
    after: str
    yaml_valid: bool


class Diagnosis(BaseModel):
    status: Literal["likely_cause", "insufficient_evidence", "no_failure_found"]
    summary: str
    findings: list[Finding] = Field(default_factory=list)
    proposed_changes: list[ProposedChange] = Field(default_factory=list)
    verification_steps: list[str] = Field(default_factory=list)
    missing_information: list[str] = Field(default_factory=list)
    model_identifier: str
    analysis_source: Literal["Gemma via Google Gen AI"] = "Gemma via Google Gen AI"


class DiagnoseRequest(BaseModel):
    logs: str = Field(max_length=100_000)
    compose: str = Field(max_length=100_000)

    @model_validator(mode="after")
    def require_content(self):
        if not self.logs.strip() or not self.compose.strip():
            raise ValueError("Both logs and Compose YAML are required.")
        return self


class VerifiedFinding(Finding):
    source_matched: bool


class DiagnoseResponse(Diagnosis):
    findings: list[VerifiedFinding] = Field(default_factory=list)
    redacted_logs: str
    redacted_compose: str
    deterministic_checks: list[str] = Field(default_factory=list)
    caveat: str = "Matching evidence supports traceability but does not prove causal correctness."
