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
        versions = json.load(f)
    
    # Find the active version
    active_version = next((v for v in versions if v.get('active', False)), None)
    if not active_version:
        # Default to first version if none marked active
        active_version = versions[0] if versions else None
    
    if not active_version:
        raise ValueError("No active prompt version found")
    
    # Load the prompt content
    extract_file = PROMPTS_DIR / active_version['extract_file']
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
You are compiling and refining PCA rows extracted from multiple document chunks.

=== YOUR TASKS ===

1. DEDUPLICATE carefully:
   - Merge rows that refer to the EXACT SAME (Address + PCA Number) combination
   - When merging, combine descriptions and source_pages
   - Do NOT merge different PCAs at the same address - keep them as separate rows
   - Example: "670 Progress Unit 8" with PCA #33 and "670 Progress Unit 8" with PCA #43 are DIFFERENT rows

2. PRESERVE GRANULARITY:
   - Keep unit/suite numbers distinct: "Unit 8" ≠ "Unit 11" ≠ no unit specified
   - "670 Progress Avenue Unit 8" ≠ "670 Progress Avenue" (treat as separate addresses)
   - Each unique (Address + PCA) pair = one row

3. NORMALIZE PCA CLASSIFICATION:
   - Map pca_name to official list (1-59) when possible
   - Fill in pca_number if missing but PCA type is recognizable
   - For non-standard PCAs (spills, de-icing, etc.), keep pca_number: null
   - Use consistent naming from official list

3.5. NORMALIZE LOCATION FIELD:
   - Ensure location_relation_to_site is ONLY "On-Site" or "Off-Site"
   - Subject property (670-690 Progress Avenue) → "On-Site"
   - All other addresses → "Off-Site"
   - Move any distance/direction info to description_timeline field

4. ENRICH DESCRIPTIONS:
   - Combine information from multiple chunks
   - Include all business names, dates, waste types
   - Preserve timeline information (e.g., "1986-1998")

5. VERIFY COMPLETENESS:
   - Check for common patterns that indicate multiple PCAs:
     * Same address mentioned multiple times with different activities
     * Multiple waste types suggesting multiple operations
     * Multiple business names at same address over time
   - Ensure each distinct PCA gets its own row

6. FILTER OUT NON-SIGNIFICANT ENTRIES:
   - Remove entries that are just "waste generator" without industrial operation
   - Remove property management/building maintenance routine waste
   - Remove small office/medical waste unless clearly industrial
   - Keep industrial manufacturing, processing, and contamination sources

=== CRITICAL: DO NOT OVER-CONSOLIDATE ===
If you see:
- "670 Progress Avenue" with plating AND electronics → Keep as 2 rows (PCA #33 and #19)
- "675 Progress Avenue" with vehicles, metal treatment, PCB, fuel storage → Keep as 4 rows
- Same address in multiple years with different tenants → Keep separate if different PCAs

Only merge if BOTH address AND PCA number are identical (e.g., duplicate mentions of same operation).

=== WHAT TO REMOVE DURING COMPILATION ===
Remove rows that are:
- Generic waste generators without industrial activity
- Property management/building maintenance
- Small medical/dental offices (pathological waste only)
- Office photoprocessing waste
- Distribution/wholesale without manufacturing
- Support services (security, cleaning, admin)

=== OUTPUT SCHEMA ===
STRICT JSON ONLY:
{{
  "rows": [
    {{
      "address": "string",  // Keep exact unit/suite numbers
      "location_relation_to_site": "string",  // MUST be ONLY "On-Site" or "Off-Site"
      "pca_number": int | null,  // 1-59 or null
      "pca_name": "string",  // From official list or descriptive for "Other"
      "description_timeline": "string",  // Combined, enriched description with distance if off-site
      "source_pages": "start-end[;start2-end2]"  // Semicolon-separated ranges
    }}
  ]
}}

LOCATION FIELD NORMALIZATION:
- Ensure location_relation_to_site is ONLY "On-Site" or "Off-Site"
- If you see distance/direction info (e.g., "ENE/30.5", "20 m south"), map to "Off-Site"
- Move distance/direction information into the description_timeline field
- Subject property is 670-690 Progress Avenue → "On-Site"
- All other addresses → "Off-Site"

Official PCA list:
{pca_definitions}

=== KEYWORD REMINDERS FOR PCA MAPPING ===
- Plating/coating/finishing/electroplating/heavy metals → #33 (Metal Treatment) [OFTEN MISSED]
- Machine shop/metal fabrication/stamping → #34 (Metal Fabrication)  
- Waste oils/petroleum distillates/UST/AST/fuel tanks → #28 (Gasoline Storage)
- Printing/ink/graphics/commercial printing → #31 (Ink Manufacturing)
- Dry cleaning operations/distribution with chemicals → #37 (Dry Cleaning Equipment) [OFTEN MISSED]
- Electronics/circuits/electrical parts manufacturing → #19 (Electronic Equipment)
- Plastics/polybag/polymer/extrusion → #43 (Plastics Manufacturing)
- Automotive/vehicles/auto parts → #57 (Vehicles Manufacturing)
- PCB/transformers/Askarel/ballasts → #55 (Transformer Manufacturing)
- Textile/garment/clothing/canvas → #54 (Textile Manufacturing)
- Fill material/backfill/unknown quality fill → #30 (Fill Material) [OFTEN MISSED]
- Spills/leaks/discharge → null (Other: Spill/Leak of [substance])
- De-icing salts → null (Other: De-icing salts usage)

REMEMBER: Focus on industrial operations performing the activity, not just generic waste generators.

Here are the raw rows to compile (JSON):
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
