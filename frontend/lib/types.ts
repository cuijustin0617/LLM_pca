/**
 * Type definitions for the PCA Extractor application
 */

export interface PCARow {
  pca_identifier: number
  address: string
  location_relation_to_site: string
  pca_number: number | null
  pca_name: string
  description_timeline: string
  source_pages: string
}

export interface Project {
  id: string
  name: string
  eris_file: string
  ground_truth_file: string | null
  created_at: string
  experiment_count: number
}

export interface ExperimentConfig {
  provider: 'openai' | 'gemini'
  model: string
  chunk_size: number
  temperature: number
}

export interface ExtractionConfig {
  provider: 'openai' | 'gemini'
  model: string
  chunk_size: number
  temperature: number
}

export interface Experiment {
  id: string
  project_id: string
  project_name: string
  created_at: string
  config: ExperimentConfig
  rows_extracted: number
  metrics: EvaluationMetrics | null
  status: 'running' | 'completed' | 'failed'
  experiment_dir: string
}

export interface EvaluationMetrics {
  precision: number
  recall: number
  f1_score: number
  accuracy: number
  true_positives: number
  false_positives: number
  false_negatives: number
  gt_count: number
  extracted_count: number
}

export interface EvaluationResult {
  metrics: EvaluationMetrics
  matches: PCARow[]
  false_negatives_list: PCARow[]
  false_positives_list: PCARow[]
}

export interface ExtractionProgress {
  status: 'progress' | 'complete' | 'error'
  message?: string
  progress?: number
  current_chunk?: number
  total_chunks?: number
  experiment_dir?: string
  rows?: PCARow[]
}

export interface ComparisonResult {
  experiments: Experiment[]
  metrics_comparison: {
    [experimentId: string]: EvaluationMetrics
  }
  overlap_analysis: {
    common_true_positives: PCARow[]
    unique_to: {
      [experimentId: string]: PCARow[]
    }
  }
}

export type ExtractionStep = 'upload' | 'config' | 'running' | 'results'

export interface ExtractionState {
  step: ExtractionStep
  projectId: string | null
  uploadedFile: File | null
  config: ExtractionConfig
  jobId: string | null
  progress: number
  logs: string[]
  results: PCARow[]
  editedResults: PCARow[]
  isDirty: boolean
  experimentDir: string | null
  evaluation: EvaluationResult | null
}

