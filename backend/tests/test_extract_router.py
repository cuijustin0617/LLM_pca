"""
Test cases for the extract router to ensure proper path resolution and json import.
"""
import pytest
from fastapi.testclient import TestClient
from pathlib import Path
import sys
import tempfile
import shutil

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from backend.main import app
from backend.settings import ROOT_DIR

client = TestClient(app)


class TestExtractRouter:
    """Test the extract router endpoints"""
    
    def test_json_import_available(self):
        """Test that json module is properly imported"""
        from backend.routers import extract
        # Verify json is imported at module level
        assert hasattr(extract, 'json')
    
    def test_pca_definitions_path_resolution(self):
        """Test that PCA definitions path resolves correctly"""
        pca_path = ROOT_DIR / "data" / "pca_definitions.txt"
        assert pca_path.exists(), f"PCA definitions file not found at {pca_path}"
    
    def test_root_dir_import(self):
        """Test that ROOT_DIR is properly imported"""
        from backend.routers.extract import ROOT_DIR as EXTRACT_ROOT_DIR
        assert EXTRACT_ROOT_DIR is not None
        assert EXTRACT_ROOT_DIR.exists()
    
    def test_extraction_endpoint_exists(self):
        """Test that extraction endpoint is accessible"""
        response = client.get("/")
        assert response.status_code == 200
    
    def test_progress_endpoint_not_found(self):
        """Test progress endpoint returns 404 for non-existent job"""
        response = client.get("/extract/non-existent-job-id/progress")
        assert response.status_code == 404
        assert "Job not found" in response.json()["detail"]


class TestPathResolution:
    """Test path resolution from backend directory"""
    
    def test_relative_paths_from_backend(self):
        """Test that relative paths work when running from backend directory"""
        from backend.settings import ROOT_DIR, UPLOAD_DIR, OUTPUT_DIR, PROJECTS_DIR
        
        # All paths should be absolute and exist
        assert ROOT_DIR.is_absolute()
        assert UPLOAD_DIR.is_absolute()
        assert OUTPUT_DIR.is_absolute()
        assert PROJECTS_DIR.is_absolute()
        
        # Root dir should be project root, not backend
        assert (ROOT_DIR / "backend").exists()
        assert (ROOT_DIR / "frontend").exists()
        assert (ROOT_DIR / "data").exists()
    
    def test_pca_definitions_accessible(self):
        """Test PCA definitions file is accessible from backend"""
        from backend.settings import ROOT_DIR
        pca_def_path = ROOT_DIR / "data" / "pca_definitions.txt"
        
        assert pca_def_path.exists(), f"File not found: {pca_def_path}"
        assert pca_def_path.is_file()
        
        # Should be readable
        content = pca_def_path.read_text(encoding="utf-8")
        assert len(content) > 0


class TestEdgeCases:
    """Test edge cases and error handling"""
    
    def test_extraction_without_file(self):
        """Test extraction fails gracefully without file"""
        response = client.post("/extract/")
        assert response.status_code == 422  # Validation error
    
    def test_extraction_parameter_validation(self):
        """Test extraction endpoint parameter validation"""
        # Test with missing required file parameter
        response = client.post(
            "/extract/",
            data={
                "provider": "openai",
                "model": "gpt-4o",
                "chunk_size": "3500",
                "temperature": "0.0"
            }
        )
        # Should fail validation due to missing file
        assert response.status_code == 422
    
    def test_progress_with_empty_queue(self):
        """Test progress endpoint with non-existent job ID"""
        response = client.get("/extract/test-job-id-12345/progress")
        assert response.status_code == 404


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

