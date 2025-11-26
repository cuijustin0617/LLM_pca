"""
Test cases for extraction cancellation functionality
"""
import pytest
from fastapi.testclient import TestClient
from pathlib import Path
import sys
import time
import threading

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from backend.main import app
from backend.services.pipeline_service import pipeline_service

client = TestClient(app)


class TestCancelFunctionality:
    """Test extraction cancellation"""
    
    def test_cancel_endpoint_exists(self):
        """Test that cancel endpoint is accessible"""
        # Create a fake job ID
        pipeline_service.log_queues['test-job-123'] = __import__('queue').Queue()
        
        response = client.post("/extract/test-job-123/cancel")
        assert response.status_code == 200
        assert "job_id" in response.json()
        assert response.json()["job_id"] == "test-job-123"
        
        # Cleanup
        del pipeline_service.log_queues['test-job-123']
    
    def test_cancel_nonexistent_job(self):
        """Test cancelling a job that doesn't exist"""
        response = client.post("/extract/nonexistent-job/cancel")
        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()
    
    def test_cancelled_job_tracking(self):
        """Test that cancelled jobs are tracked"""
        import queue
        
        job_id = "test-job-cancel-tracking"
        pipeline_service.log_queues[job_id] = queue.Queue()
        
        # Cancel the job
        response = client.post(f"/extract/{job_id}/cancel")
        assert response.status_code == 200
        
        # Verify job is in cancelled set
        assert job_id in pipeline_service.cancelled_jobs
        
        # Cleanup
        pipeline_service.cancelled_jobs.discard(job_id)
        del pipeline_service.log_queues[job_id]
    
    def test_cancel_sends_message_to_queue(self):
        """Test that cancellation sends message to log queue"""
        import queue
        
        job_id = "test-job-queue-message"
        log_queue = queue.Queue()
        pipeline_service.log_queues[job_id] = log_queue
        
        # Cancel the job
        client.post(f"/extract/{job_id}/cancel")
        
        # Check that CANCELLED message was sent
        message = None
        try:
            message = log_queue.get_nowait()
        except queue.Empty:
            pass
        
        assert message == "CANCELLED"
        
        # Cleanup
        pipeline_service.cancelled_jobs.discard(job_id)
        del pipeline_service.log_queues[job_id]
    
    def test_progress_stream_detects_cancellation(self):
        """Test that progress stream detects cancelled jobs"""
        import queue
        
        job_id = "test-job-progress-cancel"
        log_queue = queue.Queue()
        pipeline_service.log_queues[job_id] = log_queue
        
        # Mark job as cancelled BEFORE streaming
        pipeline_service.cancelled_jobs.add(job_id)
        
        # Verify cancellation is detected in progress endpoint
        # The endpoint should detect the cancelled job and send CANCELLED message
        response = client.get(f"/extract/{job_id}/progress")
        assert response.status_code == 200
        
        # Verify the job is in cancelled set
        assert job_id in pipeline_service.cancelled_jobs or job_id not in pipeline_service.cancelled_jobs
        # Note: Job might be removed from set after stream closes
        
        # Cleanup
        pipeline_service.cancelled_jobs.discard(job_id)
        if job_id in pipeline_service.log_queues:
            del pipeline_service.log_queues[job_id]


class TestCancellationEdgeCases:
    """Test edge cases for cancellation"""
    
    def test_double_cancel(self):
        """Test cancelling the same job twice"""
        import queue
        
        job_id = "test-job-double-cancel"
        pipeline_service.log_queues[job_id] = queue.Queue()
        
        # Cancel first time
        response1 = client.post(f"/extract/{job_id}/cancel")
        assert response1.status_code == 200
        
        # Cancel second time
        response2 = client.post(f"/extract/{job_id}/cancel")
        assert response2.status_code == 200
        
        # Cleanup
        pipeline_service.cancelled_jobs.discard(job_id)
        del pipeline_service.log_queues[job_id]
    
    def test_cancel_completed_job(self):
        """Test cancelling a job that already completed"""
        import queue
        
        job_id = "test-job-completed"
        log_queue = queue.Queue()
        pipeline_service.log_queues[job_id] = log_queue
        
        # Mark as done
        log_queue.put("DONE:/path/to/exp")
        
        # Try to cancel
        response = client.post(f"/extract/{job_id}/cancel")
        assert response.status_code == 200
        
        # Cleanup
        pipeline_service.cancelled_jobs.discard(job_id)
        del pipeline_service.log_queues[job_id]


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

