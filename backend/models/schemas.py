from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

class UserCreate(BaseModel):
    firebase_uid: str
    email: str
    github_username: Optional[str] = None
    avatar_url: Optional[str] = None

class UserResponse(BaseModel):
    id: str
    firebase_uid: str
    email: str
    github_username: Optional[str] = None
    avatar_url: Optional[str] = None
    created_at: datetime

class UserUpdate(BaseModel):
    github_username: Optional[str] = None
    avatar_url: Optional[str] = None

class RepoCreate(BaseModel):
    github_full_name: str
    github_repo_url: str

class RepoResponse(BaseModel):
    id: str
    user_id: str
    github_full_name: str
    github_repo_url: str
    contribot_active: bool
    settings: Dict[str, Any] = {}
    created_at: datetime

class RepoUpdate(BaseModel):
    contribot_active: Optional[bool] = None
    settings: Optional[Dict[str, Any]] = None

class IssueCreate(BaseModel):
    github_issue_number: int
    title: str
    body: str
    status: str = "open"
    ai_analysis: Dict[str, Any] = {}

class IssueResponse(BaseModel):
    id: str
    repo_id: str
    github_issue_number: int
    title: str
    body: str
    status: str
    ai_analysis: Dict[str, Any] = {}
    created_at: datetime

class IssueUpdate(BaseModel):
    status: Optional[str] = None
    ai_analysis: Optional[Dict[str, Any]] = None

class PullRequestCreate(BaseModel):
    github_pr_number: int
    title: str
    body: str
    status: str = "open"
    verification_results: Dict[str, Any] = {}

class PRResponse(BaseModel):
    id: str
    repo_id: str
    github_pr_number: int
    title: str
    body: str
    status: str
    verification_results: Dict[str, Any] = {}
    created_at: datetime

class PRUpdate(BaseModel):
    status: Optional[str] = None
    verification_results: Optional[Dict[str, Any]] = None

class AgentTaskCreate(BaseModel):
    repo_id: str
    task_type: str
    input_data: Dict[str, Any] = {}

class AgentTaskResponse(BaseModel):
    id: str
    repo_id: str
    task_type: str
    status: str
    input_data: Dict[str, Any] = {}
    output_data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    created_at: datetime

class ReleaseCreate(BaseModel):
    version: str
    bump_type: str
    notes: str
    url: str
    tag: str

class ReleaseResponse(BaseModel):
    id: str
    repo_id: str
    version: str
    bump_type: str
    notes: str
    url: str
    tag: str
    created_at: datetime

class ActivityLogCreate(BaseModel):
    event_type: str
    message: str
    metadata: Dict[str, Any] = {}
    severity: str = "info"

class ActivityLogResponse(BaseModel):
    id: str
    repo_id: str
    event_type: str
    message: str
    metadata: Dict[str, Any] = {}
    severity: str
    created_at: datetime

class WebhookPayload(BaseModel):
    action: Optional[str] = None
    issue: Optional[Dict[str, Any]] = None
    pull_request: Optional[Dict[str, Any]] = None
    repository: Optional[Dict[str, Any]] = None
    comment: Optional[Dict[str, Any]] = None

class GeminiRequest(BaseModel):
    prompt: str

class GeminiResponse(BaseModel):
    text: str

class VerificationResult(BaseModel):
    model_name: str
    approved: bool
    score: int = Field(ge=1, le=10)
    reasoning: str
    issues_found: List[str]

class ConsensusSummary(BaseModel):
    results: List[VerificationResult]
    consensus_score: int
    safe_to_merge: bool
    summary: str
