"""
Simple prompts router - CRUD for prompt versions.
"""

import json
from pathlib import Path
from datetime import datetime
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/prompts", tags=["prompts"])

PROMPTS_DIR = Path(__file__).resolve().parent.parent.parent / "prompts"
VERSIONS_FILE = PROMPTS_DIR / "versions.json"


class PromptCreate(BaseModel):
    name: str
    content: str


class PromptUpdate(BaseModel):
    content: str
    name: Optional[str] = None


def _load_versions() -> dict:
    """Load versions metadata."""
    if not VERSIONS_FILE.exists():
        return {"versions": [], "active_version": None}
    with open(VERSIONS_FILE, 'r') as f:
        return json.load(f)


def _save_versions(data: dict):
    """Save versions metadata."""
    PROMPTS_DIR.mkdir(parents=True, exist_ok=True)
    with open(VERSIONS_FILE, 'w') as f:
        json.dump(data, f, indent=2)


@router.get("/versions")
async def list_versions():
    """List all prompt versions."""
    data = _load_versions()
    versions = []
    
    for v in data.get("versions", []):
        version_id = v["id"]
        file_path = PROMPTS_DIR / f"{version_id}_extract.txt"
        
        content = ""
        if file_path.exists():
            with open(file_path, 'r') as f:
                content = f.read()
        
        versions.append({
            "id": version_id,
            "name": v.get("name", version_id),
            "created_at": v.get("created_at"),
            "is_active": version_id == data.get("active_version"),
            "content": content
        })
    
    return {"versions": versions, "active_version": data.get("active_version")}


@router.get("/versions/{version_id}")
async def get_version(version_id: str):
    """Get a specific prompt version."""
    data = _load_versions()
    
    version = None
    for v in data.get("versions", []):
        if v["id"] == version_id:
            version = v
            break
    
    if not version:
        raise HTTPException(status_code=404, detail="Version not found")
    
    file_path = PROMPTS_DIR / f"{version_id}_extract.txt"
    content = ""
    if file_path.exists():
        with open(file_path, 'r') as f:
            content = f.read()
    
    return {
        "id": version_id,
        "name": version.get("name", version_id),
        "created_at": version.get("created_at"),
        "is_active": version_id == data.get("active_version"),
        "content": content
    }


@router.post("/versions")
async def create_version(prompt: PromptCreate):
    """Create a new prompt version."""
    data = _load_versions()
    
    # Generate version ID
    existing_ids = [v["id"] for v in data.get("versions", [])]
    version_num = 1
    while f"v{version_num}" in existing_ids:
        version_num += 1
    version_id = f"v{version_num}"
    
    # Save content
    PROMPTS_DIR.mkdir(parents=True, exist_ok=True)
    file_path = PROMPTS_DIR / f"{version_id}_extract.txt"
    with open(file_path, 'w') as f:
        f.write(prompt.content)
    
    # Update metadata
    if "versions" not in data:
        data["versions"] = []
    
    data["versions"].append({
        "id": version_id,
        "name": prompt.name,
        "created_at": datetime.now().isoformat()
    })
    
    # Set as active if first version
    if data.get("active_version") is None:
        data["active_version"] = version_id
    
    _save_versions(data)
    
    return {
        "id": version_id,
        "name": prompt.name,
        "message": "Version created"
    }


@router.put("/versions/{version_id}")
async def update_version(version_id: str, prompt: PromptUpdate):
    """Update a prompt version."""
    data = _load_versions()
    
    version = None
    for v in data.get("versions", []):
        if v["id"] == version_id:
            version = v
            break
    
    if not version:
        raise HTTPException(status_code=404, detail="Version not found")
    
    # Save content
    file_path = PROMPTS_DIR / f"{version_id}_extract.txt"
    with open(file_path, 'w') as f:
        f.write(prompt.content)
    
    # Update name if provided
    if prompt.name:
        version["name"] = prompt.name
        _save_versions(data)
    
    return {"id": version_id, "message": "Version updated"}


@router.post("/versions/{version_id}/activate")
async def activate_version(version_id: str):
    """Set a version as active."""
    data = _load_versions()
    
    # Verify version exists
    found = False
    for v in data.get("versions", []):
        if v["id"] == version_id:
            found = True
            break
    
    if not found:
        raise HTTPException(status_code=404, detail="Version not found")
    
    data["active_version"] = version_id
    _save_versions(data)
    
    return {"message": f"Version {version_id} is now active"}


@router.delete("/versions/{version_id}")
async def delete_version(version_id: str):
    """Delete a prompt version."""
    data = _load_versions()
    
    # Find and remove version
    versions = data.get("versions", [])
    new_versions = [v for v in versions if v["id"] != version_id]
    
    if len(new_versions) == len(versions):
        raise HTTPException(status_code=404, detail="Version not found")
    
    # Delete file
    file_path = PROMPTS_DIR / f"{version_id}_extract.txt"
    if file_path.exists():
        file_path.unlink()
    
    data["versions"] = new_versions
    
    # Update active version if needed
    if data.get("active_version") == version_id:
        data["active_version"] = new_versions[0]["id"] if new_versions else None
    
    _save_versions(data)
    
    return {"message": "Version deleted"}
