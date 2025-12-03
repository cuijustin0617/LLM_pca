"""
Centralized logging configuration for the backend.
Creates a log file at backend/logs/app.log with detailed output.
"""

import logging
import sys
from pathlib import Path
from datetime import datetime

# Log directory
LOG_DIR = Path(__file__).resolve().parent / "logs"
LOG_DIR.mkdir(exist_ok=True)

# Log file path
LOG_FILE = LOG_DIR / "app.log"

def setup_logging():
    """Set up logging to both console and file."""
    
    # Create formatter with detailed info
    formatter = logging.Formatter(
        '%(asctime)s | %(levelname)-8s | %(name)-20s | %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    
    # File handler - detailed logging
    file_handler = logging.FileHandler(LOG_FILE, mode='a', encoding='utf-8')
    file_handler.setLevel(logging.DEBUG)
    file_handler.setFormatter(formatter)
    
    # Console handler - info level
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(logging.INFO)
    console_handler.setFormatter(formatter)
    
    # Configure root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(logging.DEBUG)
    
    # Remove existing handlers to avoid duplicates
    root_logger.handlers = []
    root_logger.addHandler(file_handler)
    root_logger.addHandler(console_handler)
    
    # Also configure specific loggers
    for logger_name in ['extraction_service', 'benchmark_service', 'gemini', 'eris_pca']:
        logger = logging.getLogger(logger_name)
        logger.setLevel(logging.DEBUG)
    
    # Log startup
    logging.info(f"=" * 60)
    logging.info(f"Logging initialized - Log file: {LOG_FILE}")
    logging.info(f"=" * 60)
    
    return LOG_FILE


def get_log_file_path() -> Path:
    """Return the path to the log file."""
    return LOG_FILE


def clear_log():
    """Clear the log file."""
    if LOG_FILE.exists():
        LOG_FILE.write_text("")
    logging.info("Log file cleared")

