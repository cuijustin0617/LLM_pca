# Manual Comparison: ERIS PCA Extractor vs Ground Truth

## Summary Statistics
- **Ground Truth Entries**: 41 PCA records
- **ERIS Extractor Entries**: 62 PCA records
- **Note**: ERIS has more entries, often splitting by unit/address more granularly

## Detailed Matching Analysis

### GT #1: 670, 680, 690 Progress Avenue - De-icing salts
- **Match Status**: ❌ NOT FOUND
- **Notes**: No de-icing salts entry in ERIS extractor

### GT #2: 670 Progress Avenue - Metal Treatment (#33) - Combustion & Energy (1980-1985/86)
- **Match Status**: ❌ NOT FOUND
- **Notes**: No Combustion & Energy entry in ERIS extractor

### GT #3: 670 Progress Avenue Unit 1 - Electronic Equipment (#19) - Leecraft/Anro Electronic (1988-1998)
- **Match Status**: ✅ PARTIAL MATCH
- **ERIS**: Entry #49 "Anro Electric; at 670 Progress Avenue; (PCA: Electronic and Computer Equipment Manufacturing)"
- **ERIS**: Entry #45 "at 670 Progress Avenue; (PCA: Electronic and Computer Equipment Manufacturing); records 1999–2001"
- **Issue**: Different timeline (1999-2001 vs 1988-1998), company name slightly different (Anro Electric vs Anro Electronic/Leecraft)

### GT #4: 670 Progress Avenue Unit 1-6 - Metal Treatment (#33) - Manufacturing/lock assembly (1982)
- **Match Status**: ❌ NOT FOUND
- **Notes**: No lock assembly or manufacturing entry for units 1-6

### GT #5: 670 Progress Avenue Unit 7-8 - Plastics (#43) - Hang Tough Products (1982)
- **Match Status**: ❌ NOT FOUND
- **Notes**: No Hang Tough Products entry

### GT #6: 670 Progress Avenue Unit 8 - Metal Treatment (#33) - Cases Unlimited (1999)
- **Match Status**: ❌ NOT FOUND
- **Notes**: No Cases Unlimited entry

### GT #7: 670 Progress Avenue Unit 8 - Plastics (#43) - Cooltec Coolers (1978, 1989)
- **Match Status**: ✅ PARTIAL MATCH
- **ERIS**: Entry #51 "at 670 Progress Avenue; (PCA: Plastics (including Fibreglass) Manufacturing and Processing)"
- **ERIS**: Entry #48 "at 670 Progress Avenue; (PCA: Plastics (including Fibreglass) Manufacturing and Processing); record 3912"
- **Issue**: No company name mentioned, no timeline

### GT #8: 670 Progress Avenue Unit 9 - Metal Treatment (#33) - Argon Hoist (1982)
- **Match Status**: ❌ NOT FOUND
- **Notes**: No Argon Hoist or unit 9 metal fabrication entry

### GT #9: 670 Progress Avenue Unit 11 - Dry Cleaning (#37) - GBA Refineries (1991-2000)
- **Match Status**: ❌ NOT FOUND
- **Notes**: No dry cleaning or GBA Refineries entry

### GT #10: 670 Progress Avenue Unit 12 - Gasoline Storage (#28) - All-Lift (1993-2015)
- **Match Status**: ❌ NOT FOUND
- **Notes**: No gasoline storage or All-Lift entry at 670 Progress

### GT #11: 670 Progress Avenue Unit 11-12 - Storage/Maintenance (#52) - All-Lift
- **Match Status**: ❌ NOT FOUND
- **Notes**: No storage/maintenance PCA entry

### GT #12: 670 Progress Avenue Unit 11-12 - Fill Material (#30) - Unknown quality fill (1999)
- **Match Status**: ❌ NOT FOUND
- **Notes**: No fill material importation entry

### GT #13: 680 Progress Avenue - Vehicle Manufacturing (#57) - Modu-Tronics (1986-1998)
- **Match Status**: ⚠️ WRONG PCA CATEGORY
- **ERIS**: Entry #58 "Modu-Tronics Inc; at 680 Progress Avenue; (PCA: Electronic and Computer Equipment Manufacturing); records 1992–1998"
- **Issue**: Wrong PCA category (#19 vs #57), timeline slightly off (1992-1998 vs 1986-1998)

### GT #14: 680 Progress Avenue - Plastics (#43) - Malpack Polybag (1980-1991)
- **Match Status**: ❌ NOT FOUND
- **Notes**: No Malpack Polybag entry

### GT #15: 680 Progress Avenue Unit 2 - Metal Treatment (#33) - Metal working (1982)
- **Match Status**: ❌ NOT FOUND
- **Notes**: No unit 2 metal working entry

### GT #16: 690 Progress Avenue - Plastics (#43) - Prosperous Manufacturing (1995-2000)
- **Match Status**: ❌ NOT FOUND
- **Notes**: No Prosperous Manufacturing entry

### GT #17: 690 Progress Avenue Unit 10 - Electronic Equipment (#19) - Crest Circuit (1986-1998)
- **Match Status**: ⚠️ WRONG PCA CATEGORY
- **ERIS**: Entry #4 "Crest Circuit Company Limited; at 68690 Progress Avenue; (PCA: Solvent Manufacturing, Processing and Bulk Storage); records 1986–1989"
- **ERIS**: Entry #61 "at 690 Progress Avenue; (PCA: Solvent Manufacturing, Processing and Bulk Storage); records 1992–1998"
- **Issue**: Wrong PCA category (#51 vs #19), timeline split incorrectly

### GT #18: 690 Progress Avenue Unit 11 - Metal Treatment (#33) - Electroplating (1982)
- **Match Status**: ❌ NOT FOUND
- **Notes**: No electroplating entry

### GT #19: 690 Progress Avenue Unit 12 - Chemical Manufacturing (#8) - Hankin Atlas (1988)
- **Match Status**: ❌ NOT FOUND
- **Notes**: No Hankin Atlas entry

### GT #20: 690 Progress Avenue Unit 12 - Metal Treatment (#33) - Hankin Atlas (1988)
- **Match Status**: ❌ NOT FOUND
- **Notes**: Same as above

### GT #21: 690 Progress Avenue Unit 14 - Spill - Macusi Wood Products (2011)
- **Match Status**: ❌ NOT FOUND
- **Notes**: No spill entry or Macusi Wood Products

### GT #22: 690 Progress Avenue Unit 15-17 - Metal Treatment (#33) - Gaya Industries (1985-1991)
- **Match Status**: ⚠️ WRONG ADDRESS
- **ERIS**: Entry #1 "Gaya Industries Ltd; at 4680 Progress Avenue; (PCA: Solvent Manufacturing, Processing and Bulk Storage); records 1986–1988"
- **Issue**: Wrong address (4680 vs 690), wrong PCA (#51 vs #33), timeline close (1986-1988 vs 1985-1991)

### GT #23: 700 Progress Avenue - Metal Treatment (#33) - Trillium Communication (1992-1998)
- **Match Status**: ⚠️ PCA MISMATCH
- **ERIS**: Entry #9 "at 700 Progress Avenue; (PCA: Metal Treatment, Coating, Plating and Finishing); records 1992–2010"
- **Note**: Timeline overlap but extends to 2010; no company name; may be grouped with other entries

### GT #24: 700 Progress Avenue Unit 1 - Gasoline Storage (#28) - UST (1982)
- **Match Status**: ❌ NOT FOUND
- **Notes**: No UST or gasoline storage entry at unit 1

### GT #25: 700 Progress Avenue Unit 7 - Gasoline Storage (#28) - Dasa Manufacturing (2010-2014)
- **Match Status**: ❌ NOT FOUND
- **Notes**: No Dasa Manufacturing at 700 Progress in ERIS extractor

### GT #26: 700 Progress Avenue Unit 7 - Electronic Equipment (#19) - Dasa Manufacturing (2010-2014)
- **Match Status**: ❌ NOT FOUND
- **Notes**: Same as above

### GT #27: 700 Progress Avenue Unit 7 - Transformer (#55) - 300-kV transformer (1982)
- **Match Status**: ❌ NOT FOUND
- **Notes**: No transformer entry

### GT #28: 700 Progress Avenue Unit 10 - Gasoline Storage (#28) - Ability Machine (1986-1998)
- **Match Status**: ❌ NOT FOUND (Wrong PCA)
- **Notes**: No gasoline storage entry for Ability Machine

### GT #29: 700 Progress Avenue Unit 13 - Electronic Equipment (#19) - Quick Circuits/Expert Circuits (1992-2016)
- **Match Status**: ✅ PARTIAL MATCH
- **ERIS**: Entry #13 "Expert Circuits Inc.; at 700 Progress Avenue; (PCA: Electronic and Computer Equipment Manufacturing); records 2000–2010"
- **ERIS**: Entry #15 "at 700 Progress Avenue; (PCA: Electronic and Computer Equipment Manufacturing)"
- **Issue**: Timeline incomplete (2000-2010 vs 1992-2016), Quick Circuits not mentioned

### GT #30: 700 Progress Avenue Unit 15-16 - Metal Treatment (#33) - Brite Plating (1992-1998)
- **Match Status**: ❌ NOT FOUND
- **Notes**: No Brite Plating entry

### GT #31: 675 Progress Avenue - Vehicle Manufacturing (#57) - A.G. Simpson (1986-2016)
- **Match Status**: ❌ NOT FOUND (Wrong PCA)
- **Notes**: No vehicle manufacturing entry for A.G. Simpson

### GT #32: 675 Progress Avenue - Metal Treatment (#33) - A.G. Simpson (1947+)
- **Match Status**: ❌ NOT FOUND
- **Notes**: No metal treatment entry for A.G. Simpson

### GT #33: 675 Progress Avenue - Transformer (#55) - A.G. Simpson PCB (1991-2000)
- **Match Status**: ❌ NOT FOUND
- **Notes**: No transformer/PCB entry for A.G. Simpson

### GT #34: 675 Progress Avenue - Pulp/Paper (#45) - Atlantic Packaging
- **Match Status**: ❌ NOT FOUND
- **Notes**: No Atlantic Packaging entry

### GT #35: 675 Progress Avenue - Gasoline Storage (#28) - 3,600L tank (1993)
- **Match Status**: ❌ NOT FOUND
- **Notes**: No gasoline storage entry

### GT #36: 675 Progress Avenue - Spill - 20L oil (2015)
- **Match Status**: ❌ NOT FOUND
- **Notes**: No spill entry for A.G. Simpson

### GT #37: 300 Consilium Place Suite 800 - Spill - 100L diesel (2003)
- **Match Status**: ❌ NOT FOUND
- **Notes**: No Consilium Place entries in ERIS extractor

### GT #38: 111 Grangeway Avenue - Transformer (#55) - Royal Bank PCB (1989-2004)
- **Match Status**: ❌ NOT FOUND
- **Notes**: No Royal Bank or Grangeway Avenue entries

### GT #39: 111 Grangeway Avenue Suite 504 - Pulp/Paper (#45) - Hoffman Enclosures (2009)
- **Match Status**: ⚠️ MANGLED DATA
- **ERIS**: Entry #25 has corrupted text mentioning "Hoffman Enclosures Inc. 111 Grangeway Ave Suite 504" but embedded in wrong entry
- **Issue**: Data appears corrupted/merged with other entries

### GT #40: 100 Consilium Place - Dry Cleaning (#47) - (1991-2000)
- **Match Status**: ❌ NOT FOUND
- **Notes**: No dry cleaning or Consilium Place entries

### GT #41: (This line doesn't exist in GT - line 42 is empty)

---

## Additional Entries in ERIS Extractor Not in GT

The ERIS extractor has many entries at the following locations that are NOT in ground truth:
- Multiple 700 Progress Avenue entries with solvents (#51) and paints (#39)
- 705 Progress Avenue entries (multiple units)
- 710 Progress Avenue entries
- 721 Progress Avenue entries
- 727 Progress Avenue entries
- 651 Progress Avenue - Labelcraft Products
- Various corrupted/malformed entries

---

## MATCH SUMMARY

### Excellent Matches: 0
- None

### Good/Partial Matches: 3
- GT #3: Anro Electronic/Leecraft (wrong timeline)
- GT #7: Plastics at 670 Progress (no details)
- GT #29: Expert Circuits (incomplete timeline)

### Wrong Category/Address: 4
- GT #13: Modu-Tronics (wrong PCA category #19 vs #57)
- GT #17: Crest Circuit (wrong PCA category #51 vs #19)
- GT #22: Gaya Industries (wrong address, wrong PCA)
- GT #23: Metal treatment at 700 Progress (may be match but unclear)

### Not Found: 34
- All others including:
  - De-icing salts
  - All historical City Directory entries from 1980s
  - All FIP Siteplan Report entries
  - All-Lift operations
  - Malpack Polybag
  - All A.G. Simpson PCAs (major facility completely missing)
  - Royal Bank PCB facility
  - Dasa Manufacturing
  - Ability Machine
  - Brite Plating
  - Spills
  - Transformers
  - Dry cleaning operations
  - Fill material

---

## OVERALL MATCHING PERCENTAGE

**Calculation Method 1 (Strict):**
- Excellent Matches: 0 × 100% = 0%
- Good/Partial Matches: 3 × 60% = 180%
- Wrong Category: 4 × 20% = 80%
- Not Found: 34 × 0% = 0%

**Total: 260 / 4100 = 6.3%**

**Calculation Method 2 (Lenient - counting any mention):**
- Any reasonable match: 7 out of 41 = **17.1%**

**MATCHING PERCENTAGE: ~7-17%**

---

## CRITICAL ISSUES WITH ERIS EXTRACTOR

### Major Problems:

1. **❌ DATA CORRUPTION**: Multiple entries have corrupted/mangled text
   - Entry #25 has random text embedded: "20170208162SiteAddressDistance (m)Map KeyHoffman Enclosures Inc. 111 Grangeway Ave..."
   - Entry #6 has corrupted text: "20170208162SiteAddressDistance (m)Map KeyINNOV(OUT OF BUSINESS)"
   - Entry #16, #17, #22, #27, #28 have similar corruption

2. **❌ WRONG PCA CATEGORIES**: Systematic miscategorization
   - Modu-Tronics: Vehicle manufacturing (#57) → Electronic equipment (#19)
   - Crest Circuit: Electronic equipment (#19) → Solvent manufacturing (#51)
   - Gaya Industries: Metal treatment (#33) → Solvent manufacturing (#51)
   - Many electronic manufacturers incorrectly categorized as solvent/paint

3. **❌ MISSING MAJOR FACILITIES**: Completely absent
   - A.G. Simpson Co. (largest contamination source, 6 PCAs in GT) - **COMPLETELY MISSING**
   - All-Lift operations at 670 Progress
   - Royal Bank PCB facility
   - Brite Plating
   - Most City Directory findings

4. **❌ WRONG ADDRESSES**:
   - Gaya Industries: 690 Progress → listed as 4680 Progress
   - Entry #4: "68690 Progress Avenue" (typo/merge error)

5. **❌ DUPLICATE/REDUNDANT ENTRIES**: 
   - Many addresses have multiple entries for same PCA with no clear differentiation
   - Example: 700 Progress has 10+ entries, many duplicates

6. **❌ INCOMPLETE TIMELINES**:
   - Expert Circuits: 2000-2010 (should be 1992-2016)
   - Crest Circuit: 1986-1989 (should be 1986-1998)

7. **❌ MISSING DATA SOURCES**:
   - No City Directory entries from 1970s-1980s
   - No FIP Siteplan Report (1982) findings
   - No site visit observations
   - No spill records
   - No historical investigation reports

8. **❌ NO COMPANY NAMES**: Many entries missing company names
   - Just generic "at 670 Progress Avenue; (PCA: ...)"

9. **❌ PATTERN RECOGNITION FAILURE**:
   - Appears to extract only from certain database formats
   - Misses narrative descriptions
   - Can't parse historical reports

10. **❌ OVER-EXTRACTION**: 62 entries vs 41 in GT
    - Many are low-quality duplicates
    - Adds noise rather than value

---

## COMPARISON WITH COMPILED RESULTS

The previous `final_rows_compiled.csv` had **~47-50% match rate**
The ERIS extractor has **~7-17% match rate**

**ERIS extractor is MUCH WORSE than the compiled results**

### Why Compiled Results Were Better:
1. ✅ Captured A.G. Simpson complex (6 PCAs)
2. ✅ Better company name extraction
3. ✅ More accurate PCA categorization
4. ✅ Better timeline accuracy
5. ✅ Included spill records
6. ✅ More comprehensive waste types

### Why ERIS Extractor Failed:
1. ❌ Data corruption issues
2. ❌ Systematic PCA miscategorization
3. ❌ Missing entire major facilities
4. ❌ Address errors
5. ❌ Over-relies on specific database format
6. ❌ Can't parse historical reports or narratives

---

## RECOMMENDATIONS

### Critical Fixes Needed:

1. **FIX DATA EXTRACTION**: The text extraction is corrupted - appears to be pulling in table headers and metadata
2. **FIX PCA CATEGORIZATION**: Needs better logic to assign correct PCA numbers
3. **FIX ADDRESS PARSING**: Many address errors and typos
4. **REMOVE DUPLICATES**: Need deduplication logic
5. **IMPROVE COMPANY NAME EXTRACTION**: Most entries lack company names
6. **EXPAND SOURCE COVERAGE**: Must capture City Directory, FIP reports, site visits
7. **ADD SPILL DETECTION**: No spill records captured
8. **FIX TIMELINE EXTRACTION**: Many incomplete or wrong timelines

### This Extractor Needs Major Rework
The ERIS PCA extractor appears to be extracting from a very limited source (possibly just one database table) and doing so incorrectly with data corruption. It's performing significantly worse than the other extraction approach.




