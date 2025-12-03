import sys
from pathlib import Path
import json

# Add project root to sys.path
sys.path.append(str(Path(__file__).resolve().parent.parent.parent))

from src.evaluate import evaluate_experiment

class EvalService:
    def run_evaluation(self, experiment_dir: str, ground_truth_path: str):
        """
        Runs the evaluation for a specific experiment against a ground truth file.
        Returns structured result with nested metrics for frontend consumption.
        """
        exp_path = Path(experiment_dir)
        gt_path = Path(ground_truth_path)
        
        if not exp_path.exists():
            raise FileNotFoundError(f"Experiment directory not found: {experiment_dir}")
        
        if not gt_path.exists():
            raise FileNotFoundError(f"Ground truth file not found: {ground_truth_path}")
            
        # Run evaluation
        # evaluate_experiment returns a flat dict with metrics at top level
        results = evaluate_experiment(exp_path, gt_path)
        
        # Structure the response to match frontend expectations
        # Frontend expects: job.result.metrics.recall, job.result.metrics.precision, etc.
        structured_result = {
            'metrics': {
                'precision': results.get('precision', 0),
                'recall': results.get('recall', 0),
                'f1_score': results.get('f1_score', 0),
                'accuracy': results.get('accuracy', 0),
                'true_positives': results.get('true_positives', 0),
                'false_positives': results.get('false_positives', 0),
                'false_negatives': results.get('false_negatives', 0),
                'gt_count': results.get('gt_count', 0),
                'extracted_count': results.get('extracted_count', 0),
            },
            'ground_truth_file': str(gt_path),
            'extracted_file': str(exp_path / "final" / "final_rows_compiled.csv"),
            'sources_filter': results.get('sources_filter'),
        }
        
        return structured_result

eval_service = EvalService()
