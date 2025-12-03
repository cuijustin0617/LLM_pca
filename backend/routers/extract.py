"""
Simple extraction router - upload PDF, run extraction, get status.
"""

import os
import uuid
import json
from pathlib import Path
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import StreamingResponse
from typing import Optional
import io
import csv

from services.extraction_service import extraction_service
from settings import UPLOAD_DIR

router = APIRouter(prefix="/extract", tags=["extraction"])


@router.post("/upload")
async def upload_and_extract(
    file: UploadFile = File(...),
    api_key: Optional[str] = Form(None),
    chunk_size: Optional[int] = Form(10000),
    prompt_version: Optional[str] = Form(None),
    model: Optional[str] = Form(None),
    temperature: Optional[float] = Form(None)
):
    """Upload a PDF and start extraction."""
    
    # Check for API key (either from request or env)
    effective_key = api_key or os.getenv("GOOGLE_API_KEY")
    if not effective_key:
        raise HTTPException(
            status_code=400,
            detail="No Gemini API key provided. Please configure it in the Configuration page."
        )
    
    # Use provided chunk_size or default
    effective_chunk_size = chunk_size or 10000
    
    # Use provided prompt_version or get active from versions.json
    effective_prompt = prompt_version
    if not effective_prompt:
        from pathlib import Path
        versions_file = Path(__file__).resolve().parent.parent.parent / "prompts" / "versions.json"
        if versions_file.exists():
            with open(versions_file, 'r') as f:
                versions_data = json.load(f)
                effective_prompt = versions_data.get("active_version", "v1")
        else:
            effective_prompt = "v1"
    
    # Check if already running
    if extraction_service.is_busy():
        raise HTTPException(
            status_code=409, 
            detail="An extraction is already running. Please wait for it to complete."
        )
    
    # Validate file
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")
    
    # Use provided model/temperature or defaults from env
    effective_model = model or os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
    effective_temperature = temperature if temperature is not None else float(os.getenv("TEMPERATURE", "0.1"))
    
    # Save uploaded file
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    job_id = str(uuid.uuid4())[:8]
    filename = f"{job_id}_{file.filename}"
    file_path = UPLOAD_DIR / filename
    
    with open(file_path, "wb") as f:
        content = await file.read()
        f.write(content)
    
    # Start extraction with all config
    started = extraction_service.run_extraction(
        file_path, job_id, 
        api_key=effective_key, 
        chunk_size=effective_chunk_size,
        prompt_version=effective_prompt,
        model=effective_model,
        temperature=effective_temperature
    )
    
    if not started:
        os.remove(file_path)
        raise HTTPException(status_code=409, detail="Failed to start extraction")
    
    return {
        "job_id": job_id,
        "filename": filename,
        "prompt_version": effective_prompt,
        "message": "Extraction started"
    }


@router.get("/status")
async def get_extraction_status():
    """Get current extraction status."""
    return extraction_service.get_status()


@router.get("/busy")
async def check_busy():
    """Check if extraction is running."""
    return {"busy": extraction_service.is_busy()}


@router.post("/reset")
async def reset_status():
    """Reset extraction status to allow starting a new extraction."""
    if extraction_service.is_busy():
        raise HTTPException(
            status_code=409,
            detail="Cannot reset while extraction is running"
        )
    extraction_service.reset()
    return {"message": "Status reset"}


@router.get("/rows")
async def get_extracted_rows():
    """Get extracted rows from current extraction (partial during run, final when complete)."""
    status = extraction_service.get_status()
    if not status or not status.get("experiment_dir"):
        return {"rows": [], "is_final": False}
    
    exp_dir = Path(status["experiment_dir"])
    
    # Try final compiled rows first
    final_path = exp_dir / "final" / "final_rows_compiled.json"
    if final_path.exists():
        with open(final_path, 'r') as f:
            rows = json.load(f)
        return {"rows": rows, "is_final": True}
    
    # Otherwise try raw rows (partial results)
    raw_path = exp_dir / "final" / "all_rows_raw.json"
    if raw_path.exists():
        with open(raw_path, 'r') as f:
            rows = json.load(f)
        return {"rows": rows, "is_final": False}
    
    return {"rows": [], "is_final": False}


@router.post("/rows")
async def save_edited_rows(rows: list):
    """Save edited rows back to the experiment directory."""
    status = extraction_service.get_status()
    if not status or not status.get("experiment_dir"):
        raise HTTPException(status_code=404, detail="No extraction found")
    
    if extraction_service.is_busy():
        raise HTTPException(status_code=409, detail="Cannot edit while extraction is running")
    
    exp_dir = Path(status["experiment_dir"])
    final_dir = exp_dir / "final"
    final_dir.mkdir(parents=True, exist_ok=True)
    
    # Re-number pca_identifier
    for i, r in enumerate(rows, start=1):
        r["pca_identifier"] = i
    
    # Save JSON
    with open(final_dir / "final_rows_compiled.json", 'w') as f:
        json.dump(rows, f, indent=2)
    
    # Save CSV
    csv_path = final_dir / "final_rows_compiled.csv"
    cols = ["pca_identifier", "address", "location_relation_to_site", "pca_number", "pca_name", "description_timeline", "source_pages"]
    
    with open(csv_path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=cols, extrasaction='ignore')
        writer.writeheader()
        writer.writerows(rows)
    
    return {"message": "Rows saved", "count": len(rows)}


@router.get("/download")
async def download_csv():
    """Download the final CSV file."""
    status = extraction_service.get_status()
    if not status or not status.get("experiment_dir"):
        raise HTTPException(status_code=404, detail="No extraction found")
    
    exp_dir = Path(status["experiment_dir"])
    csv_path = exp_dir / "final" / "final_rows_compiled.csv"
    
    if not csv_path.exists():
        raise HTTPException(status_code=404, detail="CSV file not found")
    
    with open(csv_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    return StreamingResponse(
        io.StringIO(content),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=extracted_pcas.csv"}
    )
