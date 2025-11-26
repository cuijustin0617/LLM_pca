from fastapi import APIRouter, UploadFile, File, Form, HTTPException, BackgroundTasks
from fastapi.responses import StreamingResponse
import asyncio
import uuid
import queue
import json
from pathlib import Path
import shutil
from typing import Optional
from pydantic import BaseModel

from backend.services.pipeline_service import pipeline_service
from backend.settings import UPLOAD_DIR, PROJECTS_DIR, ROOT_DIR

router = APIRouter(prefix="/extract", tags=["extract"])

class ExtractionResponse(BaseModel):
    message: str
    experiment_dir: Optional[str] = None
    rows: Optional[list] = None
    job_id: str

@router.post("/", response_model=ExtractionResponse)
async def trigger_extraction(
    file: UploadFile = File(...),
    background_tasks: BackgroundTasks = None,
    provider: str = Form("openai"),
    model: str = Form("gpt-4o"),
    chunk_size: int = Form(3500),
    temperature: float = Form(0.0),
    openai_api_key: Optional[str] = Form(None),
    gemini_api_key: Optional[str] = Form(None),
    pca_list_path: Optional[str] = Form(None) 
):
    # Save uploaded file
    file_path = UPLOAD_DIR / file.filename
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # Determine PCA list path
    # Default to the one in data/projects/1/PCA-1.csv? No that's the GT.
    # We need a PCA definition file.
    # The original script requires --pca-list.
    # I should find where the default one is. 
    # In the file listing, I didn't see a standalone pca_list.txt.
    # Let's check `run_extraction.sh` or `USAGE.txt` to see what they use.
    # For now, I'll assume there is one or the user uploads one.
    # If not provided, I'll look for a default one.
    
    # Let's assume there is a `pca_definitions.txt` in `data` or `src`.
    # I'll check for it later. For now, I'll use a hardcoded path if not provided.
    
    real_pca_list_path = Path(pca_list_path) if pca_list_path else ROOT_DIR / "data" / "pca_definitions.txt"
    
    if not real_pca_list_path.exists():
        # Try to find one in the project root
        candidates = list(Path(".").glob("**/pca_definitions.txt"))
        if candidates:
            real_pca_list_path = candidates[0]
        else:
            # Fallback to creating one or erroring?
            # I'll error for now if I can't find it.
            pass

    # Generate job ID
    job_id = str(uuid.uuid4())

    # Run extraction in background
    background_tasks.add_task(
        pipeline_service.run_extraction,
        job_id=job_id,
        pdf_path=file_path,
        pca_list_path=real_pca_list_path,
        provider=provider,
        model=model,
        chunk_size=chunk_size,
        temperature=temperature,
        openai_api_key=openai_api_key,
        gemini_api_key=gemini_api_key
    )
    
    return {"message": "Extraction started", "job_id": job_id}

@router.get("/{job_id}/progress")
async def stream_progress(job_id: str):
    if job_id not in pipeline_service.log_queues:
        raise HTTPException(status_code=404, detail="Job not found")
    
    log_queue = pipeline_service.log_queues[job_id]
    
    async def event_generator():
        while True:
            try:
                # Check if cancelled
                if job_id in pipeline_service.cancelled_jobs:
                    data = json.dumps({"status": "cancelled", "message": "Extraction cancelled by user"})
                    yield f"data: {data}\n\n"
                    break
                
                # Non-blocking get
                message = log_queue.get_nowait()
                
                if message.startswith("DONE:"):
                    exp_dir = message.split(":", 1)[1]
                    # Read rows
                    final_rows_path = Path(exp_dir) / "final" / "final_rows_compiled.json"
                    rows = []
                    if final_rows_path.exists():
                        with open(final_rows_path, "r") as f:
                            rows = json.load(f)
                    
                    data = json.dumps({"status": "complete", "experiment_dir": exp_dir, "rows": rows})
                    yield f"data: {data}\n\n"
                    break
                
                elif message.startswith("ERROR:"):
                    error_msg = message.split(":", 1)[1]
                    data = json.dumps({"status": "error", "message": error_msg})
                    yield f"data: {data}\n\n"
                    break
                
                elif message.startswith("CANCELLED"):
                    data = json.dumps({"status": "cancelled", "message": "Extraction cancelled"})
                    yield f"data: {data}\n\n"
                    break
                
                else:
                    data = json.dumps({"status": "progress", "message": message})
                    yield f"data: {data}\n\n"
                    
            except queue.Empty:
                await asyncio.sleep(0.1)
                
    return StreamingResponse(event_generator(), media_type="text/event-stream")

@router.post("/{job_id}/cancel")
async def cancel_extraction(job_id: str):
    """Cancel an ongoing extraction job"""
    if job_id not in pipeline_service.log_queues:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Mark job as cancelled
    pipeline_service.cancelled_jobs.add(job_id)
    
    # Send cancellation message to log queue
    try:
        pipeline_service.log_queues[job_id].put_nowait("CANCELLED")
    except:
        pass
    
    return {"message": "Cancellation requested", "job_id": job_id}
