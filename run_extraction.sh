#!/bin/bash
# Run PCA extraction on specific project
# Usage: ./run_extraction.sh project_name

if [ -z "$1" ]; then
  echo "Usage: ./run_extraction.sh <project_name>"
  echo "Or use: ./run_project.sh --project <project_name>"
  exit 1
fi

python src/extract_pca_llm_simple.py \
  --pdf "data/projects/$1/ERIS.pdf" \
  --pca-list data/pca_definitions.txt \
  --provider gemini \
  "${@:2}"

