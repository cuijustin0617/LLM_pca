"""
Test cases for projects API endpoints
Testing response format and ground truth detection
"""
import pytest
from fastapi.testclient import TestClient
from pathlib import Path
import sys

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from backend.main import app
from backend.settings import PROJECTS_DIR

client = TestClient(app)


class TestProjectsAPI:
    """Test projects API response structure"""
    
    def test_projects_endpoint_returns_array(self):
        """Test that /projects/ returns a direct array"""
        response = client.get("/projects/")
        assert response.status_code == 200
        
        data = response.json()
        
        # Should be a direct array, not an object
        assert isinstance(data, list), "Response should be a list"
    
    def test_projects_array_is_iterable(self):
        """Test that projects response is iterable"""
        response = client.get("/projects/")
        assert response.status_code == 200
        
        data = response.json()
        
        # Should be able to iterate
        for project in data:
            # Each project should be a dict
            assert isinstance(project, dict)
    
    def test_project_has_ground_truth_field(self):
        """Test that projects have ground_truth_file field"""
        response = client.get("/projects/")
        assert response.status_code == 200
        
        data = response.json()
        
        for project in data:
            assert "ground_truth_file" in project, "Each project should have ground_truth_file field"
            # Field can be None or a string path
            assert project["ground_truth_file"] is None or isinstance(project["ground_truth_file"], str)
    
    def test_project_has_required_fields(self):
        """Test that each project has all required fields"""
        response = client.get("/projects/")
        assert response.status_code == 200
        
        data = response.json()
        required_fields = ["id", "name", "eris_file", "ground_truth_file", "created_at", "experiment_count"]
        
        for project in data:
            for field in required_fields:
                assert field in project, f"Project should have '{field}' field"
    
    def test_projects_with_ground_truth(self):
        """Test filtering projects with ground truth"""
        response = client.get("/projects/")
        assert response.status_code == 200
        
        data = response.json()
        
        # Find projects with ground truth
        projects_with_gt = [p for p in data if p.get("ground_truth_file")]
        
        # All projects with GT should have a valid path
        for project in projects_with_gt:
            gt_file = project["ground_truth_file"]
            assert gt_file is not None
            assert gt_file != "None", "ground_truth_file should not be string 'None'"
            assert isinstance(gt_file, str)


class TestProjectsDirectory:
    """Test projects directory structure"""
    
    def test_projects_directory_exists(self):
        """Test that projects directory is created"""
        assert PROJECTS_DIR.exists(), f"Projects directory should exist at {PROJECTS_DIR}"
        assert PROJECTS_DIR.is_dir(), "Projects directory should be a directory"
    
    def test_projects_contain_required_files(self):
        """Test that each project directory has required files"""
        if not PROJECTS_DIR.exists():
            pytest.skip("No projects directory")
        
        for project_dir in PROJECTS_DIR.iterdir():
            if not project_dir.is_dir():
                continue
            
            # Should have at least an ERIS PDF
            eris_files = list(project_dir.glob("ERIS*.pdf"))
            assert len(eris_files) > 0, f"Project {project_dir.name} should have ERIS PDF"


class TestProjectsFiltering:
    """Test project filtering and selection"""
    
    def test_can_identify_projects_with_ground_truth(self):
        """Test that we can correctly identify projects with ground truth"""
        response = client.get("/projects/")
        assert response.status_code == 200
        
        data = response.json()
        
        # Separate projects with and without GT
        with_gt = [p for p in data if p["ground_truth_file"] and p["ground_truth_file"] != "None"]
        without_gt = [p for p in data if not p["ground_truth_file"] or p["ground_truth_file"] == "None"]
        
        # Total should match
        assert len(with_gt) + len(without_gt) == len(data)
    
    def test_ground_truth_paths_are_valid(self):
        """Test that ground truth file paths are properly formatted"""
        response = client.get("/projects/")
        assert response.status_code == 200
        
        data = response.json()
        
        for project in data:
            if project.get("ground_truth_file"):
                gt_file = project["ground_truth_file"]
                # Should be a string path
                assert isinstance(gt_file, str)
                # Should not be empty
                assert len(gt_file) > 0
                # Should not be the string "None"
                assert gt_file != "None"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

