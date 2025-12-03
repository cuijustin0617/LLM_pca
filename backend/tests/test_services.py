"""
Tests for backend services.
"""

import pytest
import threading
import time
from pathlib import Path
from unittest.mock import patch, MagicMock

# Add paths for imports
import sys
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from services.extraction_service import ExtractionService, ExtractionStatus
from services.benchmark_service import BenchmarkService, BenchmarkStatus


class TestExtractionService:
    """Tests for ExtractionService."""
    
    def test_initial_state(self):
        """Should start in idle state."""
        service = ExtractionService()
        assert service.is_busy() is False
        status = service.get_status()
        assert status["status"] == "idle"
    
    def test_busy_while_running(self):
        """Should be busy while extraction is running."""
        service = ExtractionService()
        
        # Simulate running state
        service._running = True
        assert service.is_busy() is True
        
        service._running = False
        assert service.is_busy() is False
    
    def test_get_status_returns_dict(self):
        """Should return status as dictionary."""
        service = ExtractionService()
        service._status = ExtractionStatus(
            job_id="test123",
            status="running",
            current_step="Testing...",
            progress_percent=50.0,
        )
        
        status = service.get_status()
        
        assert isinstance(status, dict)
        assert status["job_id"] == "test123"
        assert status["status"] == "running"
        assert status["progress_percent"] == 50.0
    
    def test_run_extraction_returns_false_when_busy(self):
        """Should return False when already running."""
        service = ExtractionService()
        service._running = True
        
        result = service.run_extraction(Path("/fake/path.pdf"), "test123")
        
        assert result is False
    
    def test_run_extraction_starts_thread(self):
        """Should start extraction in background thread."""
        service = ExtractionService()
        
        with patch.object(service, '_run_extraction_sync') as mock_sync:
            # Make it a no-op to avoid actual extraction
            def fake_sync(*args):
                time.sleep(0.1)
                service._running = False
            mock_sync.side_effect = fake_sync
            
            result = service.run_extraction(Path("/fake/path.pdf"), "test123")
            
            assert result is True
            assert service._running is True
            
            # Wait for thread to finish
            time.sleep(0.2)
            assert service._running is False


class TestBenchmarkService:
    """Tests for BenchmarkService."""
    
    def test_initial_state(self):
        """Should start in idle state."""
        service = BenchmarkService()
        assert service.is_busy() is False
        status = service.get_status()
        assert status["status"] == "idle"
    
    def test_get_projects_with_valid_dir(self, tmp_path):
        """Should return projects with valid structure."""
        service = BenchmarkService()
        
        # Create mock project
        project_dir = tmp_path / "test-project"
        project_dir.mkdir()
        (project_dir / "ERIS-test.pdf").touch()
        with open(project_dir / "PCA-test.csv", 'w') as f:
            f.write("header\nrow1\nrow2\n")
        
        with patch('services.benchmark_service.PROJECTS_DIR', tmp_path):
            projects = service.get_projects()
        
        assert len(projects) == 1
        assert projects[0]["project_id"] == "test-project"
        assert projects[0]["ground_truth_count"] == 2  # 3 lines - 1 header
    
    def test_get_projects_skips_incomplete(self, tmp_path):
        """Should skip projects without both PDF and CSV."""
        service = BenchmarkService()
        
        # Create project with only PDF
        project1 = tmp_path / "only-pdf"
        project1.mkdir()
        (project1 / "ERIS-test.pdf").touch()
        
        # Create project with only CSV
        project2 = tmp_path / "only-csv"
        project2.mkdir()
        (project2 / "PCA-test.csv").touch()
        
        with patch('services.benchmark_service.PROJECTS_DIR', tmp_path):
            projects = service.get_projects()
        
        assert len(projects) == 0
    
    def test_busy_while_running(self):
        """Should be busy while benchmark is running."""
        service = BenchmarkService()
        
        service._running = True
        assert service.is_busy() is True
        
        service._running = False
        assert service.is_busy() is False
    
    def test_run_benchmark_returns_false_when_busy(self):
        """Should return False when already running."""
        service = BenchmarkService()
        service._running = True
        
        result = service.run_benchmark("test-project", "v1")
        
        assert result is False
    
    def test_get_status_returns_dict(self):
        """Should return status as dictionary."""
        service = BenchmarkService()
        service._status = BenchmarkStatus(
            job_id="bench_test_123",
            project_id="test-project",
            prompt_version="v1",
            status="running",
            current_step="Testing...",
            progress_percent=50.0,
        )
        
        status = service.get_status()
        
        assert isinstance(status, dict)
        assert status["job_id"] == "bench_test_123"
        assert status["project_id"] == "test-project"
        assert status["status"] == "running"


class TestConcurrency:
    """Tests for concurrency handling."""
    
    def test_extraction_lock(self):
        """Should prevent concurrent extractions."""
        service = ExtractionService()
        
        results = []
        
        def try_start():
            # Simulate checking and starting
            with service._lock:
                if service._running:
                    results.append(False)
                    return
                service._running = True
            results.append(True)
        
        threads = [threading.Thread(target=try_start) for _ in range(5)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()
        
        # Only one should succeed
        assert results.count(True) == 1
        assert results.count(False) == 4
    
    def test_benchmark_lock(self):
        """Should prevent concurrent benchmarks."""
        service = BenchmarkService()
        
        results = []
        
        def try_start():
            with service._lock:
                if service._running:
                    results.append(False)
                    return
                service._running = True
            results.append(True)
        
        threads = [threading.Thread(target=try_start) for _ in range(5)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()
        
        assert results.count(True) == 1
        assert results.count(False) == 4
