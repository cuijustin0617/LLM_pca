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
        """
        exp_path = Path(experiment_dir)
        gt_path = Path(ground_truth_path)
        
        if not exp_path.exists():
            raise FileNotFoundError(f"Experiment directory not found: {experiment_dir}")
        
        if not gt_path.exists():
            raise FileNotFoundError(f"Ground truth file not found: {ground_truth_path}")
            
        # Run evaluation
        # evaluate_experiment returns a dict of results
        results = evaluate_experiment(exp_path, gt_path)
        
        # It also saves files to exp_dir/evaluation
        # We can return the results dict directly
        return results

eval_service = EvalService()
