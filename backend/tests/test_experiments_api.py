"""
Test cases for experiments API endpoints
Testing response format and data structure
"""
import pytest
from fastapi.testclient import TestClient
from pathlib import Path
import sys
import json

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from backend.main import app

client = TestClient(app)


class TestExperimentsAPI:
    """Test experiments API response structure"""
    
    def test_experiments_endpoint_returns_correct_structure(self):
        """Test that /experiments/ returns { experiments: [], total: number }"""
        response = client.get("/experiments/")
        assert response.status_code == 200
        
        data = response.json()
        
        # Verify structure
        assert "experiments" in data, "Response should have 'experiments' key"
        assert "total" in data, "Response should have 'total' key"
        assert isinstance(data["experiments"], list), "'experiments' should be a list"
        assert isinstance(data["total"], int), "'total' should be an integer"
    
    def test_experiments_returns_array_not_object(self):
        """Test that experiments key contains an array"""
        response = client.get("/experiments/")
        assert response.status_code == 200
        
        data = response.json()
        experiments = data["experiments"]
        
        # Should be able to iterate
        assert hasattr(experiments, '__iter__')
        # Should have length property
        assert hasattr(experiments, '__len__')
    
    def test_experiments_with_limit(self):
        """Test pagination works correctly"""
        response = client.get("/experiments/?limit=5")
        assert response.status_code == 200
        
        data = response.json()
        assert len(data["experiments"]) <= 5
    
    def test_experiments_with_offset(self):
        """Test offset pagination"""
        response = client.get("/experiments/?offset=0&limit=10")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data["experiments"], list)
    
    def test_experiments_filters_by_provider(self):
        """Test provider filter"""
        response = client.get("/experiments/?provider=openai")
        assert response.status_code == 200
        
        data = response.json()
        # All returned experiments should have openai provider (if any)
        for exp in data["experiments"]:
            if "config" in exp:
                assert exp["config"]["provider"] == "openai"
    
    def test_empty_experiments_returns_valid_structure(self):
        """Test that even with no experiments, structure is correct"""
        response = client.get("/experiments/?project_id=nonexistent")
        assert response.status_code == 200
        
        data = response.json()
        assert data["experiments"] == []
        assert data["total"] == 0


class TestExperimentsDataStructure:
    """Test experiment data fields"""
    
    def test_experiment_has_required_fields(self):
        """Test that each experiment has required fields"""
        response = client.get("/experiments/?limit=1")
        assert response.status_code == 200
        
        data = response.json()
        if data["experiments"]:
            exp = data["experiments"][0]
            required_fields = ["id", "project_id", "created_at", "config", "status", "experiment_dir"]
            
            for field in required_fields:
                assert field in exp, f"Experiment should have '{field}' field"
    
    def test_experiment_config_structure(self):
        """Test that experiment config has required fields"""
        response = client.get("/experiments/?limit=1")
        assert response.status_code == 200
        
        data = response.json()
        if data["experiments"] and "config" in data["experiments"][0]:
            config = data["experiments"][0]["config"]
            required_config_fields = ["provider", "model", "chunk_size", "temperature"]
            
            for field in required_config_fields:
                assert field in config, f"Config should have '{field}' field"


class TestExperimentsPagination:
    """Test pagination behavior"""
    
    def test_total_count_is_accurate(self):
        """Test that total count matches actual count"""
        response = client.get("/experiments/")
        assert response.status_code == 200
        
        data = response.json()
        assert data["total"] >= len(data["experiments"])
    
    def test_limit_respected(self):
        """Test that limit parameter is respected"""
        for limit in [1, 5, 10]:
            response = client.get(f"/experiments/?limit={limit}")
            assert response.status_code == 200
            
            data = response.json()
            assert len(data["experiments"]) <= limit


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

