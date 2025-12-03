"""
Simple benchmark service - runs extraction + evaluation for one project at a time.
"""

import threading
import logging
import os
import sys
import json
import pandas as pd
from pathlib import Path
from dataclasses import dataclass, field
from typing import Optional, List, Dict
from datetime import datetime

# Add paths for imports
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(PROJECT_ROOT))
sys.path.insert(0, str(PROJECT_ROOT / "src"))
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))  # backend dir

from settings import PROJECTS_DIR, OUTPUT_DIR

logger = logging.getLogger("benchmark_service")


@dataclass
class ChunkResult:
    """Result from processing one chunk."""
    chunk_num: int
    total_chunks: int
    pages_start: int
    pages_end: int
    pca_count: int


@dataclass
class BenchmarkStatus:
    """Current status of a benchmark run."""
    job_id: str
    project_id: str
    prompt_version: str
    status: str = "idle"  # idle, running, completed, error
    current_step: str = ""
    progress_percent: float = 0.0
    
    # Extraction progress
    total_chunks: int = 0
    completed_chunks: int = 0
    chunk_results: List[ChunkResult] = field(default_factory=list)
    extracted_pcas: int = 0
    
    # Evaluation results
    metrics: Optional[Dict] = None
    ground_truth_count: int = 0
    
    experiment_dir: Optional[str] = None
    error: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None


class BenchmarkService:
    """
    Simple benchmark service - runs one benchmark at a time.
    A benchmark = extraction + evaluation against ground truth.
    """
    
    def __init__(self):
        self._lock = threading.Lock()
        self._status: Optional[BenchmarkStatus] = None
        self._running = False
        
    def is_busy(self) -> bool:
        """Check if a benchmark is currently running."""
        return self._running
    
    def get_status(self) -> Optional[dict]:
        """Get current benchmark status as dict."""
        if self._status is None:
            return {"status": "idle"}
        
        return {
            "job_id": self._status.job_id,
            "project_id": self._status.project_id,
            "prompt_version": self._status.prompt_version,
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
                }
                for cr in self._status.chunk_results
            ],
            "extracted_pcas": self._status.extracted_pcas,
            "metrics": self._status.metrics,
            "ground_truth_count": self._status.ground_truth_count,
            "experiment_dir": self._status.experiment_dir,
            "error": self._status.error,
            "started_at": self._status.started_at.isoformat() if self._status.started_at else None,
            "completed_at": self._status.completed_at.isoformat() if self._status.completed_at else None,
        }
    
    def get_projects(self) -> List[dict]:
        """Get list of available benchmark projects."""
        projects = []
        
        if not PROJECTS_DIR.exists():
            return projects
        
        for project_dir in sorted(PROJECTS_DIR.iterdir()):
            if not project_dir.is_dir():
                continue
            
            # Find ERIS PDF
            eris_files = list(project_dir.glob("ERIS*.pdf")) + list(project_dir.glob("ERIS-*.pdf"))
            # Find ground truth CSV
            gt_files = list(project_dir.glob("PCA*.csv")) + list(project_dir.glob("PCA-*.csv"))
            
            if eris_files and gt_files:
                # Count ERIS-sourced rows in ground truth only
                gt_count = 0
                try:
                    gt_df = pd.read_csv(gt_files[0])
                    if 'Source' in gt_df.columns:
                        gt_count = len(gt_df[gt_df['Source'] == 'ERIS'])
                    else:
                        gt_count = len(gt_df)
                except:
                    pass
                
                projects.append({
                    "project_id": project_dir.name,
                    "eris_pdf": eris_files[0].name,
                    "ground_truth_csv": gt_files[0].name,
                    "ground_truth_count": gt_count,
                })
        
        return projects
    
    def run_benchmark(self, project_id: str, prompt_version: str, api_key: str = None, chunk_size: int = 10000, model: str = "gemini-2.5-flash", temperature: float = 0.1) -> bool:
        """
        Start benchmark in background thread.
        Returns False if already running.
        """
        with self._lock:
            if self._running:
                return False
            self._running = True
        
        job_id = f"bench_{project_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        # Initialize status
        self._status = BenchmarkStatus(
            job_id=job_id,
            project_id=project_id,
            prompt_version=prompt_version,
            status="running",
            current_step="Initializing...",
            started_at=datetime.now()
        )
        
        # Run in background thread
        thread = threading.Thread(
            target=self._run_benchmark_sync,
            args=(project_id, prompt_version, job_id, api_key, chunk_size, model, temperature),
            daemon=True
        )
        thread.start()
        return True
    
    def _run_benchmark_sync(self, project_id: str, prompt_version: str, job_id: str, api_key: str = None, chunk_size: int = 10000, model: str = "gemini-2.5-flash", temperature: float = 0.1):
        """Run benchmark synchronously (called in background thread)."""
        logger.info(f"=" * 60)
        logger.info(f"BENCHMARK STARTED: Job {job_id}")
        logger.info(f"Project: {project_id}, Prompt: {prompt_version}")
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
            from src.prompts import COMPILE_PROMPT_TEMPLATE, format_extract_prompt
            from src.evaluate import evaluate_experiment
            
            # Find project files
            project_dir = PROJECTS_DIR / project_id
            eris_files = list(project_dir.glob("ERIS*.pdf")) + list(project_dir.glob("ERIS-*.pdf"))
            gt_files = list(project_dir.glob("PCA*.csv")) + list(project_dir.glob("PCA-*.csv"))
            
            if not eris_files:
                raise ValueError(f"No ERIS PDF found in {project_dir}")
            if not gt_files:
                raise ValueError(f"No ground truth CSV found in {project_dir}")
            
            pdf_path = eris_files[0]
            gt_path = gt_files[0]
            pca_list_path = Path(__file__).resolve().parent.parent.parent / "data" / "pca_definitions.txt"
            
            # Count ground truth (only ERIS rows)
            gt_df = pd.read_csv(gt_path)
            if 'Source' in gt_df.columns:
                eris_rows = gt_df[gt_df['Source'] == 'ERIS']
                self._status.ground_truth_count = len(eris_rows)
                logger.info(f"Ground truth: {len(eris_rows)} ERIS rows (out of {len(gt_df)} total)")
            else:
                self._status.ground_truth_count = len(gt_df)
                logger.warning("No 'Source' column in ground truth - using all rows")
            
            self._status.current_step = "Setting up extraction..."
            self._status.progress_percent = 5.0
            
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
                "project_id": project_id,
                "prompt_version": prompt_version,
                "provider": "gemini",
                "benchmark": True,
            })
            
            # Save project info for linking
            with open(exp_dir / "project_info.json", 'w') as f:
                json.dump({"project_name": project_id, "prompt_version": prompt_version}, f)
            
            # Load PCA definitions
            self._status.current_step = "Loading PCA definitions..."
            self._status.progress_percent = 8.0
            pca_def_text, num_to_name = load_pca_definitions(pca_list_path)
            
            # Extract text from PDF
            self._status.current_step = f"Extracting text from {pdf_path.name}..."
            self._status.progress_percent = 10.0
            pages = extract_page_texts(pdf_path)
            
            # Chunk pages
            self._status.current_step = f"Chunking {len(pages)} pages..."
            self._status.progress_percent = 15.0
            chunks = chunk_pages_by_words(pages, chunk_size)
            
            self._status.total_chunks = len(chunks)
            
            # Process each chunk
            all_rows = []
            base_progress = 15.0
            chunk_progress_range = 55.0  # 15% to 70%
            
            for idx, ch in enumerate(chunks, start=1):
                start, end = ch["start"], ch["end"]
                chunk_text = "\n\n".join(p["text"] for p in ch["pages"])
                
                self._status.current_step = f"Chunk {idx}/{len(chunks)} (pages {start}-{end}): calling Gemini..."
                self._status.progress_percent = base_progress + (idx - 1) / len(chunks) * chunk_progress_range
                
                # Save chunk text
                chunk_file = out_chunks / f"chunk_{idx:03d}_pages_{start:03d}-{end:03d}.txt"
                save_text(chunk_file, chunk_text)
                
                # Build prompt and call LLM
                prompt = format_extract_prompt(
                    pca_definitions=pca_def_text,
                    start=start,
                    end=end,
                    text=chunk_text
                )
                
                # Use model and temperature from parameters (passed from config)
                
                raw = call_gemini_json(prompt, model, temperature, api_key=api_key)
                
                # Save raw response
                save_text(out_chunks / f"chunk_{idx:03d}_gemini_raw.txt", raw)
                
                # Parse JSON
                obj = try_parse_json(raw)
                if obj is None:
                    fixed = llm_fix_to_json(raw, "gemini", model, temperature, api_key=api_key)
                    save_text(out_chunks / f"chunk_{idx:03d}_gemini_fixed.txt", fixed)
                    obj = try_parse_json(fixed)
                
                rows = []
                if obj and "rows" in obj and isinstance(obj["rows"], list):
                    rows = obj["rows"]
                    for r in rows:
                        r.setdefault("source_pages", f"{start}-{end}")
                    save_json(out_chunks / f"chunk_{idx:03d}_rows.json", rows)
                
                all_rows.extend(rows)
                logger.info(f"[Chunk {idx}/{len(chunks)}] Extracted {len(rows)} rows (total so far: {len(all_rows)})")
                
                # Save partial results immediately
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
                self._status.extracted_pcas = len(all_rows)
                
                self._status.current_step = f"Chunk {idx}/{len(chunks)} complete: {len(rows)} PCAs"
            
            logger.info(f"[Compile] Saved {len(all_rows)} raw rows, starting compilation...")
            
            # Compile and deduplicate
            self._status.current_step = "Compiling results..."
            self._status.progress_percent = 75.0
            
            compile_prompt = COMPILE_PROMPT_TEMPLATE.format(
                pca_definitions=pca_def_text,
                raw_rows_json=json.dumps(all_rows, indent=2)
            )
            logger.info(f"[Compile] Prompt length: {len(compile_prompt)} chars, calling Gemini...")
            
            compiled_raw = call_gemini_json(compile_prompt, model, temperature, api_key=api_key)
            logger.info(f"[Compile] Received response: {len(compiled_raw)} chars")
            save_text(out_final / "compiled_raw.txt", compiled_raw)
            
            compiled = try_parse_json(compiled_raw)
            if compiled is None:
                logger.warning("[Compile] JSON parse failed, attempting to fix...")
                fixed = llm_fix_to_json(compiled_raw, "gemini", model, temperature, api_key=api_key)
                compiled = try_parse_json(fixed)
                logger.info(f"[Compile] Fix attempt {'succeeded' if compiled else 'failed'}")
            
            final_rows = []
            if compiled and "rows" in compiled:
                final_rows = compiled["rows"]
            else:
                final_rows = all_rows
            
            # Filter out rows without valid pca_number (must be 1-59)
            before_filter = len(final_rows)
            final_rows = [r for r in final_rows if r.get("pca_number") is not None and isinstance(r.get("pca_number"), int) and 1 <= r.get("pca_number") <= 59]
            logger.info(f"[Filter] Removed {before_filter - len(final_rows)} rows without valid PCA number (kept {len(final_rows)})")
            
            # Add identifiers
            for i, r in enumerate(final_rows, start=1):
                r["pca_identifier"] = i
            
            # Save final results
            save_json(out_final / "final_rows_compiled.json", final_rows)
            self._status.extracted_pcas = len(final_rows)
            
            # Save CSV
            self._status.current_step = "Saving CSV..."
            self._status.progress_percent = 85.0
            
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
            
            # Run evaluation
            self._status.current_step = "Running evaluation..."
            self._status.progress_percent = 90.0
            logger.info(f"[Eval] Starting evaluation against ground truth...")
            
            # Only evaluate against ERIS-sourced ground truth rows (since we only extract from ERIS PDFs)
            eval_results = evaluate_experiment(exp_dir, gt_path, sources=['ERIS'])
            logger.info(f"[Eval] Results: TP={eval_results.get('true_positives')}, FP={eval_results.get('false_positives')}, FN={eval_results.get('false_negatives')}")
            logger.info(f"[Eval] Recall: {eval_results.get('recall', 0)*100:.1f}%")
            
            self._status.metrics = {
                "precision": eval_results.get("precision", 0),
                "recall": eval_results.get("recall", 0),
                "f1_score": eval_results.get("f1_score", 0),
                "true_positives": eval_results.get("true_positives", 0),
                "false_positives": eval_results.get("false_positives", 0),
                "false_negatives": eval_results.get("false_negatives", 0),
            }
            
            # Complete
            self._status.status = "completed"
            recall_pct = self._status.metrics["recall"] * 100
            self._status.current_step = f"Complete! Recall: {recall_pct:.1f}% ({len(final_rows)} extracted / {self._status.ground_truth_count} ground truth)"
            self._status.progress_percent = 100.0
            self._status.completed_at = datetime.now()
            logger.info(f"=" * 60)
            logger.info(f"BENCHMARK COMPLETED: Recall {recall_pct:.1f}%")
            logger.info(f"=" * 60)
            
        except Exception as e:
            logger.exception(f"Benchmark failed: {e}")
            self._status.status = "error"
            self._status.error = str(e)
            self._status.current_step = f"Error: {str(e)}"
            self._status.completed_at = datetime.now()
        
        finally:
            with self._lock:
                self._running = False


# Global singleton
benchmark_service = BenchmarkService()
