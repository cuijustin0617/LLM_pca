#!/usr/bin/env python3
# extract_pca_llm_simple.py

import os
import re
import json
import base64
import argparse
import logging
import shutil
from pathlib import Path
from datetime import datetime
from dotenv import load_dotenv

import fitz  # PyMuPDF
from tqdm import tqdm

# Optional LLM SDKs
from openai import OpenAI
import google.generativeai as genai

# Import prompt templates
from prompts import EXTRACT_PROMPT_TEMPLATE, COMPILE_PROMPT_TEMPLATE

# -----------------------
# Helpers: logging & IO
# -----------------------

def setup_logging(out_dir: Path):
    log_dir = out_dir / "logs"
    log_dir.mkdir(parents=True, exist_ok=True)
    logfile = log_dir / "run.log"

    logger = logging.getLogger("eris_pca")
    logger.setLevel(logging.INFO)
    logger.handlers.clear()

    file_h = logging.FileHandler(logfile, encoding="utf-8")
    file_h.setLevel(logging.INFO)
    file_fmt = logging.Formatter("%(asctime)s | %(levelname)s | %(message)s")
    file_h.setFormatter(file_fmt)
    logger.addHandler(file_h)

    stream_h = logging.StreamHandler()
    stream_h.setLevel(logging.INFO)
    stream_fmt = logging.Formatter("%(message)s")
    stream_h.setFormatter(stream_fmt)
    logger.addHandler(stream_h)

    return logger, logfile

def save_text(path: Path, text: str):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")

def save_json(path: Path, obj):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, ensure_ascii=False, indent=2), encoding="utf-8")

# -----------------------
# PDF → page texts
# -----------------------

def extract_page_texts(pdf_path: Path):
    doc = fitz.open(pdf_path)
    pages = []
    for i in range(len(doc)):
        page = doc.load_page(i)
        text = page.get_text("text")
        pages.append({"page_num": i+1, "text": text})
    return pages

def page_pix_as_png_bytes(page):
    # For optional VISION; not used unless --vision flag is on
    pix = page.get_pixmap(dpi=200)  # quality vs size
    return pix.tobytes("png")

# -----------------------
# Chunking by word limit
# -----------------------

def word_count(s: str) -> int:
    return len(s.split())

def chunk_pages_by_words(pages, word_limit: int):
    chunks = []
    buf = []
    wcount = 0
    start = None
    for p in pages:
        txt = p["text"] or ""
        wc = word_count(txt)
        if start is None:
            start = p["page_num"]
        # if adding this page would exceed: flush current
        if wcount > 0 and (wcount + wc) > word_limit:
            end = buf[-1]["page_num"]
            chunks.append({"start": start, "end": end, "pages": buf[:]})
            buf.clear()
            wcount = 0
            start = p["page_num"]
        buf.append(p)
        wcount += wc
    if buf:
        end = buf[-1]["page_num"]
        chunks.append({"start": start, "end": end, "pages": buf[:]})
    return chunks

# -----------------------
# Load PCA definitions
# -----------------------

def load_pca_definitions(pca_path: Path):
    raw = pca_path.read_text(encoding="utf-8").strip()
    # Accept either numbered or plain lines
    lines = [ln.strip() for ln in raw.splitlines() if ln.strip()]
    # also create a numbered map if possible
    num_to_name = {}
    items_str = []
    for ln in lines:
        m = re.match(r"^\s*(\d+)\s*[\.\)]?\s*(.+)$", ln)
        if m:
            idx, name = int(m.group(1)), m.group(2).strip()
            num_to_name[idx] = name
            items_str.append(f"{idx}. {name}")
        else:
            items_str.append(ln)
    return "\n".join(items_str), num_to_name

# -----------------------
# LLM calls (OpenAI/Gemini)
# -----------------------

def call_openai_json(prompt: str, model: str, temperature: float = 0.0):
    client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    resp = client.chat.completions.create(
        model=model,
        temperature=temperature,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": "You are a careful, JSON-only extraction assistant for environmental due-diligence."},
            {"role": "user", "content": prompt},
        ],
    )
    return resp.choices[0].message.content

def call_gemini_json(prompt: str, model: str, temperature: float = 0.0):
    genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))
    # Set JSON-only return
    gcfg = genai.types.GenerationConfig(
        temperature=temperature,
        response_mime_type="application/json",
    )
    mdl = genai.GenerativeModel(model_name=model, generation_config=gcfg)
    resp = mdl.generate_content(prompt)
    return resp.text

def call_gemini_json_vision(prompt_text: str, model: str, images: list, temperature: float = 0.0):
    # images: list of {"mime_type": "image/png", "data": b"..."}
    genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))
    gcfg = genai.types.GenerationConfig(
        temperature=temperature,
        response_mime_type="application/json",
    )
    mdl = genai.GenerativeModel(model_name=model, generation_config=gcfg)
    parts = [prompt_text]
    for im in images:
        parts.append({"mime_type": im["mime_type"], "data": im["data"]})
    resp = mdl.generate_content(parts)
    return resp.text

def try_parse_json(text: str):
    # try plain JSON
    try:
        return json.loads(text)
    except Exception:
        pass
    # try fenced
    m = re.search(r"```json\s*(\{.*?\})\s*```", text, flags=re.S)
    if m:
        try:
            return json.loads(m.group(1))
        except Exception:
            pass
    # try any JSON object substring
    m = re.search(r"(\{.*\})", text, flags=re.S)
    if m:
        try:
            return json.loads(m.group(1))
        except Exception:
            pass
    return None

def llm_fix_to_json(raw_text: str, provider: str, model: str, temperature: float):
    prompt = f"""The following text was meant to be strict JSON but is not valid.
Return a valid JSON object ONLY. Do not add commentary.

Text:
{raw_text}
"""
    if provider == "openai":
        fixed = call_openai_json(prompt, model, temperature)
    else:
        fixed = call_gemini_json(prompt, model, temperature)
    return fixed

# -----------------------
# Core pipeline (3 steps)
# -----------------------

def run_pipeline(
    pdf_path: Path,
    pca_list_path: Path,
    out_dir: Path,
    provider: str,
    chunk_word_limit: int,
    temperature: float,
    vision: bool,
    logger: logging.Logger,
):

    # Clear outputs directory for fresh run
    if out_dir.exists():
        logger.info(f"Clearing existing outputs directory: {out_dir}")
        shutil.rmtree(out_dir)
    
    out_chunks = out_dir / "chunks"
    out_final = out_dir / "final"
    out_chunks.mkdir(parents=True, exist_ok=True)
    out_final.mkdir(parents=True, exist_ok=True)

    # Load PCA list
    pca_def_text, num_to_name = load_pca_definitions(pca_list_path)
    logger.info(f"Loaded PCA list with {max([0]+list(num_to_name.keys())) or len(pca_def_text.splitlines())} items from {pca_list_path}.")

    # STEP 1: PDF → page texts
    pages = extract_page_texts(pdf_path)
    logger.info(f"Extracted text from {len(pages)} pages.")

    # STEP 2: Chunk and send to LLM
    chunks = chunk_pages_by_words(pages, chunk_word_limit)
    logger.info(f"Created {len(chunks)} chunks using word limit={chunk_word_limit}.")

    all_rows = []
    for idx, ch in enumerate(chunks, start=1):
        start, end = ch["start"], ch["end"]
        chunk_text = "\n\n".join(p["text"] for p in ch["pages"])
        chunk_file = out_chunks / f"chunk_{idx:03d}_pages_{start:03d}-{end:03d}.txt"
        save_text(chunk_file, chunk_text)

        # progress print(s)
        logger.info(f"Processing pages {start} to {end} by LLM")

        # Build prompt
        prompt = EXTRACT_PROMPT_TEMPLATE.format(
            pca_definitions=pca_def_text,
            start=start,
            end=end,
            text=chunk_text
        )

        # Call provider(s)
        rows_for_chunk = []

        def do_one(provider_name):
            model = os.getenv("OPENAI_MODEL") if provider_name == "openai" else os.getenv("GEMINI_MODEL")
            if provider_name == "openai":
                raw = call_openai_json(prompt, model, temperature)
            else:
                if vision:
                    # If any page has no text and you want LLM-only OCR via Gemini
                    # (We pass the text prompt alone if text is present;
                    #  you could add images too but that complicates chunk payload sizes.)
                    raw = call_gemini_json(prompt, model, temperature)
                else:
                    raw = call_gemini_json(prompt, model, temperature)

            save_text(out_chunks / f"chunk_{idx:03d}_pages_{start:03d}-{end:03d}_{provider_name}_raw.txt", raw)

            obj = try_parse_json(raw)
            if obj is None:
                fixed = llm_fix_to_json(raw, provider_name, model, temperature)
                save_text(out_chunks / f"chunk_{idx:03d}_{provider_name}_raw_fixed.txt", fixed)
                obj = try_parse_json(fixed)

            if obj is None or "rows" not in obj or not isinstance(obj["rows"], list):
                logger.info(f"  Warning: {provider_name} returned no valid JSON rows for chunk {idx}.")
                return []

            # add source_pages if missing
            for r in obj["rows"]:
                r.setdefault("source_pages", f"{start}-{end}")
            save_json(out_chunks / f"chunk_{idx:03d}_{provider_name}_rows.json", obj["rows"])
            return obj["rows"]

        if provider in ("openai", "both"):
            rows_for_chunk.extend(do_one("openai"))
        if provider in ("gemini", "both"):
            rows_for_chunk.extend(do_one("gemini"))

        all_rows.extend(rows_for_chunk)
        logger.info(f"Found {len(rows_for_chunk)} PCA entries.")

    save_json(out_final / "all_rows_raw.json", all_rows)

    # STEP 3: Compile (LLM)
    raw_rows_json = json.dumps({"rows": all_rows}, ensure_ascii=False)
    compile_prompt = COMPILE_PROMPT_TEMPLATE.format(
        pca_definitions=pca_def_text,
        raw_rows_json=raw_rows_json
    )

    logger.info("Compiling all extracted rows with LLM…")
    provider_for_compile = "openai" if provider in ("openai", "both") else "gemini"
    if provider_for_compile == "openai":
        compiled_raw = call_openai_json(compile_prompt, os.getenv("OPENAI_MODEL"), temperature)
    else:
        compiled_raw = call_gemini_json(compile_prompt, os.getenv("GEMINI_MODEL"), temperature)

    save_text(out_final / "compiled_raw.txt", compiled_raw)
    compiled = try_parse_json(compiled_raw)
    if compiled is None:
        # try a one-shot LLM “fix to JSON”
        logger.info("Compiled output not valid JSON; attempting JSON repair via LLM…")
        if provider_for_compile == "openai":
            fixed = llm_fix_to_json(compiled_raw, "openai", os.getenv("OPENAI_MODEL"), temperature)
        else:
            fixed = llm_fix_to_json(compiled_raw, "gemini", os.getenv("GEMINI_MODEL"), temperature)
        save_text(out_final / "compiled_raw_fixed.txt", fixed)
        compiled = try_parse_json(fixed)

    final_rows = compiled.get("rows", []) if isinstance(compiled, dict) else []
    # Add final identifiers
    for i, r in enumerate(final_rows, start=1):
        r["pca_identifier"] = i

    save_json(out_final / "final_rows_compiled.json", final_rows)

    # Also CSV
    csv_path = out_final / "final_rows_compiled.csv"
    cols = ["pca_identifier","address","location_relation_to_site","pca_number","pca_name","description_timeline","source_pages"]
    with csv_path.open("w", encoding="utf-8", newline="") as f:
        f.write(",".join(cols) + "\n")
        def esc(v):
            s = "" if v is None else str(v)
            if any(c in s for c in [",", "\n", '"']):
                s = '"' + s.replace('"','""') + '"'
            return s
        for r in final_rows:
            f.write(",".join(esc(r.get(c,"")) for c in cols) + "\n")

    logger.info(f"Done. Compiled {len(final_rows)} PCA rows.")
    logger.info(f"- JSON: {out_final / 'final_rows_compiled.json'}")
    logger.info(f"- CSV : {csv_path}")

# -----------------------
# CLI
# -----------------------

def main():
    load_dotenv()
    parser = argparse.ArgumentParser(description="Naive, LLM-only ERIS PCA extractor (3 steps).")
    parser.add_argument("--pdf", required=True, help="Path to ERIS PDF.")
    parser.add_argument("--pca-list", required=True, help="Path to PCA definitions text file.")
    parser.add_argument("--out", default="outputs", help="Output directory.")
    parser.add_argument("--provider", choices=["openai","gemini","both"], default="openai", help="Which LLM provider to use.")
    parser.add_argument("--vision", action="store_true", help="Use Gemini Vision if a page has no text (LLM-only OCR).")
    args = parser.parse_args()

    out_dir = Path(args.out)
    logger, logfile = setup_logging(out_dir)

    # echo config (no secrets)
    logger.info(f"PDF: {args.pdf}")
    logger.info(f"PCA list: {args.pca_list}")
    logger.info(f"Provider: {args.provider}")
    logger.info(f"OpenAI model: {os.getenv('OPENAI_MODEL')}")
    logger.info(f"Gemini model: {os.getenv('GEMINI_MODEL')}")
    chunk_limit = int(os.getenv("CHUNK_WORD_LIMIT", "3500"))
    temp = float(os.getenv("TEMPERATURE", "0.0"))
    logger.info(f"Chunk word limit: {chunk_limit}")
    logger.info(f"Temperature: {temp}")
    logger.info(f"Vision: {args.vision}")
    logger.info(f"Logs → {logfile}")

    run_pipeline(
        pdf_path=Path(args.pdf),
        pca_list_path=Path(args.pca_list),
        out_dir=out_dir,
        provider=args.provider,
        chunk_word_limit=chunk_limit,
        temperature=temp,
        vision=args.vision,
        logger=logger
    )

if __name__ == "__main__":
    import sys
    # local CSV writer (avoid adding another dep)
    main()
