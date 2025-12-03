"""
Simple extraction service - runs one extraction at a time.
Provides clear status updates for UI progress display.
"""

import threading
import logging
import os
import sys
import json
from pathlib import Path
from dataclasses import dataclass, field
from typing import Optional, List, Callable
from datetime import datetime

# Add paths for imports
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(PROJECT_ROOT))
sys.path.insert(0, str(PROJECT_ROOT / "src"))
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))  # backend dir

from settings import OUTPUT_DIR

logger = logging.getLogger("extraction_service")


@dataclass
class ChunkResult:
    """Result from processing one chunk."""
    chunk_num: int
    total_chunks: int
    pages_start: int
    pages_end: int
    pca_count: int
    status: str = "completed"  # completed, error


@dataclass 
class ExtractionStatus:
    """Current status of an extraction job."""
    job_id: str
    status: str = "idle"  # idle, running, completed, error
    current_step: str = ""
    progress_percent: float = 0.0
    total_chunks: int = 0
    completed_chunks: int = 0
    chunk_results: List[ChunkResult] = field(default_factory=list)
    total_pcas: int = 0
    experiment_dir: Optional[str] = None
    error: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None


class ExtractionService:
    """
    Simple extraction service that runs one extraction at a time.
    Thread-safe with clear status updates.
    """
    
    def __init__(self):
        self._lock = threading.Lock()
        self._status: Optional[ExtractionStatus] = None
        self._running = False
        
    def is_busy(self) -> bool:
        """Check if an extraction is currently running."""
        return self._running
    
    def reset(self):
        """Reset the status to allow a new extraction."""
        with self._lock:
            if not self._running:
                self._status = None
    
    def get_status(self) -> Optional[dict]:
        """Get current extraction status as dict."""
        if self._status is None:
            return {"status": "idle"}
        
        return {
            "job_id": self._status.job_id,
            "status": self._status.status,
            "current_step": self._status.current_step,
            "progress_percent": self._status.progress_percent,
            "total_chunks": self._status.total_chunks,
            "completed_chunks": self._status.completed_chunks,
            "chunk_results": [
                {
                    "chunk_num": cr.chunk_num,
                    "total_chunks": cr.total_chunks,
                    "pages_start": cr.pages_start,
                    "pages_end": cr.pages_end,
                    "pca_count": cr.pca_count,
                    "status": cr.status,
                }
                for cr in self._status.chunk_results
            ],
            "total_pcas": self._status.total_pcas,
            "experiment_dir": self._status.experiment_dir,
            "error": self._status.error,
            "started_at": self._status.started_at.isoformat() if self._status.started_at else None,
            "completed_at": self._status.completed_at.isoformat() if self._status.completed_at else None,
        }
    
    def run_extraction(self, pdf_path: Path, job_id: str, api_key: str = None, chunk_size: int = 10000, prompt_version: str = "v1", model: str = "gemini-2.5-flash", temperature: float = 0.1) -> bool:
        """
        Start extraction in background thread.
        Returns False if already running.
        """
        with self._lock:
            if self._running:
                return False
            self._running = True
            
        # Initialize status
        self._status = ExtractionStatus(
            job_id=job_id,
            status="running",
            current_step="Initializing...",
            started_at=datetime.now()
        )
        
        # Run in background thread
        thread = threading.Thread(
            target=self._run_extraction_sync,
            args=(pdf_path, job_id, api_key, chunk_size, prompt_version, model, temperature),
            daemon=True
        )
        thread.start()
        return True
    
    def _run_extraction_sync(self, pdf_path: Path, job_id: str, api_key: str = None, chunk_size: int = 10000, prompt_version: str = "v1", model: str = "gemini-2.5-flash", temperature: float = 0.1):
        """Run extraction synchronously (called in background thread)."""
        logger.info(f"=" * 60)
        logger.info(f"EXTRACTION STARTED: Job {job_id}")
        logger.info(f"PDF: {pdf_path}")
        logger.info(f"Prompt Version: {prompt_version}")
        logger.info(f"Model: {model}, Temperature: {temperature}")
        logger.info(f"=" * 60)
        
        try:
            # Import here to avoid circular imports
            from extract_pca_llm_simple import (
                extract_page_texts, chunk_pages_by_words,
                load_pca_definitions, call_gemini_json,
                try_parse_json, llm_fix_to_json, save_text, save_json,
                get_next_experiment_dir, save_experiment_metadata
            )
            from src.prompts import COMPILE_PROMPT_TEMPLATE
            
            # Load the prompt template for this version
            prompts_dir = Path(__file__).resolve().parent.parent.parent / "prompts"
            prompt_file = prompts_dir / f"{prompt_version}_extract.txt"
            if not prompt_file.exists():
                prompt_file = prompts_dir / "v1_extract.txt"
                logger.warning(f"Prompt {prompt_version} not found, using v1")
            
            with open(prompt_file, 'r') as f:
                prompt_template = f.read()
            logger.info(f"Loaded prompt template: {prompt_file.name} ({len(prompt_template)} chars)")
            
            # Setup
            pca_list_path = Path(__file__).resolve().parent.parent.parent / "data" / "pca_definitions.txt"
            
            self._status.current_step = "Setting up extraction..."
            self._status.progress_percent = 5.0
            logger.info("Setting up extraction...")
            
            # Create experiment directory
            exp_dir = get_next_experiment_dir(OUTPUT_DIR)
            self._status.experiment_dir = str(exp_dir)
            
            out_chunks = exp_dir / "chunks"
            out_final = exp_dir / "final"
            out_chunks.mkdir(parents=True, exist_ok=True)
            out_final.mkdir(parents=True, exist_ok=True)
            
            # Save metadata
            save_experiment_metadata(exp_dir, {
                "pdf": str(pdf_path),
                "job_id": job_id,
                "provider": "gemini",
                "prompt_version": prompt_version,
            })
            
            # Load PCA definitions
            self._status.current_step = "Loading PCA definitions..."
            self._status.progress_percent = 10.0
            logger.info("Loading PCA definitions...")
            pca_def_text, num_to_name = load_pca_definitions(pca_list_path)
            logger.info(f"Loaded {len(num_to_name)} PCA types")
            
            # Extract text from PDF
            self._status.current_step = "Extracting text from PDF..."
            self._status.progress_percent = 15.0
            logger.info(f"Extracting text from PDF: {pdf_path.name}")
            pages = extract_page_texts(pdf_path)
            logger.info(f"Extracted {len(pages)} pages from PDF")
            
            # Chunk pages
            self._status.current_step = f"Chunking {len(pages)} pages..."
            self._status.progress_percent = 20.0
            logger.info(f"Chunking with word limit: {chunk_size}")
            chunks = chunk_pages_by_words(pages, chunk_size)
            logger.info(f"Created {len(chunks)} chunks")
            
            self._status.total_chunks = len(chunks)
            
            # Process each chunk
            all_rows = []
            base_progress = 20.0
            chunk_progress_range = 60.0  # 20% to 80%
            
            for idx, ch in enumerate(chunks, start=1):
                start, end = ch["start"], ch["end"]
                chunk_text = "\n\n".join(p["text"] for p in ch["pages"])
                
                self._status.current_step = f"Processing chunk {idx}/{len(chunks)} (pages {start}-{end})..."
                self._status.progress_percent = base_progress + (idx - 1) / len(chunks) * chunk_progress_range
                
                # Save chunk text
                chunk_file = out_chunks / f"chunk_{idx:03d}_pages_{start:03d}-{end:03d}.txt"
                save_text(chunk_file, chunk_text)
                
                # Build prompt by appending document text to template
                prompt = f"{prompt_template}\n\n## Document Text (Pages {start}-{end})\n\n{chunk_text}"
                
                # Use model and temperature from parameters (passed from config)
                
                self._status.current_step = f"Chunk {idx}/{len(chunks)}: Calling Gemini API..."
                logger.info(f"[Chunk {idx}/{len(chunks)}] Calling Gemini API (model={model}, temp={temperature})")
                logger.debug(f"[Chunk {idx}] Prompt length: {len(prompt)} chars")
                
                raw = call_gemini_json(prompt, model, temperature, api_key=api_key)
                
                logger.info(f"[Chunk {idx}] Gemini response received: {len(raw)} chars")
                logger.debug(f"[Chunk {idx}] Response preview: {raw[:500]}...")
                
                # Save raw response
                save_text(out_chunks / f"chunk_{idx:03d}_gemini_raw.txt", raw)
                
                # Parse JSON
                obj = try_parse_json(raw)
                if obj is None:
                    logger.warning(f"[Chunk {idx}] JSON parse failed, attempting to fix...")
                    self._status.current_step = f"Chunk {idx}/{len(chunks)}: Fixing JSON..."
                    fixed = llm_fix_to_json(raw, "gemini", model, temperature, api_key=api_key)
                    logger.info(f"[Chunk {idx}] JSON fix response: {len(fixed)} chars")
                    save_text(out_chunks / f"chunk_{idx:03d}_gemini_fixed.txt", fixed)
                    obj = try_parse_json(fixed)
                    if obj:
                        logger.info(f"[Chunk {idx}] JSON fixed successfully")
                    else:
                        logger.error(f"[Chunk {idx}] JSON fix failed - no valid JSON")
                
                rows = []
                if obj and "rows" in obj and isinstance(obj["rows"], list):
                    rows = obj["rows"]
                    logger.info(f"[Chunk {idx}] Extracted {len(rows)} PCA rows")
                    for r in rows:
                        r.setdefault("source_pages", f"{start}-{end}")
                    save_json(out_chunks / f"chunk_{idx:03d}_rows.json", rows)
                else:
                    logger.warning(f"[Chunk {idx}] No valid rows extracted from response")
                
                all_rows.extend(rows)
                
                # Save partial results immediately so preview can show them
                save_json(out_final / "all_rows_raw.json", all_rows)
                
                # Record chunk result
                chunk_result = ChunkResult(
                    chunk_num=idx,
                    total_chunks=len(chunks),
                    pages_start=start,
                    pages_end=end,
                    pca_count=len(rows)
                )
                self._status.chunk_results.append(chunk_result)
                self._status.completed_chunks = idx
                self._status.total_pcas = len(all_rows)
                
                self._status.current_step = f"Chunk {idx}/{len(chunks)} complete: found {len(rows)} PCAs"
            
            # Compile and deduplicate
            self._status.current_step = "Compiling and deduplicating results..."
            self._status.progress_percent = 85.0
            logger.info(f"[Compile] Starting deduplication of {len(all_rows)} raw rows")
            
            compile_prompt = COMPILE_PROMPT_TEMPLATE.format(
                pca_definitions=pca_def_text,
                raw_rows_json=json.dumps(all_rows, indent=2)
            )
            
            logger.info(f"[Compile] Calling Gemini for deduplication...")
            compiled_raw = call_gemini_json(compile_prompt, model, temperature, api_key=api_key)
            logger.info(f"[Compile] Received response: {len(compiled_raw)} chars")
            save_text(out_final / "compiled_raw.txt", compiled_raw)
            
            compiled = try_parse_json(compiled_raw)
            if compiled is None:
                fixed = llm_fix_to_json(compiled_raw, "gemini", model, temperature, api_key=api_key)
                compiled = try_parse_json(fixed)
            
            final_rows = []
            if compiled and "rows" in compiled:
                final_rows = compiled["rows"]
            else:
                final_rows = all_rows  # Fallback to raw rows
            
            # Filter out rows without valid pca_number (must be 1-59)
            before_filter = len(final_rows)
            final_rows = [r for r in final_rows if r.get("pca_number") is not None and isinstance(r.get("pca_number"), int) and 1 <= r.get("pca_number") <= 59]
            logger.info(f"[Filter] Removed {before_filter - len(final_rows)} rows without valid PCA number (kept {len(final_rows)})")
            
            # Add identifiers
            for i, r in enumerate(final_rows, start=1):
                r["pca_identifier"] = i
            
            # Save final results
            save_json(out_final / "final_rows_compiled.json", final_rows)
            
            # Save CSV
            self._status.current_step = "Saving CSV..."
            self._status.progress_percent = 95.0
            
            csv_path = out_final / "final_rows_compiled.csv"
            cols = ["pca_identifier", "address", "location_relation_to_site", "pca_number", "pca_name", "description_timeline", "source_pages"]
            
            def esc(s):
                s = str(s) if s is not None else ""
                if "," in s or '"' in s or "\n" in s:
                    return '"' + s.replace('"', '""') + '"'
                return s
            
            with csv_path.open("w", encoding="utf-8", newline="") as f:
                f.write(",".join(cols) + "\n")
                for r in final_rows:
                    f.write(",".join(esc(r.get(c, "")) for c in cols) + "\n")
            
            # Complete
            self._status.status = "completed"
            self._status.current_step = f"Complete! Extracted {len(final_rows)} PCAs"
            self._status.progress_percent = 100.0
            self._status.total_pcas = len(final_rows)
            self._status.completed_at = datetime.now()
            
            logger.info(f"=" * 60)
            logger.info(f"EXTRACTION COMPLETED: Job {job_id}")
            logger.info(f"Total PCAs extracted: {len(final_rows)}")
            logger.info(f"Output dir: {exp_dir}")
            logger.info(f"=" * 60)
            
        except Exception as e:
            logger.error(f"=" * 60)
            logger.error(f"EXTRACTION FAILED: Job {job_id}")
            logger.exception(f"Error: {e}")
            logger.error(f"=" * 60)
            self._status.status = "error"
            self._status.error = str(e)
            self._status.current_step = f"Error: {str(e)}"
            self._status.completed_at = datetime.now()
        
        finally:
            with self._lock:
                self._running = False


# Global singleton
extraction_service = ExtractionService()
