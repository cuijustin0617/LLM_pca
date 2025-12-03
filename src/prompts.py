"""
Prompt templates for PCA extraction from ERIS reports.
Prompts are loaded from the prompts/ directory for version control.
"""

from pathlib import Path
import json

# Path to prompts directory
PROMPTS_DIR = Path(__file__).parent.parent / "prompts"


def load_prompt_version(version_id: str = "v1") -> str:
    """Load a specific prompt version from the prompts directory."""
    versions_file = PROMPTS_DIR / "versions.json"
    
    if not versions_file.exists():
        raise FileNotFoundError(f"Prompt versions file not found: {versions_file}")
    
    with open(versions_file, 'r') as f:
        versions = json.load(f)
    
    # Find the version
    version = next((v for v in versions if v['id'] == version_id), None)
    if not version:
        raise ValueError(f"Prompt version {version_id} not found")
    
    # Load the prompt content
    extract_file = PROMPTS_DIR / version['extract_file']
    if not extract_file.exists():
        raise FileNotFoundError(f"Prompt file not found: {extract_file}")
    
    with open(extract_file, 'r') as f:
        return f.read()


def get_active_prompt() -> str:
    """Load the currently active prompt version."""
    versions_file = PROMPTS_DIR / "versions.json"
    
    if not versions_file.exists():
        raise FileNotFoundError(f"Prompt versions file not found: {versions_file}")
    
    with open(versions_file, 'r') as f:
        data = json.load(f)
    
    # Handle both old format (list) and new format (dict with "versions" key)
    if isinstance(data, list):
        versions = data
        active_id = next((v.get('id') for v in versions if v.get('active', False)), None)
    else:
        versions = data.get('versions', [])
        active_id = data.get('active_version')
    
    # Find the active version entry
    active_version = None
    if active_id:
        active_version = next((v for v in versions if v.get('id') == active_id), None)
    
    if not active_version and versions:
        # Default to first version if none found
        active_version = versions[0]
    
    if not active_version:
        raise ValueError("No active prompt version found")
    
    # Load the prompt content - support both old format (extract_file) and new format (id_extract.txt)
    version_id = active_version.get('id', 'v1')
    extract_file_name = active_version.get('extract_file', f"{version_id}_extract.txt")
    extract_file = PROMPTS_DIR / extract_file_name
    
    if not extract_file.exists():
        raise FileNotFoundError(f"Prompt file not found: {extract_file}")
    
    with open(extract_file, 'r') as f:
        return f.read()


# Load the active prompt content
_EXTRACT_PROMPT_CONTENT = get_active_prompt()


# Template with placeholders for runtime values
EXTRACT_PROMPT_TEMPLATE = """\
{prompt_content}

Official PCA list (for mapping):
{{pca_definitions}}

SOURCE PAGES {{start}}-{{end}} (concatenated text follows):
----
{{text}}
"""


def get_extract_prompt_template() -> str:
    """Get the extraction prompt template with the active prompt content."""
    # Escape curly braces in the prompt content to avoid format() issues
    # Since the prompt content contains JSON examples with { and }, we need to escape them
    escaped_content = _EXTRACT_PROMPT_CONTENT.replace('{', '{{').replace('}', '}}')
    return EXTRACT_PROMPT_TEMPLATE.format(prompt_content=escaped_content)


# Compile prompt (same for all versions for now)
COMPILE_PROMPT_TEMPLATE = """\
You are deduplicating and compiling PCA rows extracted from multiple document chunks.

=== MAIN TASK: DEDUPLICATE ===

AGGRESSIVELY merge duplicate rows. Two rows are duplicates if they have:
- Same or very similar address (ignore minor variations like "Ave" vs "Avenue", unit formatting)
- Same PCA number

When merging duplicates:
- Keep the most complete address
- Combine all descriptions and business names
- Merge source_pages (e.g., "p-48; p-52; p-67")

EXAMPLES OF DUPLICATES TO MERGE:
- "670 Progress Avenue" + "670 Progress Ave" with same PCA → MERGE
- "670 Progress Ave Unit 12" + "670 Progress Avenue, Unit 12" with same PCA → MERGE  
- Same address appearing 5 times with PCA #58 → MERGE into 1 row

KEEP SEPARATE (not duplicates):
- Same address with DIFFERENT PCA numbers (e.g., PCA #33 vs PCA #58)
- Different addresses (e.g., "670 Progress" vs "675 Progress")

=== SECONDARY TASKS ===

1. Normalize location_relation_to_site to ONLY "On-Site" or "Off-Site"
2. Fill in pca_number if recognizable from pca_name (use PCA reference below)
3. **REMOVE rows without a valid pca_number (1-59)** - if you can't determine the PCA number, delete the row entirely
4. Remove non-industrial entries (office waste, building maintenance, etc.)

=== OUTPUT FORMAT ===
Return ONLY valid JSON:
{{
  "rows": [
    {{
      "address": "string",
      "location_relation_to_site": "On-Site" or "Off-Site",
      "pca_number": int or null,
      "pca_name": "string",
      "description_timeline": "string",
      "source_pages": "string"
    }}
  ]
}}

=== PCA REFERENCE ===
{pca_definitions}

=== RAW ROWS TO DEDUPLICATE ===
{raw_rows_json}
"""


# For backward compatibility, expose the template directly
# (Will use the template format method internally)
def format_extract_prompt(pca_definitions: str, start: int, end: int, text: str) -> str:
    """Format the extraction prompt with the given parameters."""
    template = get_extract_prompt_template()
    return template.format(
        pca_definitions=pca_definitions,
        start=start,
        end=end,
        text=text
    )
