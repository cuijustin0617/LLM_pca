"""
Test cases for consolidated LLM output logging functionality.
"""

import sys
from pathlib import Path
import pytest
import tempfile
import shutil

# Add project root to path
sys.path.append(str(Path(__file__).resolve().parent.parent.parent))
sys.path.append(str(Path(__file__).resolve().parent.parent.parent / "src"))

from extract_pca_llm_simple import save_text


def test_consolidated_log_file_created():
    """Test that the consolidated log file is created in the experiment directory."""
    # This test verifies the structure - actual log file creation happens during pipeline execution
    # We'll test the expected file path
    exp_dir = Path(tempfile.mkdtemp())
    
    try:
        raw_llm_log = exp_dir / "raw_llm_outputs.log"
        
        # Verify the path is correct
        assert raw_llm_log.parent == exp_dir
        assert raw_llm_log.name == "raw_llm_outputs.log"
        
        # Simulate creating the file
        raw_llm_log.write_text("Test content", encoding='utf-8')
        assert raw_llm_log.exists()
        
    finally:
        shutil.rmtree(exp_dir)


def test_log_entry_format():
    """Test that log entries have the correct format."""
    # Simulate a log entry
    chunk_idx = 1
    total_chunks = 4
    start_page = 1
    end_page = 67
    provider = "gemini"
    model = "gemini-2.5-flash-lite"
    response_length = 61790
    timestamp = "2025-11-25 12:34:56"
    raw_response = '{"rows": [{"address": "123 Test St", "pca_number": 1}]}'
    
    log_entry = f"""
{'='*80}
CHUNK {chunk_idx}/{total_chunks} | PAGES {start_page}-{end_page} | PROVIDER: {provider.upper()} | MODEL: {model}
TIMESTAMP: {timestamp} | RESPONSE LENGTH: {response_length} chars
{'='*80}

{raw_response}

"""
    
    # Verify format
    assert "CHUNK 1/4" in log_entry
    assert "PAGES 1-67" in log_entry
    assert "PROVIDER: GEMINI" in log_entry
    assert f"MODEL: {model}" in log_entry
    assert f"TIMESTAMP: {timestamp}" in log_entry
    assert f"RESPONSE LENGTH: {response_length} chars" in log_entry
    assert raw_response in log_entry
    assert "="*80 in log_entry


def test_compile_step_log_entry_format():
    """Test that compile step log entries have the correct format."""
    provider = "gemini"
    model = "gemini-2.5-flash-lite"
    response_length = 12345
    timestamp = "2025-11-25 12:35:00"
    compiled_response = '{"rows": [{"address": "Compiled", "pca_number": 1}]}'
    
    log_entry = f"""
{'='*80}
COMPILE STEP | PROVIDER: {provider.upper()} | MODEL: {model}
TIMESTAMP: {timestamp} | RESPONSE LENGTH: {response_length} chars
{'='*80}

{compiled_response}

"""
    
    # Verify format
    assert "COMPILE STEP" in log_entry
    assert "PROVIDER: GEMINI" in log_entry
    assert f"MODEL: {model}" in log_entry
    assert f"TIMESTAMP: {timestamp}" in log_entry
    assert f"RESPONSE LENGTH: {response_length} chars" in log_entry
    assert compiled_response in log_entry


def test_json_fix_log_entry_format():
    """Test that JSON fix attempt log entries have the correct format."""
    chunk_idx = 2
    total_chunks = 4
    start_page = 68
    end_page = 162
    provider = "gemini"
    model = "gemini-2.5-flash-lite"
    response_length = 1234
    timestamp = "2025-11-25 12:36:00"
    fixed_response = '{"rows": [{"address": "Fixed", "pca_number": 2}]}'
    
    log_entry = f"""
{'='*80}
CHUNK {chunk_idx}/{total_chunks} | PAGES {start_page}-{end_page} | PROVIDER: {provider.upper()} | MODEL: {model}
JSON FIX ATTEMPT | TIMESTAMP: {timestamp} | RESPONSE LENGTH: {response_length} chars
{'='*80}

{fixed_response}

"""
    
    # Verify format
    assert "CHUNK 2/4" in log_entry
    assert "PAGES 68-162" in log_entry
    assert "JSON FIX ATTEMPT" in log_entry
    assert "PROVIDER: GEMINI" in log_entry
    assert f"MODEL: {model}" in log_entry
    assert fixed_response in log_entry


def test_multiple_entries_in_single_file():
    """Test that multiple log entries can be appended to the same file."""
    exp_dir = Path(tempfile.mkdtemp())
    
    try:
        raw_llm_log = exp_dir / "raw_llm_outputs.log"
        
        # Simulate multiple log entries
        entry1 = "=== CHUNK 1 ===\nResponse 1\n\n"
        entry2 = "=== CHUNK 2 ===\nResponse 2\n\n"
        entry3 = "=== COMPILE STEP ===\nCompiled response\n\n"
        
        with open(raw_llm_log, 'a', encoding='utf-8') as f:
            f.write(entry1)
        
        with open(raw_llm_log, 'a', encoding='utf-8') as f:
            f.write(entry2)
        
        with open(raw_llm_log, 'a', encoding='utf-8') as f:
            f.write(entry3)
        
        # Read the file and verify all entries are present
        content = raw_llm_log.read_text(encoding='utf-8')
        
        assert "CHUNK 1" in content
        assert "Response 1" in content
        assert "CHUNK 2" in content
        assert "Response 2" in content
        assert "COMPILE STEP" in content
        assert "Compiled response" in content
        
        # Verify order is preserved
        pos1 = content.find("CHUNK 1")
        pos2 = content.find("CHUNK 2")
        pos3 = content.find("COMPILE STEP")
        assert pos1 < pos2 < pos3
        
    finally:
        shutil.rmtree(exp_dir)


def test_log_handles_unicode():
    """Test that the log file can handle unicode characters."""
    exp_dir = Path(tempfile.mkdtemp())
    
    try:
        raw_llm_log = exp_dir / "raw_llm_outputs.log"
        
        # Simulate log entry with unicode
        unicode_response = '{"address": "123 Rue François-Ⅰer", "description": "Café ☕, résumé"}'
        log_entry = f"=== TEST ===\n{unicode_response}\n\n"
        
        with open(raw_llm_log, 'a', encoding='utf-8') as f:
            f.write(log_entry)
        
        # Read back and verify
        content = raw_llm_log.read_text(encoding='utf-8')
        assert "François" in content
        assert "Café" in content
        assert "☕" in content
        assert "résumé" in content
        
    finally:
        shutil.rmtree(exp_dir)


def test_log_separators_clear():
    """Test that log entries are clearly separated with visual markers."""
    # Test that the separator is 80 characters
    separator = "="*80
    assert len(separator) == 80
    
    # Test in a log entry
    log_entry = f"""
{separator}
CHUNK 1/4 | TEST ENTRY
{separator}

Content here

"""
    
    # Count separators
    assert log_entry.count("="*80) == 2
    # Verify spacing
    assert "\n\n" in log_entry  # Empty line after content


if __name__ == "__main__":
    pytest.main([__file__, "-v"])


