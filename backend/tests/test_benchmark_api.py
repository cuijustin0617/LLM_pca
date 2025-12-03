"""
Tests for benchmark API endpoints.
"""

import pytest
from pathlib import Path
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock

# Add paths for imports
import sys
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from main import app
from services.benchmark_service import benchmark_service

client = TestClient(app)


class TestBenchmarkProjects:
    """Tests for GET /benchmark/projects"""
    
    def test_list_projects(self):
        """Should list available projects."""
        mock_projects = [
            {
                "project_id": "test-project",
                "eris_pdf": "ERIS-test.pdf",
                "ground_truth_csv": "PCA-test.csv",
                "ground_truth_count": 25
            }
        ]
        
        with patch.object(benchmark_service, 'get_projects', return_value=mock_projects):
            response = client.get("/benchmark/projects")
        
        assert response.status_code == 200
        data = response.json()
        assert "projects" in data
        assert len(data["projects"]) == 1
        assert data["projects"][0]["project_id"] == "test-project"
    
    def test_list_projects_empty(self):
        """Should return empty list when no projects exist."""
        with patch.object(benchmark_service, 'get_projects', return_value=[]):
            response = client.get("/benchmark/projects")
        
        assert response.status_code == 200
        data = response.json()
        assert data["projects"] == []


class TestBenchmarkRun:
    """Tests for POST /benchmark/run"""
    
    # Test API key
    TEST_API_KEY = "test-api-key-12345"
    
    def test_run_benchmark_requires_api_key(self):
        """Should reject requests without API key."""
        response = client.post(
            "/benchmark/run",
            json={"project_id": "test-project", "prompt_version": "v1"}
        )
        
        assert response.status_code == 400
        assert "API key" in response.json()["detail"]
    
    def test_run_benchmark(self):
        """Should start a benchmark run."""
        with patch.object(benchmark_service, 'is_busy', return_value=False):
            with patch.object(benchmark_service, 'run_benchmark', return_value=True) as mock_run:
                response = client.post(
                    "/benchmark/run",
                    json={
                        "project_id": "test-project", 
                        "prompt_version": "v1",
                        "api_key": self.TEST_API_KEY
                    }
                )
        
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Benchmark started"
        assert data["project_id"] == "test-project"
        mock_run.assert_called_once_with("test-project", "v1", api_key=self.TEST_API_KEY)
    
    def test_run_benchmark_when_busy(self):
        """Should reject when benchmark is already running."""
        with patch.object(benchmark_service, 'is_busy', return_value=True):
            response = client.post(
                "/benchmark/run",
                json={
                    "project_id": "test-project", 
                    "prompt_version": "v1",
                    "api_key": self.TEST_API_KEY
                }
            )
        
        assert response.status_code == 409
        assert "already running" in response.json()["detail"]
    
    def test_run_benchmark_missing_fields(self):
        """Should require project_id and prompt_version."""
        response = client.post("/benchmark/run", json={"api_key": self.TEST_API_KEY})
        assert response.status_code == 422  # Validation error


class TestBenchmarkStatus:
    """Tests for GET /benchmark/status"""
    
    def test_status_idle(self):
        """Should return idle status when not running."""
        with patch.object(benchmark_service, 'get_status', return_value={"status": "idle"}):
            response = client.get("/benchmark/status")
        
        assert response.status_code == 200
        assert response.json()["status"] == "idle"
    
    def test_status_running(self):
        """Should return running status with progress."""
        mock_status = {
            "job_id": "bench_test_123",
            "project_id": "test-project",
            "prompt_version": "v1",
            "status": "running",
            "current_step": "Processing chunk 1/3...",
            "progress_percent": 30.0,
            "total_chunks": 3,
            "completed_chunks": 0,
            "chunk_results": [],
            "extracted_pcas": 0,
            "metrics": None,
            "ground_truth_count": 25,
            "error": None,
            "started_at": "2025-01-01T00:00:00",
            "completed_at": None,
        }
        
        with patch.object(benchmark_service, 'get_status', return_value=mock_status):
            response = client.get("/benchmark/status")
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "running"
        assert data["progress_percent"] == 30.0
    
    def test_status_completed_with_metrics(self):
        """Should return completed status with metrics."""
        mock_status = {
            "job_id": "bench_test_123",
            "project_id": "test-project",
            "prompt_version": "v1",
            "status": "completed",
            "current_step": "Complete! Recall: 80.0%",
            "progress_percent": 100.0,
            "total_chunks": 3,
            "completed_chunks": 3,
            "chunk_results": [
                {"chunk_num": 1, "total_chunks": 3, "pages_start": 1, "pages_end": 50, "pca_count": 8},
                {"chunk_num": 2, "total_chunks": 3, "pages_start": 51, "pages_end": 100, "pca_count": 7},
                {"chunk_num": 3, "total_chunks": 3, "pages_start": 101, "pages_end": 150, "pca_count": 5},
            ],
            "extracted_pcas": 20,
            "metrics": {
                "precision": 0.9,
                "recall": 0.8,
                "f1_score": 0.85,
                "true_positives": 20,
                "false_positives": 2,
                "false_negatives": 5,
            },
            "ground_truth_count": 25,
            "error": None,
            "started_at": "2025-01-01T00:00:00",
            "completed_at": "2025-01-01T00:05:00",
        }
        
        with patch.object(benchmark_service, 'get_status', return_value=mock_status):
            response = client.get("/benchmark/status")
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "completed"
        assert data["metrics"]["recall"] == 0.8
        assert data["metrics"]["precision"] == 0.9


class TestBenchmarkBusy:
    """Tests for GET /benchmark/busy"""
    
    def test_busy_false(self):
        """Should return busy=false when not running."""
        with patch.object(benchmark_service, 'is_busy', return_value=False):
            response = client.get("/benchmark/busy")
        
        assert response.status_code == 200
        assert response.json()["busy"] is False
    
    def test_busy_true(self):
        """Should return busy=true when running."""
        with patch.object(benchmark_service, 'is_busy', return_value=True):
            response = client.get("/benchmark/busy")
        
        assert response.status_code == 200
        assert response.json()["busy"] is True
