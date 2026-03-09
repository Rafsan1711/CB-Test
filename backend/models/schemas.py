from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

# --- Users ---
class UserCreate(BaseModel):
    firebase_uid: str
    email: str
    github_username: Optional[str] = None
    avatar_url: Optional[str] = None
    github_access_token: Optional[str] = None

class UserResponse(BaseModel):
    id: str
    firebase_uid: str
    email: str
    github_username: Optional[str] = None
    github_access_token: Optional[str] = None
    avatar_url: Optional[str] = None
    created_at: datetime

class UserUpdate(BaseModel):
    github_username: Optional[str] = None
    avatar_url: Optional[str] = None
    github_access_token: Optional[str] = None

# --- Repos ---
class RepoCreate(BaseModel):
    github_full_name: str
    github_repo_url: Optional[str] = None

class RepoResponse(BaseModel):
    id: str
    user_id: str
    github_full_name: str
    github_repo_url: Optional[str] = None
    contribot_active: bool
    current_version: str
    webhook_secret: Optional[str] = None
    settings: Dict[str, Any] = {}
    created_at: datetime

class RepoUpdate(BaseModel):
    contribot_active: Optional[bool] = None
    current_version: Optional[str] = None
    webhook_secret: Optional[str] = None
    settings: Optional[Dict[str, Any]] = None

# --- Issues ---
class IssueCreate(BaseModel):
    github_issue_number: Optional[int] = None
    issue_type: Optional[str] = None
    title: str
    body: Optional[str] = None
    status: str = "open"
    user_response: Optional[str] = None
    ai_analysis: Optional[Dict[str, Any]] = None
    labels: List[str] = []

class IssueResponse(BaseModel):
    id: str
    repo_id: str
    github_issue_number: Optional[int] = None
    issue_type: Optional[str] = None
    title: str
    body: Optional[str] = None
    status: str
    user_response: Optional[str] = None
    ai_analysis: Optional[Dict[str, Any]] = None
    labels: List[str] = []
    created_at: datetime
    updated_at: datetime

class IssueUpdate(BaseModel):
    status: Optional[str] = None
    user_response: Optional[str] = None
    ai_analysis: Optional[Dict[str, Any]] = None
    labels: Optional[List[str]] = None
    updated_at: datetime = Field(default_factory=datetime.utcnow)

# --- Pull Requests ---
class PullRequestCreate(BaseModel):
    issue_id: Optional[str] = None
    github_pr_number: Optional[int] = None
    title: str
    branch_name: Optional[str] = None
    status: str = "open"
    verification_status: str = "pending"
    verification_results: Dict[str, Any] = {}
    consensus_score: int = 0

class PRResponse(BaseModel):
    id: str
    repo_id: str
    issue_id: Optional[str] = None
    github_pr_number: Optional[int] = None
    title: str
    branch_name: Optional[str] = None
    status: str
    verification_status: str
    verification_results: Dict[str, Any] = {}
    consensus_score: int
    created_at: datetime
    updated_at: datetime

class PRUpdate(BaseModel):
    status: Optional[str] = None
    verification_status: Optional[str] = None
    verification_results: Optional[Dict[str, Any]] = None
    consensus_score: Optional[int] = None
    updated_at: datetime = Field(default_factory=datetime.utcnow)

# --- Agent Tasks ---
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
    output_data: Dict[str, Any] = {}
    model_used: Optional[str] = None
    error_message: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: datetime

# --- Releases ---
class ReleaseCreate(BaseModel):
    version: str
    bump_type: Optional[str] = None
    release_notes: Optional[str] = None
    github_release_url: Optional[str] = None
    tag_name: Optional[str] = None

class ReleaseResponse(BaseModel):
    id: str
    repo_id: str
    version: str
    bump_type: Optional[str] = None
    release_notes: Optional[str] = None
    github_release_url: Optional[str] = None
    tag_name: Optional[str] = None
    created_at: datetime

# --- Activity Log ---
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

# --- Webhooks & Gemini ---
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
