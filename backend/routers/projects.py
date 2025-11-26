from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from pathlib import Path
import shutil
from typing import Optional, List
from pydantic import BaseModel
import json
from datetime import datetime

from backend.settings import PROJECTS_DIR, OUTPUT_DIR

router = APIRouter(prefix="/projects", tags=["projects"])

class Project(BaseModel):
    id: str
    name: str
    eris_file: str
    ground_truth_file: Optional[str] = None
    created_at: str
    experiment_count: int

def get_project_experiments(project_name: str) -> int:
    """Count experiments for a project"""
    if not OUTPUT_DIR.exists():
        return 0
    
    count = 0
    for exp_dir in OUTPUT_DIR.glob("exp_*"):
        project_info_file = exp_dir / "project_info.json"
        if project_info_file.exists():
            try:
                with open(project_info_file, 'r') as f:
                    info = json.load(f)
                    if info.get('project_name') == project_name:
                        count += 1
            except:
                pass
    return count

@router.get("/", response_model=List[Project])
async def list_projects():
    """List all projects"""
    if not PROJECTS_DIR.exists():
        return []
    
    projects = []
    for project_dir in PROJECTS_DIR.iterdir():
        if not project_dir.is_dir():
            continue
        
        # Look for ERIS PDF (might have different naming patterns)
        eris_files = list(project_dir.glob("ERIS*.pdf")) + list(project_dir.glob("ERIS-*.pdf"))
        if not eris_files:
            continue
        
        eris_file = eris_files[0]
        
        # Look for ground truth CSV
        gt_files = list(project_dir.glob("PCA*.csv")) + list(project_dir.glob("gt_PCA.csv")) + list(project_dir.glob("PCA-*.csv"))
        gt_file = gt_files[0] if gt_files else None
        
        # Get creation time
        created_at = datetime.fromtimestamp(project_dir.stat().st_ctime).isoformat()
        
        # Count experiments
        exp_count = get_project_experiments(project_dir.name)
        
        projects.append(Project(
            id=project_dir.name,
            name=project_dir.name,
            eris_file=str(eris_file),
            ground_truth_file=str(gt_file) if gt_file else None,
            created_at=created_at,
            experiment_count=exp_count
        ))
    
    return sorted(projects, key=lambda x: x.created_at, reverse=True)

@router.get("/{project_id}", response_model=Project)
async def get_project(project_id: str):
    """Get a specific project"""
    project_dir = PROJECTS_DIR / project_id
    
    if not project_dir.exists():
        raise HTTPException(status_code=404, detail="Project not found")
    
    eris_files = list(project_dir.glob("ERIS*.pdf")) + list(project_dir.glob("ERIS-*.pdf"))
    if not eris_files:
        raise HTTPException(status_code=404, detail="ERIS file not found in project")
    
    eris_file = eris_files[0]
    
    gt_files = list(project_dir.glob("PCA*.csv")) + list(project_dir.glob("gt_PCA.csv")) + list(project_dir.glob("PCA-*.csv"))
    gt_file = gt_files[0] if gt_files else None
    
    created_at = datetime.fromtimestamp(project_dir.stat().st_ctime).isoformat()
    exp_count = get_project_experiments(project_dir.name)
    
    return Project(
        id=project_dir.name,
        name=project_dir.name,
        eris_file=str(eris_file),
        ground_truth_file=str(gt_file) if gt_file else None,
        created_at=created_at,
        experiment_count=exp_count
    )

@router.post("/", response_model=Project)
async def create_project(
    name: str = Form(...),
    eris_file: UploadFile = File(...),
    ground_truth_file: Optional[UploadFile] = File(None)
):
    """Create a new project"""
    # Validate project name
    if not name or '/' in name or '\\' in name:
        raise HTTPException(status_code=400, detail="Invalid project name")
    
    project_dir = PROJECTS_DIR / name
    
    if project_dir.exists():
        raise HTTPException(status_code=400, detail="Project already exists")
    
    # Create project directory
    project_dir.mkdir(parents=True, exist_ok=True)
    
    try:
        # Save ERIS file
        eris_filename = f"ERIS-{name}.pdf"
        eris_path = project_dir / eris_filename
        with open(eris_path, "wb") as buffer:
            shutil.copyfileobj(eris_file.file, buffer)
        
        # Save ground truth file if provided
        gt_path = None
        if ground_truth_file:
            gt_filename = f"PCA-{name}.csv"
            gt_path = project_dir / gt_filename
            with open(gt_path, "wb") as buffer:
                shutil.copyfileobj(ground_truth_file.file, buffer)
        
        created_at = datetime.now().isoformat()
        
        return Project(
            id=name,
            name=name,
            eris_file=str(eris_path),
            ground_truth_file=str(gt_path) if gt_path else None,
            created_at=created_at,
            experiment_count=0
        )
    except Exception as e:
        # Cleanup on error
        if project_dir.exists():
            shutil.rmtree(project_dir)
        raise HTTPException(status_code=500, detail=f"Failed to create project: {str(e)}")

@router.delete("/{project_id}")
async def delete_project(project_id: str):
    """Delete a project and all its experiments"""
    project_dir = PROJECTS_DIR / project_id
    
    if not project_dir.exists():
        raise HTTPException(status_code=404, detail="Project not found")
    
    try:
        # Delete project directory
        shutil.rmtree(project_dir)
        
        # Optionally delete associated experiments
        # (you might want to keep them for history)
        
        return {"message": f"Project {project_id} deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete project: {str(e)}")

