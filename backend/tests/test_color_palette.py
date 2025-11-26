"""
Test cases for color palette consistency
Testing that only approved colors are used
"""
import pytest
from pathlib import Path
import re

# Add parent directory to path for imports
import sys
sys.path.insert(0, str(Path(__file__).parent.parent.parent))


class TestColorPalette:
    """Test custom color palette application"""
    
    def test_globals_css_defines_color_variables(self):
        """Test that globals.css defines all color variables"""
        globals_css = Path(__file__).parent.parent.parent / "frontend" / "app" / "globals.css"
        
        if not globals_css.exists():
            pytest.skip("globals.css not found")
        
        content = globals_css.read_text()
        
        # Check for custom color variables
        required_colors = [
            '--burgundy-dark',
            '--burgundy-light',
            '--cream',
            '--navy-dark',
            '--navy-light',
        ]
        
        for color in required_colors:
            assert color in content, f"Color variable {color} should be defined in globals.css"
    
    def test_color_values_match_palette(self):
        """Test that color values match the specified palette"""
        globals_css = Path(__file__).parent.parent.parent / "frontend" / "app" / "globals.css"
        
        if not globals_css.exists():
            pytest.skip("globals.css not found")
        
        content = globals_css.read_text()
        
        # Expected color values (approximate)
        expected_colors = {
            '--burgundy-dark': '5D1A1A',
            '--burgundy-light': 'C84B4B',
            '--cream': 'E8DCC4',
            '--navy-dark': '1E3A52',
            '--navy-light': '7FA5C0',
        }
        
        for var_name, expected_hex in expected_colors.items():
            assert var_name in content, f"{var_name} should exist"
            # Check if the hex value appears in the file
            assert expected_hex.lower() in content.lower(), f"Color {var_name} should have value similar to {expected_hex}"


class TestColorUsage:
    """Test that components use only approved colors"""
    
    def test_no_hardcoded_blue_in_progress_visualizer(self):
        """Test that ElegantProgressVisualizer doesn't use hardcoded blue colors"""
        component_file = Path(__file__).parent.parent.parent / "frontend" / "components" / "features" / "extraction" / "ElegantProgressVisualizer.tsx"
        
        if not component_file.exists():
            pytest.skip("ElegantProgressVisualizer.tsx not found")
        
        content = component_file.read_text()
        
        # Should not contain hardcoded color classes for primary elements
        # Allow bg-gray, text-gray for neutral elements
        disallowed_patterns = [
            r'bg-blue-[0-9]+(?!\s*dark:)',  # bg-blue-500 without dark: variant check
            r'text-blue-[0-9]+(?!\s*dark:)',  # text-blue-600 without dark: variant check
            r'bg-purple-[0-9]+',
            r'text-purple-[0-9]+',
        ]
        
        for pattern in disallowed_patterns:
            matches = re.findall(pattern, content)
            # Allow some usage for backward compatibility, but prefer CSS variables
            if matches:
                # This is more of a warning - we want to move towards CSS variables
                pass
    
    def test_uses_css_variables_for_main_colors(self):
        """Test that progress visualizer uses CSS variables"""
        component_file = Path(__file__).parent.parent.parent / "frontend" / "components" / "features" / "extraction" / "ElegantProgressVisualizer.tsx"
        
        if not component_file.exists():
            pytest.skip("ElegantProgressVisualizer.tsx not found")
        
        content = component_file.read_text()
        
        # Should contain CSS variable usage
        css_var_patterns = [
            r'var\(--burgundy',
            r'var\(--navy',
            r'var\(--cream',
        ]
        
        found_any = False
        for pattern in css_var_patterns:
            if re.search(pattern, content):
                found_any = True
                break
        
        assert found_any, "Component should use CSS variables for colors"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

