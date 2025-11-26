"""
Test cases for prompt version management API endpoints.
"""

import pytest
import json
from pathlib import Path
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

# Test data
TEST_PROMPTS_DIR = Path(__file__).parent.parent.parent / "prompts"


class TestPromptsAPI:
    """Test prompt version management API."""
    
    def test_get_versions(self):
        """Test GET /prompts/versions returns version list."""
        response = client.get("/prompts/versions")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        
        # Check structure of first version
        version = data[0]
        assert "id" in version
        assert "name" in version
        assert "extract_file" in version
        assert "createdAt" in version
        assert "active" in version
    
    def test_get_specific_version(self):
        """Test GET /prompts/versions/{id} returns version with content."""
        response = client.get("/prompts/versions/v1")
        assert response.status_code == 200
        
        data = response.json()
        assert data["id"] == "v1"
        assert "content" in data
        assert len(data["content"]) > 0
        assert "Extract SIGNIFICANT" in data["content"]
    
    def test_get_nonexistent_version(self):
        """Test GET /prompts/versions/{id} with invalid ID returns 404."""
        response = client.get("/prompts/versions/v999")
        assert response.status_code == 404
    
    def test_get_active_prompt(self):
        """Test GET /prompts/active returns active version."""
        response = client.get("/prompts/active")
        assert response.status_code == 200
        
        data = response.json()
        assert data["active"] is True
        assert "content" in data
        assert len(data["content"]) > 0
    
    def test_create_version(self):
        """Test POST /prompts/versions creates new version and file."""
        new_prompt = {
            "name": "Test Version",
            "content": "Test prompt content for automated testing",
            "description": "Created by automated test"
        }
        
        response = client.post("/prompts/versions", json=new_prompt)
        assert response.status_code == 200
        
        data = response.json()
        assert "id" in data
        assert data["name"] == "Test Version"
        assert data["content"] == new_prompt["content"]
        assert data["active"] is False
        
        # Verify file was created
        prompt_file = TEST_PROMPTS_DIR / data["extract_file"]
        assert prompt_file.exists()
        
        with open(prompt_file, 'r') as f:
            file_content = f.read()
        assert file_content == new_prompt["content"]
        
        # Cleanup
        prompt_file.unlink()
        versions_file = TEST_PROMPTS_DIR / "versions.json"
        with open(versions_file, 'r') as f:
            versions = json.load(f)
        versions = [v for v in versions if v["id"] != data["id"]]
        with open(versions_file, 'w') as f:
            json.dump(versions, f, indent=2)
    
    def test_update_version(self):
        """Test PUT /prompts/versions/{id} updates version content."""
        # First create a version
        new_prompt = {
            "name": "Update Test Version",
            "content": "Original content",
            "description": "For update testing"
        }
        
        create_response = client.post("/prompts/versions", json=new_prompt)
        assert create_response.status_code == 200
        created = create_response.json()
        
        # Update the version
        updated_content = {"content": "Updated content for testing"}
        update_response = client.put(f"/prompts/versions/{created['id']}", json=updated_content)
        assert update_response.status_code == 200
        
        updated = update_response.json()
        assert updated["content"] == "Updated content for testing"
        
        # Verify file was updated
        prompt_file = TEST_PROMPTS_DIR / created["extract_file"]
        with open(prompt_file, 'r') as f:
            file_content = f.read()
        assert file_content == "Updated content for testing"
        
        # Cleanup
        prompt_file.unlink()
        versions_file = TEST_PROMPTS_DIR / "versions.json"
        with open(versions_file, 'r') as f:
            versions = json.load(f)
        versions = [v for v in versions if v["id"] != created["id"]]
        with open(versions_file, 'w') as f:
            json.dump(versions, f, indent=2)
    
    def test_activate_version(self):
        """Test PUT /prompts/versions/{id}/activate sets version as active."""
        # Get current versions
        response = client.get("/prompts/versions")
        versions = response.json()
        
        if len(versions) < 2:
            pytest.skip("Need at least 2 versions for activation test")
        
        # Find a non-active version
        non_active = next((v for v in versions if not v.get("active", False)), None)
        if not non_active:
            pytest.skip("All versions are active")
        
        # Activate it
        activate_response = client.put(f"/prompts/versions/{non_active['id']}/activate")
        assert activate_response.status_code == 200
        
        # Verify it's now active
        get_response = client.get("/prompts/active")
        assert get_response.status_code == 200
        active_data = get_response.json()
        assert active_data["id"] == non_active["id"]
        
        # Restore original active version
        original_active = next((v for v in versions if v.get("active", False)), versions[0])
        client.put(f"/prompts/versions/{original_active['id']}/activate")
    
    def test_delete_version(self):
        """Test DELETE /prompts/versions/{id} deletes version."""
        # Create a version to delete
        new_prompt = {
            "name": "Delete Test Version",
            "content": "To be deleted",
            "description": "For deletion testing"
        }
        
        create_response = client.post("/prompts/versions", json=new_prompt)
        assert create_response.status_code == 200
        created = create_response.json()
        
        # Delete it
        delete_response = client.delete(f"/prompts/versions/{created['id']}")
        assert delete_response.status_code == 200
        
        # Verify it's gone
        get_response = client.get(f"/prompts/versions/{created['id']}")
        assert get_response.status_code == 404
        
        # Verify file is deleted
        prompt_file = TEST_PROMPTS_DIR / created["extract_file"]
        assert not prompt_file.exists()
    
    def test_cannot_delete_last_version(self):
        """Test DELETE fails when trying to delete last remaining version."""
        # Get all versions
        response = client.get("/prompts/versions")
        versions = response.json()
        
        if len(versions) == 1:
            # Try to delete the last version
            delete_response = client.delete(f"/prompts/versions/{versions[0]['id']}")
            assert delete_response.status_code == 400
            assert "last prompt version" in delete_response.json()["detail"].lower()
        else:
            pytest.skip("Multiple versions exist, cannot test single version deletion")
    
    def test_cannot_delete_active_version(self):
        """Test DELETE fails when trying to delete active version."""
        # Get all versions
        versions_response = client.get("/prompts/versions")
        versions = versions_response.json()
        
        if len(versions) == 1:
            # If only one version, it will fail with "last version" message
            # which is also correct behavior
            pytest.skip("Only one version exists, testing 'last version' protection instead")
        
        # Get active version
        response = client.get("/prompts/active")
        active = response.json()
        
        # Try to delete it
        delete_response = client.delete(f"/prompts/versions/{active['id']}")
        assert delete_response.status_code == 400
        detail = delete_response.json()["detail"].lower()
        assert "active" in detail or "last" in detail  # Either error is acceptable
    
    def test_version_id_auto_increment(self):
        """Test that new versions get auto-incremented IDs."""
        # Create first test version
        prompt1 = {
            "name": "Auto ID Test 1",
            "content": "Content 1",
            "description": "Test 1"
        }
        
        response1 = client.post("/prompts/versions", json=prompt1)
        assert response1.status_code == 200
        data1 = response1.json()
        
        # Create second test version
        prompt2 = {
            "name": "Auto ID Test 2",
            "content": "Content 2",
            "description": "Test 2"
        }
        
        response2 = client.post("/prompts/versions", json=prompt2)
        assert response2.status_code == 200
        data2 = response2.json()
        
        # Verify IDs are different
        assert data1["id"] != data2["id"]
        
        # Cleanup
        for data in [data1, data2]:
            prompt_file = TEST_PROMPTS_DIR / data["extract_file"]
            if prompt_file.exists():
                prompt_file.unlink()
            
            versions_file = TEST_PROMPTS_DIR / "versions.json"
            with open(versions_file, 'r') as f:
                versions = json.load(f)
            versions = [v for v in versions if v["id"] != data["id"]]
            with open(versions_file, 'w') as f:
                json.dump(versions, f, indent=2)


class TestPromptContentValidation:
    """Test prompt content validation and structure."""
    
    def test_version_has_required_fields(self):
        """Test that all versions have required metadata fields."""
        response = client.get("/prompts/versions")
        versions = response.json()
        
        required_fields = ["id", "name", "extract_file", "createdAt", "active"]
        
        for version in versions:
            for field in required_fields:
                assert field in version, f"Version {version.get('id')} missing field: {field}"
    
    def test_prompt_content_not_empty(self):
        """Test that prompt content is not empty."""
        response = client.get("/prompts/active")
        data = response.json()
        
        assert len(data["content"].strip()) > 0
        assert len(data["content"]) > 100  # Should be substantial
    
    def test_prompt_contains_key_sections(self):
        """Test that prompt contains expected sections."""
        response = client.get("/prompts/active")
        data = response.json()
        content = data["content"]
        
        # Check for key sections
        expected_sections = [
            "CRITICAL",
            "SIGNIFICANCE CRITERIA",
            "EXTRACTION RULES",
            "FEW-SHOT EXAMPLES",
            "PCA"
        ]
        
        for section in expected_sections:
            assert section in content, f"Prompt missing section: {section}"

