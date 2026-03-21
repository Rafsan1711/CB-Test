import logging
import sys
import os

def setup_logging():
    log_level_str = os.getenv("LOG_LEVEL", "INFO").upper()
    log_level = getattr(logging, log_level_str, logging.INFO)

    # Format: timestamp, level, module name, function name, line number, message
    # Format example: 2024-01-15 14:23:01 | ERROR | agent_orchestrator:_handle_implement_issue:245 | [REPO: owner/repo] Message here
    log_format = "%(asctime)s | %(levelname)s | %(module)s:%(funcName)s:%(lineno)d | %(message)s"
    date_format = "%Y-%m-%d %H:%M:%S"

    # Configure root logger
    # We use force=True to override any existing configuration (like the one in main.py)
    logging.basicConfig(
        level=log_level,
        format=log_format,
        datefmt=date_format,
        handlers=[
            logging.StreamHandler(sys.stdout)
        ],
        force=True
    )

    # Set some noisy loggers to WARNING
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)
    
    logger = logging.getLogger(__name__)
    logger.info("=" * 60)
    logger.info(f"Logging initialized with level: {log_level_str}")
    logger.info("=" * 60)
