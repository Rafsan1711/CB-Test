from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from config import settings
from api.routes import auth, repos, issues, prs, releases, webhook, agent
import logging
from logging_config import setup_logging

logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    setup_logging()
    logger.info("=" * 60)
    logger.info("Starting up ContriBot API...")
    logger.info("=" * 60)
    try:
        from services.supabase_service import db
        logger.info("Supabase connection initialized.")
    except Exception as e:
        logger.error(f"Failed to connect to Supabase: {e}")

    try:
        from services.agent_orchestrator import orchestrator
        orchestrator.start()
        logger.info("AgentOrchestrator started.")
    except Exception as e:
        logger.error(f"Failed to start AgentOrchestrator: {e}")

    if settings.GITHUB_TOKEN:
        logger.info("GitHub token found.")
    else:
        logger.warning("GitHub token not configured.")
        
    yield
    
    # Shutdown
    logger.info("Shutting down ContriBot API...")
    try:
        from services.agent_orchestrator import orchestrator
        orchestrator.stop()
        logger.info("AgentOrchestrator stopped.")
    except Exception as e:
        logger.error(f"Failed to stop AgentOrchestrator: {e}")

app = FastAPI(title="ContriBot API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

import os
from fastapi.staticfiles import StaticFiles

app.include_router(auth.router, prefix="/api/v1/auth", tags=["Auth"])
app.include_router(repos.router, prefix="/api/v1/repos", tags=["Repos"])
app.include_router(issues.router, prefix="/api/v1/issues", tags=["Issues"])
app.include_router(prs.router, prefix="/api/v1/prs", tags=["Pull Requests"])
app.include_router(releases.router, prefix="/api/v1/releases", tags=["Releases"])
app.include_router(webhook.router, prefix="/api/v1/webhook", tags=["Webhook"])
app.include_router(agent.router, prefix="/api/v1/agent", tags=["Agent"])

@app.get("/api")
async def root():
    return {"message": "Welcome to ContriBot API", "status": "running"}

@app.get("/api/health")
async def health_check():
    return {"status": "ok", "version": "1.0.0"}

from fastapi.responses import FileResponse

# Serve static files from the React build if it exists
dist_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "dist")
if os.path.exists(dist_path):
    app.mount("/assets", StaticFiles(directory=os.path.join(dist_path, "assets")), name="assets")
    
    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        # If the path is an API route, it should have been caught by the routers above
        # If it's a static file that exists (like favicon.ico), serve it
        file_path = os.path.join(dist_path, full_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        # Otherwise, serve index.html for client-side routing
        return FileResponse(os.path.join(dist_path, "index.html"))
else:
    @app.get("/")
    async def root_fallback():
        return {"message": "Welcome to ContriBot API", "status": "running", "note": "Frontend build not found"}

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
    )

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {exc}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )
