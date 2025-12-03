"""
Tests for extraction API endpoints.
"""

import pytest
import tempfile
import os
from pathlib import Path
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock

# Add paths for imports
import sys
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from main import app
from services.extraction_service import extraction_service, ExtractionStatus

client = TestClient(app)

# Test API key
TEST_API_KEY = "test-api-key-12345"


class TestExtractUpload:
    """Tests for POST /extract/upload"""
    
    def test_upload_requires_api_key(self):
        """Should reject requests without API key."""
        with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as f:
            f.write(b"%PDF-1.4 fake pdf content")
            f.flush()
            
            with open(f.name, "rb") as upload:
                response = client.post(
                    "/extract/upload",
                    files={"file": ("test.pdf", upload, "application/pdf")}
                )
        
        os.unlink(f.name)
        assert response.status_code == 400
        assert "API key" in response.json()["detail"]
    
    def test_upload_requires_pdf(self):
        """Should reject non-PDF files."""
        with tempfile.NamedTemporaryFile(suffix=".txt", delete=False) as f:
            f.write(b"not a pdf")
            f.flush()
            
            with open(f.name, "rb") as upload:
                response = client.post(
                    "/extract/upload",
                    files={"file": ("test.txt", upload, "text/plain")},
                    data={"api_key": TEST_API_KEY}
                )
        
        os.unlink(f.name)
        assert response.status_code == 400
        assert "PDF" in response.json()["detail"]
    
    def test_upload_rejects_when_busy(self):
        """Should reject uploads when extraction is running."""
        # Mock the service to be busy
        with patch.object(extraction_service, 'is_busy', return_value=True):
            with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as f:
                f.write(b"%PDF-1.4 fake pdf content")
                f.flush()
                
                with open(f.name, "rb") as upload:
                    response = client.post(
                        "/extract/upload",
                        files={"file": ("test.pdf", upload, "application/pdf")},
                        data={"api_key": TEST_API_KEY}
                    )
            
            os.unlink(f.name)
        
        assert response.status_code == 409
        assert "already running" in response.json()["detail"]
    
    def test_upload_starts_extraction(self, tmp_path):
        """Should start extraction for valid PDF."""
        with patch.object(extraction_service, 'is_busy', return_value=False):
            with patch.object(extraction_service, 'run_extraction', return_value=True) as mock_run:
                with patch('routers.extract.UPLOAD_DIR', tmp_path):
                    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as f:
                        f.write(b"%PDF-1.4 fake pdf content")
                        f.flush()
                        
                        with open(f.name, "rb") as upload:
                            response = client.post(
                                "/extract/upload",
                                files={"file": ("test.pdf", upload, "application/pdf")},
                                data={"api_key": TEST_API_KEY}
                            )
                    
                    os.unlink(f.name)
        
        assert response.status_code == 200
        assert "job_id" in response.json()
        assert response.json()["message"] == "Extraction started"
        assert mock_run.called


class TestExtractStatus:
    """Tests for GET /extract/status"""
    
    def test_status_returns_idle_when_not_running(self):
        """Should return idle status when no extraction is running."""
        with patch.object(extraction_service, 'get_status', return_value={"status": "idle"}):
            response = client.get("/extract/status")
        
        assert response.status_code == 200
        assert response.json()["status"] == "idle"
    
    def test_status_returns_running_status(self):
        """Should return running status with progress."""
        mock_status = {
            "job_id": "test123",
            "status": "running",
            "current_step": "Processing chunk 2/5...",
            "progress_percent": 40.0,
            "total_chunks": 5,
            "completed_chunks": 1,
            "chunk_results": [
                {"chunk_num": 1, "total_chunks": 5, "pages_start": 1, "pages_end": 50, "pca_count": 10}
            ],
            "total_pcas": 10,
            "experiment_dir": None,
            "error": None,
            "started_at": "2025-01-01T00:00:00",
            "completed_at": None,
        }
        
        with patch.object(extraction_service, 'get_status', return_value=mock_status):
            response = client.get("/extract/status")
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "running"
        assert data["progress_percent"] == 40.0
        assert len(data["chunk_results"]) == 1


class TestExtractBusy:
    """Tests for GET /extract/busy"""
    
    def test_busy_returns_false_when_idle(self):
        """Should return busy=false when not running."""
        with patch.object(extraction_service, 'is_busy', return_value=False):
            response = client.get("/extract/busy")
        
        assert response.status_code == 200
        assert response.json()["busy"] is False
    
    def test_busy_returns_true_when_running(self):
        """Should return busy=true when extraction is running."""
        with patch.object(extraction_service, 'is_busy', return_value=True):
            response = client.get("/extract/busy")
        
        assert response.status_code == 200
        assert response.json()["busy"] is True
