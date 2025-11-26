MOST IMPORTANT: during development, for any feature added or bug fixes, ALWAYS add new test cases and ensure existing cases ALL pass. DO NOTadd random md files, focus on rigourous testing and implementing.

# PCA Extractor


Automated PCA extraction from ERIS environmental reports using LLMs.

## Quick Start

### 1. Install Dependencies

```bash
pip install -r requirements.txt
cd frontend && npm install
```

### 2. Start Backend

```bash
cd backend
uvicorn main:app --reload
```

Backend runs at **http://localhost:8000**

### 3. Start Frontend

```bash
cd frontend
npm run dev
```

Frontend runs at **http://localhost:3000**

## Usage

1. Open http://localhost:3000
2. **Configuration**: Set API keys, select model, and configure extraction parameters
3. **Extract**: Upload ERIS PDF and run extraction
4. **Prompts**: Customize and version extraction prompts (optional)
5. **Benchmark**: Evaluate results against ground truth (optional)

## Features

- ⚙️ **Configuration**: Centralized settings for models, chunk size, and API keys
- 🎯 **Extraction**: Upload ERIS PDFs and extract PCAs with editable results
- 📝 **Prompt Management**: Create, edit, and version extraction prompts
- 📊 **Benchmarking**: Evaluate extraction quality with emphasis on recall metric
- 💾 Export results as CSV or JSON

## Models

- **OpenAI**: gpt-4o, gpt-4o-mini, gpt-4-turbo
- **Gemini**: gemini-2.5-pro, gemini-2.5-flash, gemini-2.5-flash-lite

## Testing

**Backend:**
```bash
cd backend
pytest tests/ -v

# Specific test suites:
pytest tests/test_prompts_api.py -v  # Prompt management (13 tests)
pytest tests/test_extract_router.py -v  # Extraction API
```

**Frontend:**
```bash
cd frontend
npm test

# Specific test suites:
npm test -- --run __tests__/integration/prompts-api.test.ts  # Prompt API (8 tests)
npm test -- --run __tests__/unit/configuration-page.test.tsx  # Config page (6 tests)
npm test -- --run __tests__/unit/storage.test.ts  # Storage (13 tests)
```

**Test Coverage:**
- ✅ Backend: 13 prompt management tests + extraction tests
- ✅ Frontend: 43+ core tests including prompt integration
- ✅ All prompt changes are saved to files (verified by tests)

## Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript, TailwindCSS
- **Backend**: FastAPI, Python 3.12
