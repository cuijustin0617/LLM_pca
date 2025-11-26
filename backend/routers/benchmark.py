from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from pathlib import Path

from backend.services.eval_service import eval_service

router = APIRouter(prefix="/benchmark", tags=["benchmark"])

class BenchmarkRequest(BaseModel):
    experiment_dir: str
    ground_truth_path: str

@router.post("/")
async def run_benchmark(request: BenchmarkRequest):
    try:
        results = eval_service.run_evaluation(request.experiment_dir, request.ground_truth_path)
        return results
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
