"""
Test cases for prompt formatting functionality to ensure prompts are correctly formatted
and prevent KeyError issues during extraction.
"""

import sys
from pathlib import Path
import pytest

# Add src to path for importing prompts module
sys.path.append(str(Path(__file__).resolve().parent.parent.parent / "src"))

from src.prompts import (
    format_extract_prompt,
    get_extract_prompt_template,
    get_active_prompt,
    load_prompt_version,
    COMPILE_PROMPT_TEMPLATE
)


def test_format_extract_prompt():
    """Test that format_extract_prompt correctly formats the prompt with all required placeholders."""
    pca_definitions = "1. Metal Treatment\n2. Waste Oil Storage"
    start = 1
    end = 10
    text = "Sample text from pages 1-10"
    
    result = format_extract_prompt(
        pca_definitions=pca_definitions,
        start=start,
        end=end,
        text=text
    )
    
    # Check that all placeholders are filled
    assert pca_definitions in result
    assert "SOURCE PAGES 1-10" in result
    assert text in result
    # Should not have any unfilled placeholders
    assert "{pca_definitions}" not in result
    assert "{start}" not in result
    assert "{end}" not in result
    assert "{text}" not in result
    assert "{prompt_content}" not in result


def test_get_extract_prompt_template():
    """Test that get_extract_prompt_template returns a template with prompt content filled in."""
    template = get_extract_prompt_template()
    
    # Should contain placeholders for runtime values
    assert "{pca_definitions}" in template
    assert "{start}" in template
    assert "{end}" in template
    assert "{text}" in template
    # Should NOT contain prompt_content placeholder (should be filled)
    assert "{prompt_content}" not in template
    # Should contain actual prompt content
    assert "Extract SIGNIFICANT Potentially Contaminating Activities" in template or "PCA" in template


def test_get_active_prompt():
    """Test that get_active_prompt loads the active prompt version."""
    prompt_content = get_active_prompt()
    
    # Should be non-empty string
    assert isinstance(prompt_content, str)
    assert len(prompt_content) > 0
    # Should contain some expected content
    assert "PCA" in prompt_content.upper()


def test_load_prompt_version_v1():
    """Test that load_prompt_version can load version 1."""
    prompt_content = load_prompt_version("v1")
    
    # Should be non-empty string
    assert isinstance(prompt_content, str)
    assert len(prompt_content) > 0
    # Should contain expected content from v1
    assert "Extract SIGNIFICANT Potentially Contaminating Activities" in prompt_content


def test_compile_prompt_template_has_placeholders():
    """Test that COMPILE_PROMPT_TEMPLATE has expected placeholders."""
    # Should contain placeholders for runtime values
    assert "{pca_definitions}" in COMPILE_PROMPT_TEMPLATE
    assert "{raw_rows_json}" in COMPILE_PROMPT_TEMPLATE
    # Should contain compilation instructions
    assert "DEDUPLICATE" in COMPILE_PROMPT_TEMPLATE or "compile" in COMPILE_PROMPT_TEMPLATE.lower()


def test_extract_prompt_no_unfilled_placeholders():
    """Test that the final formatted prompt has no unfilled Python format placeholders."""
    pca_definitions = "Test PCAs"
    start = 1
    end = 5
    text = "Test text"
    
    result = format_extract_prompt(
        pca_definitions=pca_definitions,
        start=start,
        end=end,
        text=text
    )
    
    # Should not have any unfilled Python format placeholders
    assert "{pca_definitions}" not in result
    assert "{start}" not in result
    assert "{end}" not in result
    assert "{text}" not in result
    assert "{prompt_content}" not in result


def test_extract_prompt_integration():
    """Integration test simulating how extract_pca_llm_simple.py uses the prompt formatting."""
    # Simulate the usage in extract_pca_llm_simple.py
    pca_def_text = "1. Metal Treatment, Coating, Plating and Finishing\n2. Metal Fabrication"
    start = 1
    end = 67
    chunk_text = "Sample chunk text from a PDF document..."
    
    # This is what extract_pca_llm_simple.py now does
    prompt = format_extract_prompt(
        pca_definitions=pca_def_text,
        start=start,
        end=end,
        text=chunk_text
    )
    
    # Verify the prompt is correctly formatted
    assert isinstance(prompt, str)
    assert len(prompt) > 100  # Should be a substantial prompt
    assert pca_def_text in prompt
    assert chunk_text in prompt
    assert "1-67" in prompt or "SOURCE PAGES 1-67" in prompt
    
    # Verify no unfilled Python format placeholders (but JSON braces are OK)
    assert "{pca_definitions}" not in prompt
    assert "{start}" not in prompt
    assert "{end}" not in prompt
    assert "{text}" not in prompt
    assert "{prompt_content}" not in prompt


def test_compile_prompt_formatting():
    """Test that COMPILE_PROMPT_TEMPLATE can be formatted correctly."""
    pca_definitions = "1. Metal Treatment\n2. Waste Oil Storage"
    raw_rows_json = '{"rows": [{"address": "123 Test St", "pca_number": 1}]}'
    
    # Format the compile prompt
    compile_prompt = COMPILE_PROMPT_TEMPLATE.format(
        pca_definitions=pca_definitions,
        raw_rows_json=raw_rows_json
    )
    
    # Check that placeholders are filled
    assert pca_definitions in compile_prompt
    assert raw_rows_json in compile_prompt
    # Should not have unfilled placeholders
    assert "{pca_definitions}" not in compile_prompt
    assert "{raw_rows_json}" not in compile_prompt


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

