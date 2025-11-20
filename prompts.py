"""
Prompt templates for PCA extraction from ERIS reports.
Edit these prompts to adjust extraction behavior.
"""

EXTRACT_PROMPT_TEMPLATE = """\
Extract PCA table rows from the provided ERIS report text. Focus ONLY on the PCA table (ignore APEC).
Return STRICT JSON with this schema:

{{
  "rows": [
    {{
      "address": "string",
      "location_relation_to_site": "string",
      "pca_number": int | null,
      "pca_name": "string",
      "description_timeline": "string",
      "source_pages": "start-end"  // the page range I give you below
    }}
  ]
}}

Rules:
- Parse multi-line cells correctly.
- with your best guess, map the PCA name to the official list (below), include its number in "pca_number". 
- Do NOT invent rows; only include entries you truly see implied by the text.
- Keep addresses as they appear; it's OK if repeated across rows.
- Return compact but valid JSON (no comments).

Official PCA list (for mapping):
{pca_definitions}

SOURCE PAGES {start}-{end} (concatenated text follows):
----
{text}
"""

COMPILE_PROMPT_TEMPLATE = """\
You are compiling PCA rows extracted in parts. Your job:
1) Deduplicate rows that refer to the same PCA entry in the ERIS table (same address & PCA text; combine descriptions).
2) Normalize "pca_name" against this official list when possible; fill "pca_number" if you can recognize it
3) Keep fields: address, location_relation_to_site, pca_number, pca_name, description_timeline, source_pages.
4) STRICT JSON ONLY, schema:
{{
  "rows": [ {{ "address": "...", "location_relation_to_site": "...", "pca_number": int | null, "pca_name": "...", "description_timeline": "...", "source_pages": "start-end[;start2-end2]" }} ]
}}

Official PCA list:
{pca_definitions}

Here are the raw rows to compile (JSON):
{raw_rows_json}
"""

