"""
Test cases for prompt v1 refinement to reduce false positives.
Tests that the refined prompt correctly filters out non-industrial operations.
"""

import sys
from pathlib import Path
import pytest

# Add src to path
sys.path.append(str(Path(__file__).resolve().parent.parent.parent / "src"))

from src.prompts import load_prompt_version


def test_prompt_v1_has_critical_filtering_section():
    """Test that v1 prompt contains the critical filtering guidelines."""
    prompt_content = load_prompt_version("v1")
    
    # Check for critical filtering section
    assert "CRITICAL FILTERING" in prompt_content
    assert "ONLY extract CONFIRMED manufacturing/processing operations" in prompt_content
    assert "SKIP: Business names alone" in prompt_content
    

def test_prompt_v1_strict_significance_criteria():
    """Test that v1 prompt has strict significance criteria."""
    prompt_content = load_prompt_version("v1")
    
    # Should have stricter criteria
    assert "VERY STRICT" in prompt_content
    assert "EXPLICIT industrial descriptor" in prompt_content
    assert "DO NOT EXTRACT City Directory listings that are just business names" in prompt_content


def test_prompt_v1_waste_generator_filter():
    """Test that v1 prompt requires evidence for waste generator records."""
    prompt_content = load_prompt_version("v1")
    
    # Should require waste + operation confirmation  
    assert ("eris waste generator record + specific industrial operation" in prompt_content.lower() or
            "without confirming primary industrial operation" in prompt_content.lower() or 
            '"waste generator" unless eris/report confirms primary industrial operation' in prompt_content.lower())


def test_prompt_v1_city_directory_strictness():
    """Test that v1 prompt is strict about City Directory entries."""
    prompt_content = load_prompt_version("v1")
    
    # Should require operation descriptors
    assert "ONLY extract City Directory if entry includes EXPLICIT industrial descriptor" in prompt_content
    assert "Manufacturing verb" in prompt_content
    assert "Shop type" in prompt_content


def test_prompt_v1_has_negative_examples():
    """Test that v1 prompt includes many negative examples."""
    prompt_content = load_prompt_version("v1")
    
    # Should have examples of what NOT to extract
    assert "Christian Broadcasting" in prompt_content or "broadcasting" in prompt_content.lower()
    assert "Coffee Time" in prompt_content or "food service" in prompt_content.lower()
    assert "DO NOT EXTRACT" in prompt_content
    
    # Count DO NOT EXTRACT examples
    do_not_extract_count = prompt_content.count("DO NOT EXTRACT")
    assert do_not_extract_count >= 5, f"Should have at least 5 DO NOT EXTRACT examples, found {do_not_extract_count}"


def test_prompt_v1_excludes_common_false_positives():
    """Test that v1 prompt explicitly excludes common false positive categories."""
    prompt_content = load_prompt_version("v1")
    
    # Categories that should be excluded
    exclusions = [
        "telecommunications",
        "broadcasting",
        "media",
        "food service",
        "promotional",
        "marketing",
        "retail",
        "distribution",
        "wholesale",
        "office buildings",
        "property management"
    ]
    
    found_exclusions = 0
    for exclusion in exclusions:
        if exclusion.lower() in prompt_content.lower():
            found_exclusions += 1
    
    assert found_exclusions >= 6, f"Should explicitly exclude at least 6 common false positive categories, found {found_exclusions}"


def test_prompt_v1_distance_filter_updated():
    """Test that v1 prompt has updated distance filter for off-site."""
    prompt_content = load_prompt_version("v1")
    
    # Should be stricter about distance
    assert "0-150m" in prompt_content
    assert ">150m" in prompt_content
    # Should not recommend >250m for routine operations
    assert "EXCLUDE" in prompt_content and "routine operations" in prompt_content.lower()


def test_prompt_v1_manufacturing_verbs_list():
    """Test that v1 prompt lists specific manufacturing verbs required."""
    prompt_content = load_prompt_version("v1")
    
    required_indicators = [
        "plating shop",
        "machine shop", 
        "plastic extrusion",
        "manufacturer",
        "fabrication",
        "processing"
    ]
    
    found_indicators = 0
    for indicator in required_indicators:
        if indicator.lower() in prompt_content.lower():
            found_indicators += 1
    
    assert found_indicators >= 5, f"Should list at least 5 manufacturing indicators, found {found_indicators}"


def test_prompt_v1_explicit_good_bad_examples():
    """Test that v1 prompt has explicit Good/Bad comparison examples."""
    prompt_content = load_prompt_version("v1")
    
    # Should show good vs bad examples for City Directory
    assert "Good:" in prompt_content
    assert "Bad:" in prompt_content
    
    # Should show at least 2 Good and 2 Bad examples
    good_count = prompt_content.count("Good:")
    bad_count = prompt_content.count("Bad:")
    
    assert good_count >= 2, f"Should have at least 2 Good examples, found {good_count}"
    assert bad_count >= 2, f"Should have at least 2 Bad examples, found {bad_count}"


def test_prompt_v1_skip_reasoning_examples():
    """Test that v1 prompt provides reasoning for skip examples."""
    prompt_content = load_prompt_version("v1")
    
    # Each SKIP example should have reasoning
    skip_examples = [
        "Property management",
        "Medical office",
        "Telecom",
        "distribution",
        "City Directory without operation type",
        "Food service",
        "Business name alone"
    ]
    
    found_skip_examples = 0
    for example in skip_examples:
        if example.lower() in prompt_content.lower():
            found_skip_examples += 1
    
    assert found_skip_examples >= 5, f"Should have at least 5 SKIP examples with reasoning, found {found_skip_examples}"


def test_prompt_v1_length_reasonable():
    """Test that refined prompt is not excessively long."""
    prompt_content = load_prompt_version("v1")
    
    # Should be detailed but not too long (under 16000 chars)
    # This ensures prompt remains focused and doesn't dilute key instructions
    assert len(prompt_content) < 16000, f"Prompt should be under 16000 characters for focus, got {len(prompt_content)}"
    assert len(prompt_content) > 8000, f"Prompt should be detailed enough (>8000 chars), got {len(prompt_content)}"


def test_prompt_v1_still_includes_mandatory_extractions():
    """Test that v1 prompt still requires extraction of direct contamination sources."""
    prompt_content = load_prompt_version("v1")
    
    # Should still require spills, UST/AST, fill material
    mandatory = [
        "spills",
        "UST",
        "AST",
        "fill material",
        "PCB storage",
        "Always Extract"
    ]
    
    found_mandatory = 0
    for item in mandatory:
        if item in prompt_content:
            found_mandatory += 1
    
    assert found_mandatory >= 5, f"Should still require extraction of direct contamination sources, found {found_mandatory}/6"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

