"""
Prompt templates for PCA extraction from ERIS reports.
Edit these prompts to adjust extraction behavior.
"""

EXTRACT_PROMPT_TEMPLATE = """\
Extract ALL PCA (Potentially Contaminating Activity) entries from the ERIS report text.

CRITICAL: Create a SEPARATE ROW for EACH unique (Address + PCA) combination.
- If an address has multiple PCAs, create multiple rows (one per PCA)
- Include EXACT unit/suite numbers when present (e.g., "Unit 12", "Suite 504")
- Include BOTH on-site and off-site PCAs
- Include standard numbered PCAs (#1-59) AND non-standard "Other" category PCAs

Return STRICT JSON with this schema:

{{
  "rows": [
    {{
      "address": "string",  // PRESERVE exact address including unit/suite numbers
      "location_relation_to_site": "string",  // e.g., "On-Site" or "Off-Site" 
      "pca_number": int | null,  // 1-59 from official list, or null for "Other"
      "pca_name": "string",  // Full PCA name from official list
      "description_timeline": "string",  // Business names, operations, timeline, waste types
      "source_pages": "start-end"  // the page range provided belo
    }}
  ]
}}

=== EXTRACTION RULES ===

1. ADDRESS GRANULARITY:
   - PRESERVE exact unit/suite numbers: "670 Progress Avenue Unit 8", "700 Progress Avenue Unit 7"
   - Do NOT consolidate multiple units to building level
   - Keep address formatting as it appears in source

2. MULTIPLE PCAs AT SAME ADDRESS:
   - Create SEPARATE rows for each PCA at an address
   - Example: If "675 Progress Avenue" has Metal Treatment (#33) AND Vehicles Manufacturing (#57), create 2 rows

3. PCA TYPE CLASSIFICATION:
   - Match activities to official PCA list (1-59) when possible
   - Look for keywords: "plating" → #33, "waste oils" → #28, "printing" → #31, etc.
   - For activities not in official list, use pca_number: null and describe in pca_name

4. NON-STANDARD PCAs (IMPORTANT - often missed):
   - Spills/leaks (oil, gasoline, diesel, chemicals)
   - De-icing salts usage
   - Fill material importation
   - Underground/aboveground storage tank (UST/AST) removal
   - PCB storage sites
   - Transformers with PCBs
   Include these even if not in official numbered list (set pca_number to null)

5. HISTORICAL OPERATIONS:
   - Extract ALL historical tenants/operations mentioned with dates
   - Include City Directory listings from different years
   - Include operations that are "OUT OF BUSINESS" or historical

6. LOCATION CLASSIFICATION:
   - "On-Site" or "On Site" → "On-Site"
   - Distance-based (e.g., "30 m south", "ENE/30.5") → keep as-is
   - "Off-Site", "East Adjacent", "(20 m south)" → keep descriptive text

7. DESCRIPTION COMPLETENESS:
   - Include business/company names
   - Include operation types and SIC codes
   - Include timeline/dates (e.g., "1986-1998", "1991 to 2000")
   - Include waste types generated (e.g., "halogenated solvents", "petroleum distillates")

=== FEW-SHOT EXAMPLES ===

Example 1: Multiple PCAs at same address
Input: "675 Progress Avenue: A.G. Simpson Co. - metal stamping (1947-), waste generator of oils (1993), plating operations, PCB storage (1991-2000)"
Output: 3 SEPARATE ROWS:
  - Row 1: 675 Progress Avenue, PCA #57 (Vehicles Manufacturing), "A.G. Simpson metal stamping 1947-"
  - Row 2: 675 Progress Avenue, PCA #33 (Metal Treatment/Plating), "A.G. Simpson plating operations"
  - Row 3: 675 Progress Avenue, PCA #55 (Transformer/PCB), "PCB storage 1991-2000"

Example 2: Unit-level granularity
Input: "690 Progress Avenue Unit 11: electro plating shop (1982)"
Output: Keep exact unit: "690 Progress Avenue Unit 11", PCA #33

Example 3: Non-standard "Other" PCA
Input: "690 Progress Avenue Unit 14: waste oil spill, Macusi Wood Products (2011)"
Output: pca_number: null, pca_name: "Spill/Leak of Gasoline and Associated Products", description includes "waste oil spill 2011"

Example 4: Dry cleaning (often missed)
Input: "670 Progress Avenue Unit 11: GBA Refineries Ltd, dry cleaning distribution (1991-2000), 200L AST"
Output: PCA #37 (Operation of Dry Cleaning Equipment)

Example 5: Fill material (often missed)
Input: "Former UST removed and backfilled in 1999, unknown quality fill material"
Output: pca_number: 30, pca_name: "Importation of Fill Material of Unknown Quality"

=== COMMON KEYWORDS FOR PCA MAPPING ===
- "plating", "coating", "finishing", "electro plating" → PCA #33 (Metal Treatment)
- "machine shop", "metal fabrication", "metalworking" → PCA #34 (Metal Fabrication)
- "waste oils", "petroleum distillates", "UST", "AST", "fuel tank" → PCA #28 (Gasoline Storage)
- "printing", "graphics", "ink" → PCA #31 (Ink Manufacturing)
- "dry cleaning" → PCA #37 (Dry Cleaning Equipment)
- "textile", "garment", "clothing", "apparel" → PCA #54 (Textile Manufacturing)
- "electronics", "circuit", "electrical parts" → PCA #19 (Electronic Equipment)
- "plastic", "polybag", "polymer" → PCA #43 (Plastics Manufacturing)
- "vehicles", "automotive", "auto parts" → PCA #57 (Vehicles Manufacturing)
- "PCB", "transformer", "Askarel" → PCA #55 (Transformer Manufacturing)
- "spill", "leak", "overflow" → null (Other: Spill/Leak)
- "de-icing salt" → null (Other: De-icing salts usage)
- "fill material", "backfill" → PCA #30 (Fill Material)

Official PCA list (for mapping):
{pca_definitions}

SOURCE PAGES {start}-{end} (concatenated text follows):
----
{text}
"""

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

=== CRITICAL: DO NOT OVER-CONSOLIDATE ===
If you see:
- "670 Progress Avenue" with plating AND electronics → Keep as 2 rows (PCA #33 and #19)
- "675 Progress Avenue" with vehicles, metal treatment, PCB, fuel storage → Keep as 4 rows
- Same address in multiple years with different tenants → Keep separate if different PCAs

Only merge if BOTH address AND PCA number are identical (e.g., duplicate mentions of same operation).

=== OUTPUT SCHEMA ===
STRICT JSON ONLY:
{{
  "rows": [
    {{
      "address": "string",  // Keep exact unit/suite numbers
      "location_relation_to_site": "string",
      "pca_number": int | null,  // 1-59 or null
      "pca_name": "string",  // From official list or descriptive for "Other"
      "description_timeline": "string",  // Combined, enriched description
      "source_pages": "start-end[;start2-end2]"  // Semicolon-separated ranges
    }}
  ]
}}

Official PCA list:
{pca_definitions}

=== KEYWORD REMINDERS FOR PCA MAPPING ===
- Plating/coating → #33 (Metal Treatment)
- Machine shop → #34 (Metal Fabrication)  
- Waste oils/fuel tanks → #28 (Gasoline Storage)
- Printing/ink/graphics → #31 (Ink Manufacturing)
- Dry cleaning → #37 (Dry Cleaning Equipment)
- Electronics/circuits → #19 (Electronic Equipment)
- Plastics/polybag → #43 (Plastics Manufacturing)
- Automotive/vehicles → #57 (Vehicles Manufacturing)
- PCB/transformers → #55 (Transformer Manufacturing)
- Textile/clothing → #54 (Textile Manufacturing)
- Fill material/backfill → #30 (Fill Material)
- Spills/leaks → null (Other)

Here are the raw rows to compile (JSON):
{raw_rows_json}
"""

