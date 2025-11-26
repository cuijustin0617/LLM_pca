#!/usr/bin/env python3
"""
Run extraction and evaluation for PCA projects.
Each project has: ERIS.pdf and gt_PCA.csv
"""

import argparse
import sys
from pathlib import Path
import subprocess
import json

def find_projects(projects_dir: Path) -> list:
    """Find all valid project directories."""
    projects = []
    for project_dir in projects_dir.iterdir():
        if not project_dir.is_dir():
            continue
        
        eris_pdf = project_dir / "ERIS.pdf"
        gt_csv = project_dir / "gt_PCA.csv"
        
        if eris_pdf.exists() and gt_csv.exists():
            # Detect available source documents
            sources = []
            if eris_pdf.exists():
                sources.append('ERIS')
            # Check for other potential source files
            if (project_dir / "CityDirectory.pdf").exists():
                sources.append('CD')
            if (project_dir / "FIP.pdf").exists():
                sources.append('FIP')
            
            projects.append({
                'name': project_dir.name,
                'dir': project_dir,
                'eris': eris_pdf,
                'ground_truth': gt_csv,
                'sources': sources
            })
    
    return sorted(projects, key=lambda x: x['name'])

def run_extraction(project: dict, provider: str, output_dir: Path) -> Path:
    """Run extraction for a project."""
    print(f"\n{'='*80}")
    print(f"EXTRACTING: {project['name']}")
    print(f"{'='*80}\n")
    
    # Get PCA definitions (shared across projects)
    pca_list = Path("data/pca_definitions.txt")
    if not pca_list.exists():
        raise FileNotFoundError(f"PCA definitions not found: {pca_list}")
    
    # Run extraction
    cmd = [
        sys.executable,
        "src/extract_pca_llm_simple.py",
        "--pdf", str(project['eris']),
        "--pca-list", str(pca_list),
        "--out", str(output_dir),
        "--provider", provider
    ]
    
    result = subprocess.run(cmd, capture_output=False, text=True)
    
    if result.returncode != 0:
        print(f"\nExtraction failed for {project['name']}")
        return None
    
    # Find the latest experiment directory
    exp_dirs = sorted([d for d in output_dir.iterdir() if d.is_dir() and d.name.startswith("exp_")])
    if not exp_dirs:
        print(f"\nNo experiment directory found")
        return None
    
    latest_exp = exp_dirs[-1]
    
    # Save project info to experiment
    project_info = {
        'project_name': project['name'],
        'eris_file': str(project['eris']),
        'ground_truth_file': str(project['ground_truth'])
    }
    
    with open(latest_exp / "project_info.json", 'w') as f:
        json.dump(project_info, f, indent=2)
    
    return latest_exp

def run_evaluation(exp_dir: Path, gt_file: Path, sources: list = None):
    """Run evaluation for an experiment.
    
    Args:
        exp_dir: Experiment directory
        gt_file: Ground truth CSV file
        sources: List of source types to filter ground truth by (e.g., ['ERIS', 'CD'])
    """
    print(f"\n{'='*80}")
    print(f"EVALUATING: {exp_dir.name}")
    print(f"{'='*80}\n")
    
    cmd = [
        sys.executable,
        "src/evaluate.py",
        "--experiment", str(exp_dir),
        "--ground-truth", str(gt_file)
    ]
    
    if sources:
        cmd.extend(["--sources"] + sources)
        print(f"Filtering ground truth by sources: {sources}\n")
    
    subprocess.run(cmd, capture_output=False, text=True)

def main():
    parser = argparse.ArgumentParser(description="Run PCA extraction and evaluation on projects")
    parser.add_argument("--project", help="Specific project name to run")
    parser.add_argument("--all", action="store_true", help="Run on all projects")
    parser.add_argument("--provider", choices=["openai", "gemini", "both"], default="gemini", help="LLM provider")
    parser.add_argument("--projects-dir", default="data/projects", help="Projects directory")
    parser.add_argument("--output-dir", default="outputs/experiments", help="Output directory")
    parser.add_argument("--skip-extraction", action="store_true", help="Skip extraction, only evaluate latest experiment")
    
    args = parser.parse_args()
    
    projects_dir = Path(args.projects_dir)
    output_dir = Path(args.output_dir)
    
    if not projects_dir.exists():
        print(f"Projects directory not found: {projects_dir}")
        return
    
    # Find projects
    projects = find_projects(projects_dir)
    
    if not projects:
        print(f"No projects found in {projects_dir}")
        print("\nProject structure:")
        print("  data/projects/")
        print("    project_name/")
        print("      ERIS.pdf")
        print("      gt_PCA.csv")
        return
    
    print(f"Found {len(projects)} projects:")
    for p in projects:
        print(f"  - {p['name']}")
    print()
    
    # Filter projects
    if args.project:
        projects = [p for p in projects if p['name'] == args.project]
        if not projects:
            print(f"Project not found: {args.project}")
            return
    elif not args.all:
        print("Please specify --project NAME or --all")
        return
    
    # Run on each project
    for project in projects:
        if args.skip_extraction:
            # Find latest experiment for this project
            exp_dirs = sorted([d for d in output_dir.iterdir() if d.is_dir() and d.name.startswith("exp_")])
            if exp_dirs:
                latest_exp = exp_dirs[-1]
                run_evaluation(latest_exp, project['ground_truth'], sources=project.get('sources'))
            else:
                print(f"No experiments found for evaluation")
        else:
            # Run extraction
            exp_dir = run_extraction(project, args.provider, output_dir)
            
            if exp_dir:
                # Run evaluation
                run_evaluation(exp_dir, project['ground_truth'], sources=project.get('sources'))
    
    print(f"\n{'='*80}")
    print("DONE")
    print(f"{'='*80}\n")

if __name__ == "__main__":
    main()

