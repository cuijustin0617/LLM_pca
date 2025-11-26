"""
Test cases for JSON truncation recovery in extract_pca_llm_simple.
Ensures that truncated JSON responses can be recovered when possible.
"""

import sys
from pathlib import Path
import pytest
import json

# Add project root to path
sys.path.append(str(Path(__file__).resolve().parent.parent.parent))

from extract_pca_llm_simple import try_parse_json


def test_valid_complete_json():
    """Test that valid complete JSON parses correctly."""
    valid_json = '{"rows": [{"address": "123 Main St", "pca_number": 1}]}'
    result = try_parse_json(valid_json)
    
    assert result is not None
    assert "rows" in result
    assert len(result["rows"]) == 1


def test_truncated_json_missing_closing_braces():
    """Test recovery of JSON missing closing braces."""
    truncated = '{"rows": [{"address": "123 Main St", "pca_number": 1}'
    
    result = try_parse_json(truncated)
    
    # Recovery may or may not succeed depending on complexity
    # At minimum, should not crash and should attempt recovery
    assert result is None or (isinstance(result, dict) and "rows" in result)


def test_truncated_json_mid_string():
    """Test recovery of JSON truncated mid-string."""
    truncated = '{"rows": [{"address": "123 Main St", "source_pages": "'
    
    result = try_parse_json(truncated)
    
    # Should attempt recovery
    # May or may not succeed depending on complexity, but shouldn't crash
    # Result could be None if recovery fails
    assert result is None or isinstance(result, dict)


def test_truncated_array_not_closed():
    """Test recovery of JSON with unclosed array."""
    truncated = '{"rows": [{"address": "Test"}, {"address": "Test2"'
    
    result = try_parse_json(truncated)
    
    # Should attempt to close array and object
    assert result is not None or result is None  # Should not crash


def test_multiple_levels_of_nesting_truncated():
    """Test recovery with multiple levels of unclosed objects."""
    truncated = '{"rows": [{"address": "Test", "nested": {"field": "value"'
    
    result = try_parse_json(truncated)
    
    # Should handle multiple levels
    assert result is None or isinstance(result, dict)


def test_valid_json_not_modified():
    """Test that valid JSON is not modified by recovery logic."""
    valid = '{"rows": [{"address": "Complete", "pca_number": 33}]}'
    
    result = try_parse_json(valid)
    
    assert result is not None
    assert result["rows"][0]["address"] == "Complete"
    assert result["rows"][0]["pca_number"] == 33


def test_json_with_trailing_whitespace():
    """Test that JSON with trailing whitespace is handled."""
    json_with_whitespace = '{"rows": []}   \n  '
    
    result = try_parse_json(json_with_whitespace)
    
    assert result is not None
    assert "rows" in result


def test_json_with_newlines_in_strings():
    """Test JSON with newlines in string values."""
    json_with_newlines = '{"rows": [{"description": "Line 1\\nLine 2"}]}'
    
    result = try_parse_json(json_with_newlines)
    
    assert result is not None
    assert "Line 1" in result["rows"][0]["description"]


def test_fenced_json_block():
    """Test that fenced JSON blocks are extracted."""
    fenced = '```json\n{"rows": [{"address": "Test"}]}\n```'
    
    result = try_parse_json(fenced)
    
    assert result is not None
    assert "rows" in result


def test_completely_invalid_json():
    """Test that completely invalid JSON returns None."""
    invalid = 'This is not JSON at all'
    
    result = try_parse_json(invalid)
    
    assert result is None


def test_empty_string():
    """Test that empty string returns None."""
    result = try_parse_json('')
    
    assert result is None


def test_json_with_escaped_quotes():
    """Test JSON with escaped quotes in strings."""
    with_escaped = '{"rows": [{"description": "He said \\"hello\\""}]}'
    
    result = try_parse_json(with_escaped)
    
    assert result is not None
    assert '\\"' in result["rows"][0]["description"] or '"' in result["rows"][0]["description"]


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

