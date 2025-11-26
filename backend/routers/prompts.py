"""
API endpoints for prompt version management.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any
from pathlib import Path
import json
from datetime import datetime, timezone

router = APIRouter(prefix="/prompts", tags=["prompts"])

PROMPTS_DIR = Path(__file__).parent.parent.parent / "prompts"


class PromptVersionCreate(BaseModel):
    name: str
    content: str
    description: str = ""


class PromptVersionUpdate(BaseModel):
    content: str


@router.get("/versions")
async def get_prompt_versions() -> List[Dict[str, Any]]:
    """Get all available prompt versions."""
    versions_file = PROMPTS_DIR / "versions.json"
    
    if not versions_file.exists():
        raise HTTPException(status_code=404, detail="Prompt versions not found")
    
    with open(versions_file, 'r') as f:
        versions = json.load(f)
    
    return versions


@router.get("/versions/{version_id}")
async def get_prompt_version(version_id: str) -> Dict[str, Any]:
    """Get a specific prompt version with its content."""
    versions_file = PROMPTS_DIR / "versions.json"
    
    if not versions_file.exists():
        raise HTTPException(status_code=404, detail="Prompt versions not found")
    
    with open(versions_file, 'r') as f:
        versions = json.load(f)
    
    # Find the version
    version = next((v for v in versions if v['id'] == version_id), None)
    if not version:
        raise HTTPException(status_code=404, detail=f"Version {version_id} not found")
    
    # Load the prompt content
    extract_file = PROMPTS_DIR / version['extract_file']
    if not extract_file.exists():
        raise HTTPException(status_code=404, detail=f"Prompt file {version['extract_file']} not found")
    
    with open(extract_file, 'r') as f:
        content = f.read()
    
    return {
        **version,
        "content": content
    }


@router.get("/active")
async def get_active_prompt() -> Dict[str, Any]:
    """Get the currently active prompt version."""
    versions_file = PROMPTS_DIR / "versions.json"
    
    if not versions_file.exists():
        raise HTTPException(status_code=404, detail="Prompt versions not found")
    
    with open(versions_file, 'r') as f:
        versions = json.load(f)
    
    # Find the active version
    active_version = next((v for v in versions if v.get('active', False)), None)
    if not active_version:
        # Default to first version if none marked active
        active_version = versions[0] if versions else None
    
    if not active_version:
        raise HTTPException(status_code=404, detail="No active prompt version found")
    
    # Load the prompt content
    extract_file = PROMPTS_DIR / active_version['extract_file']
    if not extract_file.exists():
        raise HTTPException(status_code=404, detail=f"Prompt file {active_version['extract_file']} not found")
    
    with open(extract_file, 'r') as f:
        content = f.read()
    
    return {
        **active_version,
        "content": content
    }


@router.post("/versions")
async def create_prompt_version(prompt: PromptVersionCreate) -> Dict[str, Any]:
    """Create a new prompt version and save to file."""
    versions_file = PROMPTS_DIR / "versions.json"
    
    if not versions_file.exists():
        raise HTTPException(status_code=404, detail="Prompt versions not found")
    
    # Load existing versions
    with open(versions_file, 'r') as f:
        versions = json.load(f)
    
    # Generate new version ID
    existing_ids = [v['id'] for v in versions]
    version_num = 1
    while f"v{version_num}" in existing_ids:
        version_num += 1
    new_id = f"v{version_num}"
    
    # Create new version metadata
    new_version = {
        "id": new_id,
        "name": prompt.name,
        "extract_file": f"{new_id}_extract.txt",
        "createdAt": datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z'),
        "active": False,
        "description": prompt.description
    }
    
    # Save prompt content to file
    prompt_file = PROMPTS_DIR / new_version["extract_file"]
    with open(prompt_file, 'w') as f:
        f.write(prompt.content)
    
    # Add to versions.json
    versions.append(new_version)
    with open(versions_file, 'w') as f:
        json.dump(versions, f, indent=2)
    
    return {
        **new_version,
        "content": prompt.content
    }


@router.put("/versions/{version_id}")
async def update_prompt_version(version_id: str, prompt: PromptVersionUpdate) -> Dict[str, Any]:
    """Update an existing prompt version's content."""
    versions_file = PROMPTS_DIR / "versions.json"
    
    if not versions_file.exists():
        raise HTTPException(status_code=404, detail="Prompt versions not found")
    
    with open(versions_file, 'r') as f:
        versions = json.load(f)
    
    # Find the version
    version = next((v for v in versions if v['id'] == version_id), None)
    if not version:
        raise HTTPException(status_code=404, detail=f"Version {version_id} not found")
    
    # Update the prompt file
    prompt_file = PROMPTS_DIR / version['extract_file']
    with open(prompt_file, 'w') as f:
        f.write(prompt.content)
    
    return {
        **version,
        "content": prompt.content
    }


@router.put("/versions/{version_id}/activate")
async def activate_prompt_version(version_id: str) -> Dict[str, Any]:
    """Set a prompt version as active."""
    versions_file = PROMPTS_DIR / "versions.json"
    
    if not versions_file.exists():
        raise HTTPException(status_code=404, detail="Prompt versions not found")
    
    with open(versions_file, 'r') as f:
        versions = json.load(f)
    
    # Find the version
    version = next((v for v in versions if v['id'] == version_id), None)
    if not version:
        raise HTTPException(status_code=404, detail=f"Version {version_id} not found")
    
    # Deactivate all versions
    for v in versions:
        v['active'] = False
    
    # Activate the target version
    version['active'] = True
    
    # Save
    with open(versions_file, 'w') as f:
        json.dump(versions, f, indent=2)
    
    return version


@router.delete("/versions/{version_id}")
async def delete_prompt_version(version_id: str) -> Dict[str, str]:
    """Delete a prompt version."""
    versions_file = PROMPTS_DIR / "versions.json"
    
    if not versions_file.exists():
        raise HTTPException(status_code=404, detail="Prompt versions not found")
    
    with open(versions_file, 'r') as f:
        versions = json.load(f)
    
    # Check if it's the last version
    if len(versions) <= 1:
        raise HTTPException(status_code=400, detail="Cannot delete the last prompt version")
    
    # Find and remove the version
    version = next((v for v in versions if v['id'] == version_id), None)
    if not version:
        raise HTTPException(status_code=404, detail=f"Version {version_id} not found")
    
    # Don't allow deleting active version without setting another active
    if version.get('active', False):
        raise HTTPException(
            status_code=400, 
            detail="Cannot delete active version. Set another version as active first."
        )
    
    # Remove from versions.json
    versions = [v for v in versions if v['id'] != version_id]
    with open(versions_file, 'w') as f:
        json.dump(versions, f, indent=2)
    
    # Delete the prompt file
    prompt_file = PROMPTS_DIR / version['extract_file']
    if prompt_file.exists():
        prompt_file.unlink()
    
    return {"message": f"Version {version_id} deleted successfully"}

