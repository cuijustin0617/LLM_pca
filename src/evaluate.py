#!/usr/bin/env python3
"""
Evaluate extracted PCA table against ground truth.
Row-based comparison: each row = unique (Address + PCA) combination.
"""

import pandas as pd
import re
import json
from pathlib import Path
from difflib import SequenceMatcher
from typing import Tuple, Dict, List, Set

def normalize_address(addr: str) -> str:
    """Normalize address for comparison."""
    if pd.isna(addr):
        return ""
    addr = str(addr).upper().strip()
    addr = re.sub(r'\s+', ' ', addr)
    addr = addr.replace(',', '').replace('.', '')
    addr = re.sub(r'\bUNIT\b', '', addr)
    addr = re.sub(r'\bSUITE\b', '', addr)
    addr = re.sub(r'#\d+', '', addr)
    addr = re.sub(r'\b[A-Z]\d[A-Z]\s*\d[A-Z]\d\b', '', addr)
    addr = addr.replace(' ON ', ' ')
    addr = re.sub(r'\s+', ' ', addr).strip()
    return addr

def extract_street_address(addr: str) -> str:
    """Extract just the street number and name."""
    normalized = normalize_address(addr)
    match = re.match(r'(\d+[A-Z]?)\s+([A-Z]+(?:\s+[A-Z]+)?)', normalized)
    if match:
        return f"{match.group(1)} {match.group(2)}"
    return normalized

def extract_pca_number(text: str) -> str:
    """Extract PCA number from various formats."""
    if pd.isna(text):
        return ""
    text = str(text).strip()
    
    if text.isdigit():
        return text
    
    match = re.search(r'#(\d+)', text)
    if match:
        return match.group(1)
    
    match = re.search(r'\bPCA\s+(\d+)', text, re.IGNORECASE)
    if match:
        return match.group(1)
    
    match = re.match(r'(\d+)', text)
    if match:
        return match.group(1)
    
    return ""

def extract_street_number(addr: str) -> str:
    """Extract the street number from an address."""
    normalized = normalize_address(addr)
    match = re.match(r'^(\d+[A-Z]?)', normalized)
    if match:
        return match.group(1)
    return ""

def addresses_compatible(addr1: str, addr2: str) -> bool:
    """Check if two addresses are compatible (could refer to same or overlapping locations)."""
    norm1 = normalize_address(addr1)
    norm2 = normalize_address(addr2)
    
    # Extract street numbers
    street_num1 = extract_street_number(addr1)
    street_num2 = extract_street_number(addr2)
    
    # If street numbers differ, not compatible
    if street_num1 and street_num2 and street_num1 != street_num2:
        return False
    
    # Extract unit numbers if present
    units1 = re.findall(r'UNIT[S]?\s*(\d+(?:\s*(?:TO|-)\s*\d+)?)', norm1)
    units2 = re.findall(r'UNIT[S]?\s*(\d+(?:\s*(?:TO|-)\s*\d+)?)', norm2)
    
    # If one has units and the other doesn't, still compatible
    if not units1 or not units2:
        return True
    
    # Check if any unit numbers overlap
    def parse_unit_range(unit_str):
        """Parse unit string into set of numbers."""
        unit_str = unit_str.replace('-', ' TO ')
        if ' TO ' in unit_str:
            parts = unit_str.split(' TO ')
            try:
                start = int(parts[0].strip())
                end = int(parts[1].strip())
                return set(range(start, end + 1))
            except:
                return set()
        try:
            return {int(unit_str.strip())}
        except:
            return set()
    
    # Get all unit numbers for each address
    all_units1 = set()
    for u in units1:
        all_units1.update(parse_unit_range(u))
    
    all_units2 = set()
    for u in units2:
        all_units2.update(parse_unit_range(u))
    
    # Check if there's any overlap
    if all_units1 and all_units2:
        return len(all_units1 & all_units2) > 0
    
    return True

def address_containment_score(addr1: str, addr2: str) -> float:
    """Check if one address contains or mostly contains the other.
    Returns a score: 1.0 if fully contained, partial score if mostly contained, 0.0 otherwise.
    """
    if not addr1 or not addr2:
        return 0.0
    
    # Check full containment
    if addr1 in addr2 or addr2 in addr1:
        return 1.0
    
    # Check if shorter is mostly contained in longer
    shorter = addr1 if len(addr1) <= len(addr2) else addr2
    longer = addr1 if len(addr1) > len(addr2) else addr2
    
    # Split into words and check overlap
    shorter_words = set(shorter.split())
    longer_words = set(longer.split())
    
    if not shorter_words:
        return 0.0
    
    # What fraction of the shorter address's words appear in the longer?
    overlap = len(shorter_words & longer_words)
    containment_ratio = overlap / len(shorter_words)
    
    # If 80%+ of shorter's words are in longer, consider it a strong match
    if containment_ratio >= 0.8:
        return containment_ratio
    
    return 0.0

def find_matching_row(gt_row: pd.Series, extracted_df: pd.DataFrame, 
                     matched_indices: Set[int], threshold: float = 0.8) -> Tuple[int, float]:
    """Find matching row in extracted data."""
    gt_addr = extract_street_address(gt_row['Address'])
    gt_pca = extract_pca_number(gt_row['Potentially Contaminating Activity (PCA)'])
    
    if not gt_pca:
        return -1, 0.0
    
    best_idx = -1
    best_score = 0.0
    
    for idx, ext_row in extracted_df.iterrows():
        if idx in matched_indices:
            continue
        
        ext_addr = extract_street_address(ext_row['address'])
        ext_pca = extract_pca_number(ext_row['pca_number'])
        
        # PCA numbers must match exactly
        if gt_pca != ext_pca:
            continue
        
        # Check if addresses are compatible (same street number, overlapping units)
        if not addresses_compatible(gt_row['Address'], ext_row['address']):
            continue
        
        # Calculate similarity score
        addr_sim = SequenceMatcher(None, gt_addr, ext_addr).ratio()
        
        # Also check containment (one address contained in or mostly contained in other)
        containment = address_containment_score(gt_addr, ext_addr)
        
        # Use the better of the two scores
        effective_score = max(addr_sim, containment)
        
        if effective_score > best_score:
            best_score = effective_score
            best_idx = idx
    
    if best_score >= threshold:
        return best_idx, best_score
    return -1, 0.0

def calculate_metrics(gt_df: pd.DataFrame, extracted_df: pd.DataFrame, 
                     threshold: float = 0.5) -> Dict:
    """Calculate precision, recall, F1."""
    matched_extracted_indices = set()
    matches = []
    
    for gt_idx, gt_row in gt_df.iterrows():
        ext_idx, score = find_matching_row(gt_row, extracted_df, matched_extracted_indices, threshold)
        
        if ext_idx >= 0:
            matched_extracted_indices.add(ext_idx)
            matches.append({
                'gt_idx': gt_idx,
                'ext_idx': ext_idx,
                'score': score,
                'gt_address': gt_row['Address'],
                'ext_address': extracted_df.loc[ext_idx, 'address'],
                'pca_number': extract_pca_number(gt_row['Potentially Contaminating Activity (PCA)'])
            })
    
    true_positives = len(matches)
    false_negatives = len(gt_df) - true_positives
    false_positives = len(extracted_df) - true_positives
    
    precision = true_positives / len(extracted_df) if len(extracted_df) > 0 else 0
    recall = true_positives / len(gt_df) if len(gt_df) > 0 else 0
    f1_score = 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0
    accuracy = true_positives / (true_positives + false_positives + false_negatives)
    
    # Get false negatives and positives
    matched_gt_indices = {m['gt_idx'] for m in matches}
    false_negatives_list = [
        {
            'gt_idx': idx,
            'address': row['Address'],
            'pca': row['Potentially Contaminating Activity (PCA)'],
            'pca_number': extract_pca_number(row['Potentially Contaminating Activity (PCA)'])
        }
        for idx, row in gt_df.iterrows() if idx not in matched_gt_indices
    ]
    
    false_positives_list = [
        {
            'ext_idx': idx,
            'address': row['address'],
            'pca': f"{row['pca_number']}: {row['pca_name']}",
            'pca_number': extract_pca_number(row['pca_number'])
        }
        for idx, row in extracted_df.iterrows() if idx not in matched_extracted_indices
    ]
    
    return {
        'true_positives': true_positives,
        'false_positives': false_positives,
        'false_negatives': false_negatives,
        'precision': precision,
        'recall': recall,
        'f1_score': f1_score,
        'accuracy': accuracy,
        'matches': matches,
        'false_negatives_list': false_negatives_list,
        'false_positives_list': false_positives_list,
        'gt_count': len(gt_df),
        'extracted_count': len(extracted_df)
    }

def evaluate_experiment(exp_dir: Path, gt_file: Path, sources: List[str] = None) -> Dict:
    """Evaluate a single experiment against ground truth.
    
    Args:
        exp_dir: Experiment directory
        gt_file: Ground truth CSV file
        sources: List of source types to include in evaluation (e.g., ['ERIS', 'CD'])
                If None, uses all rows from ground truth.
    """
    csv_file = exp_dir / "final" / "final_rows_compiled.csv"
    
    if not csv_file.exists():
        raise FileNotFoundError(f"No results file found: {csv_file}")
    
    if not gt_file.exists():
        raise FileNotFoundError(f"Ground truth not found: {gt_file}")
    
    gt_df = pd.read_csv(gt_file)
    
    # Filter ground truth by source if specified
    if sources is not None:
        if 'Source' in gt_df.columns:
            original_count = len(gt_df)
            gt_df = gt_df[gt_df['Source'].isin(sources)].copy()
            filtered_count = len(gt_df)
            print(f"Filtered ground truth by sources {sources}: {original_count} → {filtered_count} rows")
        else:
            print("Warning: 'Source' column not found in ground truth CSV. Using all rows.")
    
    extracted_df = pd.read_csv(csv_file)
    
    results = calculate_metrics(gt_df, extracted_df)
    results['sources_filter'] = sources  # Track what sources were used
    
    # Save results
    eval_dir = exp_dir / "evaluation"
    eval_dir.mkdir(exist_ok=True)
    
    # Save summary
    summary = {
        'ground_truth_file': str(gt_file),
        'extracted_file': str(csv_file),
        'sources_filter': results.get('sources_filter'),
        'metrics': {
            'precision': results['precision'],
            'recall': results['recall'],
            'f1_score': results['f1_score'],
            'accuracy': results['accuracy'],
            'true_positives': results['true_positives'],
            'false_positives': results['false_positives'],
            'false_negatives': results['false_negatives'],
            'gt_count': results['gt_count'],
            'extracted_count': results['extracted_count']
        }
    }
    
    with open(eval_dir / "metrics.json", 'w') as f:
        json.dump(summary, f, indent=2)
    
    # Save matches
    if results['matches']:
        pd.DataFrame(results['matches']).to_csv(eval_dir / "matches.csv", index=False)
    
    # Save false negatives
    if results['false_negatives_list']:
        pd.DataFrame(results['false_negatives_list']).to_csv(eval_dir / "false_negatives.csv", index=False)
    
    # Save false positives
    if results['false_positives_list']:
        pd.DataFrame(results['false_positives_list']).to_csv(eval_dir / "false_positives.csv", index=False)
    
    return results

def print_results(results: Dict, exp_name: str = "Experiment"):
    """Print evaluation results."""
    print("=" * 80)
    print(f"{exp_name} - EVALUATION RESULTS")
    print("=" * 80)
    print()
    print(f"Ground Truth Rows:    {results['gt_count']}")
    print(f"Extracted Rows:       {results['extracted_count']}")
    print(f"Correctly Matched:    {results['true_positives']}")
    print(f"False Positives:      {results['false_positives']}")
    print(f"False Negatives:      {results['false_negatives']}")
    print()
    print(f"Precision:  {results['precision']:.2%}")
    print(f"Recall:     {results['recall']:.2%}")
    print(f"F1 Score:   {results['f1_score']:.2%}")
    print(f"Accuracy:   {results['accuracy']:.2%}")
    print("=" * 80)

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Evaluate PCA extraction against ground truth")
    parser.add_argument("--experiment", required=True, help="Experiment directory (e.g., outputs/experiments/exp_001)")
    parser.add_argument("--ground-truth", required=True, help="Ground truth CSV file")
    parser.add_argument("--sources", nargs='+', default=None, 
                       help="Source types to include (e.g., --sources ERIS CD FIP). If not specified, uses all sources.")
    
    args = parser.parse_args()
    
    exp_dir = Path(args.experiment)
    gt_file = Path(args.ground_truth)
    
    results = evaluate_experiment(exp_dir, gt_file, sources=args.sources)
    print_results(results, exp_dir.name)
    
    eval_dir = exp_dir / "evaluation"
    print()
    print(f"Results saved to: {eval_dir}")
    print(f"  - metrics.json")
    print(f"  - matches.csv")
    print(f"  - false_negatives.csv")
    print(f"  - false_positives.csv")

