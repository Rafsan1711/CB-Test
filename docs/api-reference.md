# API Reference

The ContriBot backend exposes a RESTful API built with FastAPI.

## Authentication
All protected endpoints require a Firebase JWT token in the `Authorization` header.
`Authorization: Bearer <FIREBASE_JWT>`

## Endpoints

### Auth
- `POST /api/v1/auth/login`: Authenticate and receive a session token.
- `GET /api/v1/auth/me`: Get current user profile.

### Repositories
- `GET /api/v1/repos`: List all repositories managed by the user.
- `POST /api/v1/repos`: Add a new repository to ContriBot.
- `GET /api/v1/repos/{repo_id}`: Get repository details.
- `DELETE /api/v1/repos/{repo_id}`: Remove a repository.

### Issues
- `GET /api/v1/issues`: List active issues across repositories.
- `POST /api/v1/issues/{issue_id}/analyze`: Manually trigger AI analysis for an issue.
- `POST /api/v1/issues/{issue_id}/approve`: Approve an issue for auto-implementation.

### Pull Requests
- `GET /api/v1/prs`: List active pull requests.
- `POST /api/v1/prs/{pr_id}/verify`: Manually trigger the Multi-Model Verification.

### Webhooks
- `POST /api/v1/webhook/github`: The endpoint that receives GitHub webhook payloads.

## Request/Response Formats
All requests and responses use `application/json`.

## Error Codes
- `400 Bad Request`: Invalid input data.
- `401 Unauthorized`: Missing or invalid JWT token.
- `403 Forbidden`: User does not have permission for the requested resource.
- `404 Not Found`: Resource does not exist.
- `500 Internal Server Error`: An unexpected error occurred on the server.

## Rate Limits
API requests are rate-limited to 100 requests per minute per user to prevent abuse and manage Gemini API costs.
