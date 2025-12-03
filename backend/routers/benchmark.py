"""
Simple benchmark router - run benchmark on selected project.
"""

import os
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

from services.benchmark_service import benchmark_service

router = APIRouter(prefix="/benchmark", tags=["benchmark"])


class BenchmarkRequest(BaseModel):
    project_id: str
    prompt_version: str
    api_key: Optional[str] = None
    chunk_size: Optional[int] = 10000
    model: Optional[str] = None
    temperature: Optional[float] = None


@router.get("/projects")
async def list_projects():
    """List available benchmark projects."""
    return {"projects": benchmark_service.get_projects()}


@router.post("/run")
async def run_benchmark(request: BenchmarkRequest):
    """Start a benchmark run for a specific project."""
    
    # Check for API key (either from request or env)
    effective_key = request.api_key or os.getenv("GOOGLE_API_KEY")
    if not effective_key:
        raise HTTPException(
            status_code=400,
            detail="No Gemini API key provided. Please configure it in the Configuration page."
        )
    
    # Use provided chunk_size or default
    effective_chunk_size = request.chunk_size or 10000
    
    # Check if already running
    if benchmark_service.is_busy():
        raise HTTPException(
            status_code=409,
            detail="A benchmark is already running. Please wait for it to complete."
        )
    
    # Use provided model/temperature or defaults from env
    effective_model = request.model or os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
    effective_temperature = request.temperature if request.temperature is not None else float(os.getenv("TEMPERATURE", "0.1"))
    
    # Start benchmark with all config
    started = benchmark_service.run_benchmark(
        request.project_id, 
        request.prompt_version,
        api_key=effective_key,
        chunk_size=effective_chunk_size,
        model=effective_model,
        temperature=effective_temperature
    )
    
    if not started:
        raise HTTPException(status_code=409, detail="Failed to start benchmark")
    
    return {
        "message": "Benchmark started",
        "project_id": request.project_id,
        "prompt_version": request.prompt_version
    }


@router.get("/status")
async def get_benchmark_status():
    """Get current benchmark status."""
    return benchmark_service.get_status()


@router.get("/busy")
async def check_busy():
    """Check if benchmark is running."""
    return {"busy": benchmark_service.is_busy()}
