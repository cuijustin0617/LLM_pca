import sys
import os
import logging
from pathlib import Path
import shutil
import asyncio
import queue
from concurrent.futures import ThreadPoolExecutor

# Add project root to sys.path to import extract_pca_llm_simple
sys.path.append(str(Path(__file__).resolve().parent.parent.parent))
# Add src to sys.path to allow extract_pca_llm_simple to import prompts
sys.path.append(str(Path(__file__).resolve().parent.parent.parent / "src"))

from extract_pca_llm_simple import run_pipeline, setup_logging
from backend.settings import OUTPUT_DIR

# Create a thread pool for running the pipeline in the background
executor = ThreadPoolExecutor(max_workers=1)

class PipelineService:
    def __init__(self):
        self.logger = logging.getLogger("pipeline_service")
        self.logger.setLevel(logging.INFO)
        self.log_queues = {}  # Map job_id to queue
        self.cancelled_jobs = set()  # Track cancelled job IDs

    async def run_extraction(self, job_id: str, pdf_path: Path, pca_list_path: Path, provider: str, model: str, chunk_size: int, temperature: float, openai_api_key: str = None, gemini_api_key: str = None):
        """
        Runs the extraction pipeline in a separate thread to avoid blocking the event loop.
        """
        loop = asyncio.get_event_loop()
        
        # We need to capture logs for this specific run. 
        # For simplicity, we'll let run_pipeline handle its own file logging, 
        # and we can read the log file later if needed.
        # run_pipeline creates a new experiment directory and sets up logging there.
        
        # We need a dummy logger to pass to run_pipeline initially or let it setup its own.
        # Actually run_pipeline takes a logger.
        # Let's create a temporary logger that prints to stdout for now, 
        # but run_pipeline calls setup_logging which sets up a file handler.
        
        # We'll wrap the synchronous run_pipeline call
        def _run():
            # Setup a logger that writes to a specific log file for this run?
            # run_pipeline calls get_next_experiment_dir, so we don't know the dir yet.
            # But wait, run_pipeline takes `out_dir` and calls `setup_logging` internally? 
            # No, `main` calls `setup_logging`. `run_pipeline` takes `logger`.
            
            # So we need to setup logging here.
            # But we don't know the experiment ID yet.
            # Let's look at extract_pca_llm_simple.py again.
            # It calls get_next_experiment_dir inside run_pipeline.
            # This is a bit awkward because we want the log file to be in that dir.
            
            # I'll modify run_pipeline to return the exp_dir, or I'll duplicate the directory creation logic here.
            # Duplicating is safer to avoid modifying the original script too much.
            
            from extract_pca_llm_simple import get_next_experiment_dir, save_experiment_metadata, load_pca_definitions, extract_page_texts, chunk_pages_by_words, save_text, save_json, call_openai_json, call_gemini_json, try_parse_json, llm_fix_to_json
            
            # Re-implementing parts of run_pipeline to have better control, or just calling it?
            # Calling it is better for maintenance.
            # But I need the exp_dir.
            
            # Let's just pass a logger that logs to stdout, and rely on the fact that run_pipeline 
            # doesn't set up file logging itself, it just uses the passed logger.
            # The `main` function in `extract_pca_llm_simple.py` sets up logging.
            
            # So:
            # 1. Create exp_dir here.
            # 2. Setup logging to file in exp_dir.
            # 3. Call run_pipeline (I might need to modify it to accept exp_dir instead of out_dir if it creates it internally).
            
            # `run_pipeline` code:
            # def run_pipeline(..., out_dir, ...):
            #     exp_dir = get_next_experiment_dir(out_dir)
            
            # It creates the directory internally. 
            # I should probably modify `extract_pca_llm_simple.py` to optionally accept an `exp_dir` or return it.
            # Or I can just list the directories in OUTPUT_DIR before and after to find the new one.
            # That's a bit hacky but works without modifying legacy code.
            
            # Let's try to modify `extract_pca_llm_simple.py` to return `exp_dir`.
            # That is a small change.
            
            pass

        # For now, let's assume we modify extract_pca_llm_simple.py to return exp_dir
        # or we just let it run and find the latest dir.
        
        # Create a queue for this job
        log_queue = queue.Queue()
        self.log_queues[job_id] = log_queue

        return await loop.run_in_executor(executor, self._execute_pipeline, job_id, log_queue, pdf_path, pca_list_path, provider, model, chunk_size, temperature, openai_api_key, gemini_api_key)

    def _execute_pipeline(self, job_id: str, log_queue: queue.Queue, pdf_path: Path, pca_list_path: Path, provider: str, model: str, chunk_size: int, temperature: float, openai_api_key: str = None, gemini_api_key: str = None):
        # Setup logging
        logger = logging.getLogger(f"backend_pipeline_{job_id}")
        logger.handlers = []
        
        # Queue handler
        class QueueHandler(logging.Handler):
            def emit(self, record):
                log_queue.put(self.format(record))
        
        qh = QueueHandler()
        qh.setFormatter(logging.Formatter('%(message)s')) # Just message for cleaner UI
        logger.addHandler(qh)
        logger.setLevel(logging.INFO)
        
        # Also add console handler for debugging
        console_handler = logging.StreamHandler()
        console_handler.setFormatter(logging.Formatter('[PIPELINE] %(message)s'))
        logger.addHandler(console_handler)
        logger.setLevel(logging.DEBUG)
        
        # Set environment variables for the model
        logger.info(f"Setting up environment for {provider}/{model}")
        if openai_api_key:
            os.environ["OPENAI_API_KEY"] = openai_api_key
            logger.info("OpenAI API key configured")
        if gemini_api_key:
            os.environ["GOOGLE_API_KEY"] = gemini_api_key
            logger.info("Gemini API key configured")
            
        if provider == "openai":
            os.environ["OPENAI_MODEL"] = model
            logger.info(f"OpenAI model set to: {model}")
        elif provider == "gemini":
            os.environ["GEMINI_MODEL"] = model
            logger.info(f"Gemini model set to: {model}")
            
        # Log pipeline start
        logger.info("="*60)
        logger.info(f"Starting PCA extraction pipeline (Job ID: {job_id})")
        logger.info(f"PDF: {pdf_path.name}")
        logger.info(f"Provider: {provider}, Model: {model}")
        logger.info(f"Chunk size: {chunk_size} words, Temperature: {temperature}")
        logger.info("="*60)
        
        try:
            # Check for cancellation before starting
            if job_id in self.cancelled_jobs:
                log_queue.put("CANCELLED")
                self.cancelled_jobs.discard(job_id)
                return None
            
            logger.info("Initializing LLM pipeline...")
            logger.info(f"Checking PDF file: {pdf_path}")
            logger.info(f"PDF exists: {pdf_path.exists()}, Size: {pdf_path.stat().st_size if pdf_path.exists() else 'N/A'} bytes")
            
            logger.info(f"Checking PCA definitions file: {pca_list_path}")
            logger.info(f"PCA file exists: {pca_list_path.exists()}")
            
            run_pipeline(
                pdf_path=pdf_path,
                pca_list_path=pca_list_path,
                out_dir=OUTPUT_DIR,
                provider=provider,
                chunk_word_limit=chunk_size,
                temperature=temperature,
                vision=False, # Default to False for now
                logger=logger,
                model_name=model
            )
            
            # Check for cancellation after completion
            if job_id in self.cancelled_jobs:
                log_queue.put("CANCELLED")
                self.cancelled_jobs.discard(job_id)
                return None
            
            logger.info("Pipeline execution completed!")
            
            # Find the latest experiment dir
            # This is a race condition if multiple run at once, but we have max_workers=1
            subdirs = [d for d in OUTPUT_DIR.iterdir() if d.is_dir() and d.name.startswith("exp_")]
            if not subdirs:
                logger.error("No experiment directory found after pipeline execution!")
                log_queue.put("ERROR:No experiment directory created")
                return None
                
            latest_exp = max(subdirs, key=lambda x: x.name)
            logger.info(f"Found experiment directory: {latest_exp}")
            
            # Signal completion
            log_queue.put("DONE:" + str(latest_exp))
            return str(latest_exp)
            
        except Exception as e:
            import traceback
            error_details = traceback.format_exc()
            logger.error(f"Pipeline failed with exception: {e}")
            logger.error(f"Full traceback:\n{error_details}")
            log_queue.put(f"ERROR:{str(e)}")
            raise e
        finally:
            # Cleanup cancelled job tracking
            self.cancelled_jobs.discard(job_id)
            # Clean up queue after some time
            # Keep queue for a bit in case client reconnects
            pass

pipeline_service = PipelineService()
