"""
Tests for prompts API endpoints.
"""

import pytest
import json
import tempfile
import shutil
from pathlib import Path
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock

# Add paths for imports
import sys
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from main import app
from routers import prompts

client = TestClient(app)


@pytest.fixture
def temp_prompts_dir(tmp_path):
    """Create a temporary prompts directory for testing."""
    prompts_dir = tmp_path / "prompts"
    prompts_dir.mkdir()
    
    # Create initial versions.json
    versions_data = {
        "versions": [
            {"id": "v1", "name": "Test Version 1", "created_at": "2025-01-01T00:00:00"}
        ],
        "active_version": "v1"
    }
    with open(prompts_dir / "versions.json", 'w') as f:
        json.dump(versions_data, f)
    
    # Create v1 prompt file
    with open(prompts_dir / "v1_extract.txt", 'w') as f:
        f.write("Test prompt content for v1")
    
    return prompts_dir


class TestPromptsList:
    """Tests for GET /prompts/versions"""
    
    def test_list_versions(self, temp_prompts_dir):
        """Should list all prompt versions."""
        with patch.object(prompts, 'PROMPTS_DIR', temp_prompts_dir):
            with patch.object(prompts, 'VERSIONS_FILE', temp_prompts_dir / "versions.json"):
                response = client.get("/prompts/versions")
        
        assert response.status_code == 200
        data = response.json()
        assert "versions" in data
        assert len(data["versions"]) == 1
        assert data["versions"][0]["id"] == "v1"
        assert data["versions"][0]["name"] == "Test Version 1"
        assert "content" in data["versions"][0]
    
    def test_list_versions_empty(self, tmp_path):
        """Should return empty list when no versions exist."""
        prompts_dir = tmp_path / "prompts"
        prompts_dir.mkdir()
        
        with patch.object(prompts, 'PROMPTS_DIR', prompts_dir):
            with patch.object(prompts, 'VERSIONS_FILE', prompts_dir / "versions.json"):
                response = client.get("/prompts/versions")
        
        assert response.status_code == 200
        data = response.json()
        assert data["versions"] == []


class TestPromptsGet:
    """Tests for GET /prompts/versions/{version_id}"""
    
    def test_get_version(self, temp_prompts_dir):
        """Should get a specific version."""
        with patch.object(prompts, 'PROMPTS_DIR', temp_prompts_dir):
            with patch.object(prompts, 'VERSIONS_FILE', temp_prompts_dir / "versions.json"):
                response = client.get("/prompts/versions/v1")
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == "v1"
        assert data["name"] == "Test Version 1"
        assert data["content"] == "Test prompt content for v1"
    
    def test_get_nonexistent_version(self, temp_prompts_dir):
        """Should return 404 for nonexistent version."""
        with patch.object(prompts, 'PROMPTS_DIR', temp_prompts_dir):
            with patch.object(prompts, 'VERSIONS_FILE', temp_prompts_dir / "versions.json"):
                response = client.get("/prompts/versions/v999")
        
        assert response.status_code == 404


class TestPromptsCreate:
    """Tests for POST /prompts/versions"""
    
    def test_create_version(self, temp_prompts_dir):
        """Should create a new version."""
        with patch.object(prompts, 'PROMPTS_DIR', temp_prompts_dir):
            with patch.object(prompts, 'VERSIONS_FILE', temp_prompts_dir / "versions.json"):
                response = client.post(
                    "/prompts/versions",
                    json={"name": "New Version", "content": "New prompt content"}
                )
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == "v2"  # v1 exists, so next is v2
        assert data["name"] == "New Version"
        
        # Verify file was created
        assert (temp_prompts_dir / "v2_extract.txt").exists()
        with open(temp_prompts_dir / "v2_extract.txt") as f:
            assert f.read() == "New prompt content"


class TestPromptsUpdate:
    """Tests for PUT /prompts/versions/{version_id}"""
    
    def test_update_version(self, temp_prompts_dir):
        """Should update an existing version."""
        with patch.object(prompts, 'PROMPTS_DIR', temp_prompts_dir):
            with patch.object(prompts, 'VERSIONS_FILE', temp_prompts_dir / "versions.json"):
                response = client.put(
                    "/prompts/versions/v1",
                    json={"content": "Updated content"}
                )
        
        assert response.status_code == 200
        
        # Verify content was updated
        with open(temp_prompts_dir / "v1_extract.txt") as f:
            assert f.read() == "Updated content"
    
    def test_update_nonexistent_version(self, temp_prompts_dir):
        """Should return 404 for nonexistent version."""
        with patch.object(prompts, 'PROMPTS_DIR', temp_prompts_dir):
            with patch.object(prompts, 'VERSIONS_FILE', temp_prompts_dir / "versions.json"):
                response = client.put(
                    "/prompts/versions/v999",
                    json={"content": "Updated content"}
                )
        
        assert response.status_code == 404


class TestPromptsDelete:
    """Tests for DELETE /prompts/versions/{version_id}"""
    
    def test_delete_version(self, temp_prompts_dir):
        """Should delete an existing version."""
        # First add another version so v1 isn't the only one
        versions_data = {
            "versions": [
                {"id": "v1", "name": "Test Version 1", "created_at": "2025-01-01T00:00:00"},
                {"id": "v2", "name": "Test Version 2", "created_at": "2025-01-02T00:00:00"}
            ],
            "active_version": "v2"
        }
        with open(temp_prompts_dir / "versions.json", 'w') as f:
            json.dump(versions_data, f)
        
        with open(temp_prompts_dir / "v2_extract.txt", 'w') as f:
            f.write("V2 content")
        
        with patch.object(prompts, 'PROMPTS_DIR', temp_prompts_dir):
            with patch.object(prompts, 'VERSIONS_FILE', temp_prompts_dir / "versions.json"):
                response = client.delete("/prompts/versions/v1")
        
        assert response.status_code == 200
        
        # Verify file was deleted
        assert not (temp_prompts_dir / "v1_extract.txt").exists()
    
    def test_delete_nonexistent_version(self, temp_prompts_dir):
        """Should return 404 for nonexistent version."""
        with patch.object(prompts, 'PROMPTS_DIR', temp_prompts_dir):
            with patch.object(prompts, 'VERSIONS_FILE', temp_prompts_dir / "versions.json"):
                response = client.delete("/prompts/versions/v999")
        
        assert response.status_code == 404
