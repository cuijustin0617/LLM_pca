from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

# Load environment variables (optional - will continue if .env not found)
try:
    load_dotenv()
except:
    pass

app = FastAPI(title="ERIS PCA Extraction API", version="1.0.0")

# CORS configuration
origins = [
    "http://localhost:3000",  # Next.js frontend
    "http://localhost:8000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "ERIS PCA Extraction API is running", "status": "healthy"}

# Import and include routers
from backend.routers import extract, benchmark, projects, experiments, prompts
app.include_router(extract.router)
app.include_router(benchmark.router)
app.include_router(projects.router)
app.include_router(experiments.router)
app.include_router(prompts.router)
