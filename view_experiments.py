#!/usr/bin/env python3
"""
Helper script to view and compare experiments.
"""

import json
import argparse
from pathlib import Path
from datetime import datetime

def list_experiments(output_dir: Path):
    """List all experiments with their configurations."""
    exp_dirs = sorted([d for d in output_dir.iterdir() if d.is_dir() and d.name.startswith("exp_")])
    
    if not exp_dirs:
        print("No experiments found.")
        return
    
    print("=" * 100)
    print(f"{'Exp':^8} | {'Date':^20} | {'Provider':^10} | {'Model':^20} | {'Rows':^8} | {'Notes'}")
    print("=" * 100)
    
    for exp_dir in exp_dirs:
        config_file = exp_dir / "experiment_config.json"
        csv_file = exp_dir / "final" / "final_rows_compiled.csv"
        
        if not config_file.exists():
            continue
        
        with open(config_file) as f:
            config = json.load(f)
        
        exp_name = config.get("experiment", exp_dir.name)
        timestamp = config.get("timestamp", "unknown")
        params = config.get("parameters", {})
        provider = params.get("provider", "?")
        model = params.get("model", "?")
        
        # Count rows in CSV
        row_count = "?"
        if csv_file.exists():
            with open(csv_file) as f:
                row_count = sum(1 for _ in f) - 1  # Subtract header
        
        # Parse timestamp
        try:
            dt = datetime.fromisoformat(timestamp)
            date_str = dt.strftime("%Y-%m-%d %H:%M")
        except:
            date_str = timestamp[:20]
        
        print(f"{exp_name:^8} | {date_str:^20} | {provider:^10} | {model:^20} | {row_count:^8} | ")
    
    print("=" * 100)

def show_experiment(output_dir: Path, exp_num: int):
    """Show detailed information about a specific experiment."""
    exp_dir = output_dir / f"exp_{exp_num:03d}"
    
    if not exp_dir.exists():
        print(f"Experiment exp_{exp_num:03d} not found.")
        return
    
    config_file = exp_dir / "experiment_config.json"
    if not config_file.exists():
        print(f"No config file found for exp_{exp_num:03d}")
        return
    
    with open(config_file) as f:
        config = json.load(f)
    
    print("=" * 80)
    print(f"Experiment: {config.get('experiment', f'exp_{exp_num:03d}')}")
    print("=" * 80)
    print(f"Timestamp: {config.get('timestamp', 'unknown')}")
    print()
    
    params = config.get("parameters", {})
    print("Parameters:")
    for key, value in params.items():
        print(f"  {key:20s}: {value}")
    print()
    
    # Show file paths
    print("Output Files:")
    files = [
        ("Config", exp_dir / "experiment_config.json"),
        ("Prompts", exp_dir / "prompts.py"),
        ("CSV", exp_dir / "final" / "final_rows_compiled.csv"),
        ("JSON", exp_dir / "final" / "final_rows_compiled.json"),
        ("Log", exp_dir / "logs" / "run.log"),
    ]
    
    for name, path in files:
        exists = "✓" if path.exists() else "✗"
        print(f"  [{exists}] {name:10s}: {path}")
    
    # Show row count
    csv_file = exp_dir / "final" / "final_rows_compiled.csv"
    if csv_file.exists():
        with open(csv_file) as f:
            row_count = sum(1 for _ in f) - 1
        print()
        print(f"Total Rows Extracted: {row_count}")
    
    print("=" * 80)

def compare_experiments(output_dir: Path, exp1: int, exp2: int):
    """Compare two experiments."""
    exp1_dir = output_dir / f"exp_{exp1:03d}"
    exp2_dir = output_dir / f"exp_{exp2:03d}"
    
    if not exp1_dir.exists() or not exp2_dir.exists():
        print("One or both experiments not found.")
        return
    
    print("=" * 80)
    print(f"Comparing exp_{exp1:03d} vs exp_{exp2:03d}")
    print("=" * 80)
    
    # Load configs
    with open(exp1_dir / "experiment_config.json") as f:
        config1 = json.load(f)
    with open(exp2_dir / "experiment_config.json") as f:
        config2 = json.load(f)
    
    # Compare parameters
    params1 = config1.get("parameters", {})
    params2 = config2.get("parameters", {})
    
    print("\nParameter Differences:")
    all_keys = set(params1.keys()) | set(params2.keys())
    for key in sorted(all_keys):
        val1 = params1.get(key, "N/A")
        val2 = params2.get(key, "N/A")
        if val1 != val2:
            print(f"  {key:20s}: {val1} → {val2}")
    
    # Compare row counts
    csv1 = exp1_dir / "final" / "final_rows_compiled.csv"
    csv2 = exp2_dir / "final" / "final_rows_compiled.csv"
    
    if csv1.exists() and csv2.exists():
        with open(csv1) as f:
            count1 = sum(1 for _ in f) - 1
        with open(csv2) as f:
            count2 = sum(1 for _ in f) - 1
        
        print(f"\nRow Count: {count1} → {count2} (", end="")
        if count2 > count1:
            print(f"+{count2 - count1})")
        elif count2 < count1:
            print(f"{count2 - count1})")
        else:
            print("no change)")
    
    print("\nPrompts Difference:")
    prompts1 = exp1_dir / "prompts.py"
    prompts2 = exp2_dir / "prompts.py"
    
    if prompts1.exists() and prompts2.exists():
        # Simple line count comparison
        with open(prompts1) as f:
            lines1 = len(f.readlines())
        with open(prompts2) as f:
            lines2 = len(f.readlines())
        
        print(f"  Lines: {lines1} → {lines2}")
        
        if lines1 != lines2:
            print(f"  Run: diff {prompts1} {prompts2}")
    
    print("=" * 80)

def main():
    parser = argparse.ArgumentParser(description="View and compare PCA extraction experiments")
    parser.add_argument("--dir", default="outputs", help="Experiments directory")
    parser.add_argument("--list", action="store_true", help="List all experiments")
    parser.add_argument("--show", type=int, metavar="N", help="Show details of experiment N")
    parser.add_argument("--compare", type=int, nargs=2, metavar=("N1", "N2"), help="Compare two experiments")
    
    args = parser.parse_args()
    output_dir = Path(args.dir)
    
    if args.list:
        list_experiments(output_dir)
    elif args.show is not None:
        show_experiment(output_dir, args.show)
    elif args.compare:
        compare_experiments(output_dir, args.compare[0], args.compare[1])
    else:
        # Default: list experiments
        list_experiments(output_dir)

if __name__ == "__main__":
    main()

