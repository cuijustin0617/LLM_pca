from fastapi import APIRouter, HTTPException, Query
from pathlib import Path
import json
import shutil
from typing import Optional, List
from pydantic import BaseModel
from datetime import datetime

from backend.settings import OUTPUT_DIR

router = APIRouter(prefix="/experiments", tags=["experiments"])

class ExperimentConfig(BaseModel):
    provider: str
    model: str
    chunk_size: int
    temperature: float

class EvaluationMetrics(BaseModel):
    precision: float
    recall: float
    f1_score: float
    accuracy: float
    true_positives: int
    false_positives: int
    false_negatives: int
    gt_count: int
    extracted_count: int

class Experiment(BaseModel):
    id: str
    project_id: str
    project_name: str
    created_at: str
    config: ExperimentConfig
    rows_extracted: int
    metrics: Optional[EvaluationMetrics] = None
    status: str
    experiment_dir: str

class ExperimentDetail(Experiment):
    rows: List[dict]

class ExperimentsResponse(BaseModel):
    experiments: List[Experiment]
    total: int

class UpdateRowsRequest(BaseModel):
    rows: List[dict]

class CompareRequest(BaseModel):
    experiment_ids: List[str]

def load_experiment(exp_dir: Path) -> Optional[Experiment]:
    """Load experiment data from directory"""
    try:
        # Load project info
        project_info_file = exp_dir / "project_info.json"
        project_name = "Unknown"
        project_id = "unknown"
        if project_info_file.exists():
            with open(project_info_file, 'r') as f:
                project_info = json.load(f)
                project_name = project_info.get('project_name', 'Unknown')
                project_id = project_info.get('project_name', 'unknown')
        
        # Load config
        config_file = exp_dir / "experiment_config.json"
        config = ExperimentConfig(
            provider="gemini",
            model="gemini-2.5-flash",
            chunk_size=3500,
            temperature=0.0
        )
        if config_file.exists():
            with open(config_file, 'r') as f:
                config_data = json.load(f)
                config = ExperimentConfig(**config_data)
        
        # Load rows
        rows_file = exp_dir / "final" / "final_rows_compiled.json"
        rows_count = 0
        if rows_file.exists():
            with open(rows_file, 'r') as f:
                rows = json.load(f)
                rows_count = len(rows)
        
        # Load metrics if available
        metrics_file = exp_dir / "evaluation" / "metrics.json"
        metrics = None
        if metrics_file.exists():
            with open(metrics_file, 'r') as f:
                metrics_data = json.load(f)
                metrics = EvaluationMetrics(**metrics_data)
        
        # Get creation time
        created_at = datetime.fromtimestamp(exp_dir.stat().st_ctime).isoformat()
        
        # Determine status
        status = "completed" if rows_file.exists() else "failed"
        
        return Experiment(
            id=exp_dir.name,
            project_id=project_id,
            project_name=project_name,
            created_at=created_at,
            config=config,
            rows_extracted=rows_count,
            metrics=metrics,
            status=status,
            experiment_dir=str(exp_dir)
        )
    except Exception as e:
        print(f"Error loading experiment {exp_dir}: {e}")
        return None

@router.get("/", response_model=ExperimentsResponse)
async def list_experiments(
    project_id: Optional[str] = Query(None),
    provider: Optional[str] = Query(None),
    min_recall: Optional[float] = Query(None),
    limit: int = Query(50, le=100),
    offset: int = Query(0, ge=0)
):
    """List all experiments with optional filters"""
    if not OUTPUT_DIR.exists():
        return ExperimentsResponse(experiments=[], total=0)
    
    # Load all experiments
    all_experiments = []
    for exp_dir in sorted(OUTPUT_DIR.glob("exp_*"), reverse=True):
        if not exp_dir.is_dir():
            continue
        
        exp = load_experiment(exp_dir)
        if exp:
            all_experiments.append(exp)
    
    # Apply filters
    filtered = all_experiments
    
    if project_id:
        filtered = [e for e in filtered if e.project_id == project_id]
    
    if provider:
        filtered = [e for e in filtered if e.config.provider == provider]
    
    if min_recall is not None:
        filtered = [e for e in filtered if e.metrics and e.metrics.recall >= min_recall]
    
    total = len(filtered)
    
    # Apply pagination
    paginated = filtered[offset:offset + limit]
    
    return ExperimentsResponse(experiments=paginated, total=total)

@router.get("/{experiment_id}", response_model=ExperimentDetail)
async def get_experiment(experiment_id: str):
    """Get detailed experiment data including rows"""
    exp_dir = OUTPUT_DIR / experiment_id
    
    if not exp_dir.exists():
        raise HTTPException(status_code=404, detail="Experiment not found")
    
    # Load basic experiment data
    exp = load_experiment(exp_dir)
    if not exp:
        raise HTTPException(status_code=500, detail="Failed to load experiment data")
    
    # Load rows
    rows_file = exp_dir / "final" / "final_rows_compiled.json"
    rows = []
    if rows_file.exists():
        with open(rows_file, 'r') as f:
            rows = json.load(f)
    
    return ExperimentDetail(
        **exp.model_dump(),
        rows=rows
    )

@router.delete("/{experiment_id}")
async def delete_experiment(experiment_id: str):
    """Delete an experiment"""
    exp_dir = OUTPUT_DIR / experiment_id
    
    if not exp_dir.exists():
        raise HTTPException(status_code=404, detail="Experiment not found")
    
    try:
        shutil.rmtree(exp_dir)
        return {"message": f"Experiment {experiment_id} deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete experiment: {str(e)}")

@router.patch("/{experiment_id}/rows")
async def update_experiment_rows(experiment_id: str, request: UpdateRowsRequest):
    """Update the rows of an experiment (for editable table)"""
    exp_dir = OUTPUT_DIR / experiment_id
    
    if not exp_dir.exists():
        raise HTTPException(status_code=404, detail="Experiment not found")
    
    rows_file = exp_dir / "final" / "final_rows_compiled.json"
    
    try:
        # Save updated rows
        with open(rows_file, 'w') as f:
            json.dump(request.rows, f, indent=2)
        
        # Also update CSV
        csv_file = exp_dir / "final" / "final_rows_compiled.csv"
        if request.rows:
            import csv
            with open(csv_file, 'w', newline='') as f:
                writer = csv.DictWriter(f, fieldnames=request.rows[0].keys())
                writer.writeheader()
                writer.writerows(request.rows)
        
        return {"message": "Rows updated successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update rows: {str(e)}")

@router.post("/compare")
async def compare_experiments(request: CompareRequest):
    """Compare multiple experiments"""
    if len(request.experiment_ids) < 2:
        raise HTTPException(status_code=400, detail="Need at least 2 experiments to compare")
    
    if len(request.experiment_ids) > 3:
        raise HTTPException(status_code=400, detail="Can only compare up to 3 experiments")
    
    experiments = []
    metrics_comparison = {}
    all_rows = {}
    
    for exp_id in request.experiment_ids:
        exp_dir = OUTPUT_DIR / exp_id
        
        if not exp_dir.exists():
            raise HTTPException(status_code=404, detail=f"Experiment {exp_id} not found")
        
        exp = load_experiment(exp_dir)
        if not exp:
            raise HTTPException(status_code=500, detail=f"Failed to load experiment {exp_id}")
        
        experiments.append(exp)
        
        if exp.metrics:
            metrics_comparison[exp_id] = exp.metrics
        
        # Load rows for overlap analysis
        rows_file = exp_dir / "final" / "final_rows_compiled.json"
        if rows_file.exists():
            with open(rows_file, 'r') as f:
                all_rows[exp_id] = json.load(f)
    
    # Analyze overlaps (simple version - compare by pca_identifier and address)
    common_identifiers = None
    for exp_id, rows in all_rows.items():
        identifiers = set((r.get('pca_identifier'), r.get('address')) for r in rows)
        if common_identifiers is None:
            common_identifiers = identifiers
        else:
            common_identifiers &= identifiers
    
    common_rows = []
    unique_to = {exp_id: [] for exp_id in request.experiment_ids}
    
    for exp_id, rows in all_rows.items():
        for row in rows:
            identifier = (row.get('pca_identifier'), row.get('address'))
            if identifier in common_identifiers:
                if row not in common_rows:
                    common_rows.append(row)
            else:
                unique_to[exp_id].append(row)
    
    return {
        "experiments": experiments,
        "metrics_comparison": metrics_comparison,
        "overlap_analysis": {
            "common_true_positives": common_rows,
            "unique_to": unique_to
        }
    }

