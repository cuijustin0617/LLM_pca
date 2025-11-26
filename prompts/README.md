# Prompt Versions

This directory contains versioned prompts used for PCA extraction. Prompts are shared between frontend and backend to ensure consistency.

## Structure

- `versions.json` - Metadata about all prompt versions
- `v{N}_extract.txt` - Extraction prompt for version N
- Individual version files contain the complete prompt text

## Adding a New Version

1. Create a new file: `v{N}_extract.txt`
2. Add metadata to `versions.json`:
```json
{
  "id": "v{N}",
  "name": "Version {N} - Description",
  "extract_file": "v{N}_extract.txt",
  "createdAt": "2025-01-01T00:00:00Z",
  "active": false,
  "description": "What changed in this version"
}
```
3. Update the backend to use the new version if needed
4. Frontend will automatically load available versions

## Current Versions

- **v1**: Default extraction prompt with significance criteria and examples

