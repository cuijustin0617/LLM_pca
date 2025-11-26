"""
Test cases for backend settings configuration.
"""
import pytest
from pathlib import Path
import sys

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent))


class TestSettings:
    """Test backend settings"""
    
    def test_all_required_dirs_defined(self):
        """Test that all required directories are defined"""
        from backend.settings import BASE_DIR, ROOT_DIR, UPLOAD_DIR, OUTPUT_DIR, PROJECTS_DIR
        
        assert BASE_DIR is not None
        assert ROOT_DIR is not None
        assert UPLOAD_DIR is not None
        assert OUTPUT_DIR is not None
        assert PROJECTS_DIR is not None
    
    def test_base_dir_is_backend(self):
        """Test BASE_DIR points to backend directory"""
        from backend.settings import BASE_DIR
        
        assert BASE_DIR.name == "backend"
        assert (BASE_DIR / "main.py").exists()
        assert (BASE_DIR / "settings.py").exists()
    
    def test_root_dir_is_project_root(self):
        """Test ROOT_DIR points to project root"""
        from backend.settings import ROOT_DIR
        
        assert (ROOT_DIR / "backend").exists()
        assert (ROOT_DIR / "frontend").exists()
        assert (ROOT_DIR / "data").exists()
        assert (ROOT_DIR / "README.md").exists()
    
    def test_all_dirs_are_absolute(self):
        """Test all directory paths are absolute"""
        from backend.settings import BASE_DIR, ROOT_DIR, UPLOAD_DIR, OUTPUT_DIR, PROJECTS_DIR
        
        assert BASE_DIR.is_absolute()
        assert ROOT_DIR.is_absolute()
        assert UPLOAD_DIR.is_absolute()
        assert OUTPUT_DIR.is_absolute()
        assert PROJECTS_DIR.is_absolute()
    
    def test_directories_created(self):
        """Test that required directories are created"""
        from backend.settings import UPLOAD_DIR, OUTPUT_DIR, PROJECTS_DIR
        
        assert UPLOAD_DIR.exists()
        assert OUTPUT_DIR.exists()
        assert PROJECTS_DIR.exists()
    
    def test_data_directory_structure(self):
        """Test data directory has expected structure"""
        from backend.settings import ROOT_DIR
        
        data_dir = ROOT_DIR / "data"
        assert data_dir.exists()
        assert (data_dir / "pca_definitions.txt").exists()
        assert (data_dir / "projects").exists()


class TestPathResolutionEdgeCases:
    """Test edge cases in path resolution"""
    
    def test_paths_work_from_different_cwd(self, monkeypatch):
        """Test paths resolve correctly regardless of cwd"""
        import os
        from backend.settings import ROOT_DIR, UPLOAD_DIR
        
        # Save original cwd
        original_cwd = Path.cwd()
        
        try:
            # Change to a different directory
            monkeypatch.chdir("/tmp")
            
            # Paths should still be correct (absolute)
            assert ROOT_DIR.is_absolute()
            assert UPLOAD_DIR.is_absolute()
            assert ROOT_DIR.exists()
        finally:
            # Restore cwd
            os.chdir(original_cwd)
    
    def test_symlink_resolution(self):
        """Test that paths resolve symlinks correctly"""
        from backend.settings import BASE_DIR, ROOT_DIR
        
        # Should resolve any symlinks in the path
        assert BASE_DIR == BASE_DIR.resolve()
        assert ROOT_DIR == ROOT_DIR.resolve()


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

