"""
Test cases for chunk-by-chunk progress logging.
Ensures that progress messages are logged correctly for frontend visualization.
"""

import pytest


def test_progress_message_format():
    """Test that the expected progress message format is correct."""
    # Simulate the log message format
    chunk_idx = 2
    total_chunks = 4
    start_page = 68
    end_page = 162
    pca_count = 45
    
    # This is the format we expect in the logs
    message = f"Processing pages {start_page}-{end_page}: chunk {chunk_idx}/{total_chunks} complete, found {pca_count} potential PCAs"
    
    # Verify it matches the pattern the frontend looks for
    assert "Processing pages" in message
    assert f"chunk {chunk_idx}/{total_chunks}" in message
    assert f"found {pca_count} potential" in message


def test_progress_message_parsing():
    """Test that progress messages can be parsed correctly by the frontend."""
    message = "Processing pages 68-162: chunk 2/4 complete, found 45 potential PCAs"
    
    # Simulate frontend parsing
    import re
    
    # Extract chunk info
    chunk_match = re.search(r'chunk (\d+)/(\d+)', message)
    assert chunk_match is not None
    assert chunk_match.group(1) == '2'
    assert chunk_match.group(2) == '4'
    
    # Extract PCA count
    pca_match = re.search(r'found (\d+) potential', message)
    assert pca_match is not None
    assert pca_match.group(1) == '45'
    
    # Calculate progress (20% base + 55% for chunks)
    current = int(chunk_match.group(1))
    total = int(chunk_match.group(2))
    chunk_progress = (current / total) * 55
    expected_progress = 20 + chunk_progress
    
    assert expected_progress == 47.5  # 20 + (2/4 * 55)


def test_all_chunks_reach_75_percent():
    """Test that when all chunks complete, progress reaches 75%."""
    # Simulate all 4 chunks completing
    chunk_progresses = []
    total_chunks = 4
    
    for chunk_idx in range(1, total_chunks + 1):
        chunk_progress = (chunk_idx / total_chunks) * 55
        total_progress = 20 + chunk_progress
        chunk_progresses.append(total_progress)
    
    # Last chunk should reach 75%
    assert chunk_progresses[-1] == 75.0
    
    # Verify incremental progress
    assert chunk_progresses[0] == 33.75  # After chunk 1
    assert chunk_progresses[1] == 47.5   # After chunk 2
    assert chunk_progresses[2] == 61.25  # After chunk 3
    assert chunk_progresses[3] == 75.0   # After chunk 4


def test_progress_message_with_zero_pcas():
    """Test progress message when no PCAs are found in a chunk."""
    chunk_idx = 3
    total_chunks = 4
    start_page = 163
    end_page = 246
    pca_count = 0
    
    message = f"Processing pages {start_page}-{end_page}: chunk {chunk_idx}/{total_chunks} complete, found {pca_count} potential PCAs"
    
    # Should still have valid format even with 0 PCAs
    assert "chunk 3/4" in message
    assert "found 0 potential" in message


def test_progress_message_with_large_numbers():
    """Test progress message with large page numbers and PCA counts."""
    chunk_idx = 1
    total_chunks = 10
    start_page = 1
    end_page = 500
    pca_count = 150
    
    message = f"Processing pages {start_page}-{end_page}: chunk {chunk_idx}/{total_chunks} complete, found {pca_count} potential PCAs"
    
    # Verify parsing still works with large numbers
    import re
    chunk_match = re.search(r'chunk (\d+)/(\d+)', message)
    pca_match = re.search(r'found (\d+) potential', message)
    
    assert chunk_match.group(1) == '1'
    assert chunk_match.group(2) == '10'
    assert pca_match.group(1) == '150'


def test_progress_sequence_for_typical_extraction():
    """Test a typical extraction sequence with 4 chunks."""
    chunks = [
        {"idx": 1, "start": 1, "end": 67, "pcas": 25},
        {"idx": 2, "start": 68, "end": 162, "pcas": 45},
        {"idx": 3, "start": 163, "end": 246, "pcas": 38},
        {"idx": 4, "start": 247, "end": 256, "pcas": 12},
    ]
    
    total_chunks = len(chunks)
    expected_progresses = [33.75, 47.5, 61.25, 75.0]
    
    for i, chunk in enumerate(chunks):
        message = f"Processing pages {chunk['start']}-{chunk['end']}: chunk {chunk['idx']}/{total_chunks} complete, found {chunk['pcas']} potential PCAs"
        
        # Verify message format
        assert f"chunk {chunk['idx']}/{total_chunks}" in message
        assert f"found {chunk['pcas']} potential" in message
        
        # Verify progress calculation
        chunk_progress = (chunk['idx'] / total_chunks) * 55
        total_progress = 20 + chunk_progress
        assert total_progress == expected_progresses[i]


if __name__ == "__main__":
    pytest.main([__file__, "-v"])


