import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
ROOT_DIR = BASE_DIR.parent

UPLOAD_DIR = ROOT_DIR / "data" / "uploads"
OUTPUT_DIR = ROOT_DIR / "outputs" / "experiments"
PROJECTS_DIR = ROOT_DIR / "data" / "projects"

# Ensure directories exist
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
PROJECTS_DIR.mkdir(parents=True, exist_ok=True)
