"""
Simple FastAPI backend for PCA extraction and benchmarking.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse

from routers import extract, prompts, benchmark
from logging_config import setup_logging, get_log_file_path, clear_log

# Set up logging first
LOG_FILE = setup_logging()

app = FastAPI(
    title="PCA Extractor API",
    description="Simple API for extracting PCAs from ERIS reports and benchmarking prompts",
    version="2.0.0"
)

# CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(extract.router)
app.include_router(prompts.router)
app.include_router(benchmark.router)


@app.get("/")
async def root():
    """Health check endpoint."""
    return {
        "status": "ok",
        "message": "PCA Extractor API is running",
        "endpoints": {
            "extract": "/extract - Upload PDF and extract PCAs",
            "prompts": "/prompts - Manage prompt versions",
            "benchmark": "/benchmark - Run benchmarks on projects"
        }
    }


@app.get("/health")
async def health():
    """Health check."""
    return {"status": "healthy"}


@app.get("/logs", response_class=PlainTextResponse)
async def get_logs(lines: int = 200):
    """Get the last N lines of the log file."""
    log_file = get_log_file_path()
    if not log_file.exists():
        return "No logs yet"
    
    with open(log_file, 'r') as f:
        all_lines = f.readlines()
    
    # Return last N lines
    return "".join(all_lines[-lines:])


@app.post("/logs/clear")
async def clear_logs():
    """Clear the log file."""
    clear_log()
    return {"message": "Logs cleared"}
