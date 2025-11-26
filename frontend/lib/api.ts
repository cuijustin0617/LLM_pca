/**
 * Enhanced API client with all endpoints
 */

import type {
  Project,
  Experiment,
  PCARow,
  EvaluationResult,
  ComparisonResult,
  ExtractionConfig,
} from './types'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

class APIError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = 'APIError'
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Request failed' }))
    throw new APIError(response.status, error.detail || 'Request failed')
  }
  return response.json()
}

export const api = {
  // ==================== Projects ====================
  
  async getProjects(): Promise<Project[]> {
    const response = await fetch(`${API_URL}/projects/`)
    return handleResponse<Project[]>(response)
  },
  
  async getProject(id: string): Promise<Project> {
    const response = await fetch(`${API_URL}/projects/${id}`)
    return handleResponse<Project>(response)
  },
  
  async createProject(
    name: string,
    erisFile: File,
    groundTruthFile?: File
  ): Promise<Project> {
    const formData = new FormData()
    formData.append('name', name)
    formData.append('eris_file', erisFile)
    if (groundTruthFile) {
      formData.append('ground_truth_file', groundTruthFile)
    }
    
    const response = await fetch(`${API_URL}/projects/`, {
      method: 'POST',
      body: formData,
    })
    return handleResponse<Project>(response)
  },
  
  async deleteProject(id: string): Promise<void> {
    const response = await fetch(`${API_URL}/projects/${id}`, {
      method: 'DELETE',
    })
    if (!response.ok) {
      throw new APIError(response.status, 'Failed to delete project')
    }
  },
  
  // ==================== Extraction ====================
  
  async startExtraction(
    file: File,
    config: ExtractionConfig,
    openaiApiKey?: string,
    geminiApiKey?: string,
    projectId?: string
  ): Promise<{ job_id: string; message: string }> {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('provider', config.provider)
    formData.append('model', config.model)
    formData.append('chunk_size', String(config.chunk_size))
    formData.append('temperature', String(config.temperature))
    
    if (openaiApiKey) formData.append('openai_api_key', openaiApiKey)
    if (geminiApiKey) formData.append('gemini_api_key', geminiApiKey)
    if (projectId) formData.append('project_id', projectId)
    
    const response = await fetch(`${API_URL}/extract/`, {
      method: 'POST',
      body: formData,
    })
    return handleResponse(response)
  },
  
  async getExtractionStatus(jobId: string): Promise<{
    status: string
    progress?: number
    message?: string
  }> {
    const response = await fetch(`${API_URL}/extract/${jobId}/status`)
    return handleResponse(response)
  },
  
  async cancelExtraction(jobId: string): Promise<void> {
    const response = await fetch(`${API_URL}/extract/${jobId}/cancel`, {
      method: 'POST',
    })
    if (!response.ok) {
      throw new APIError(response.status, 'Failed to cancel extraction')
    }
  },
  
  // Progress streaming (SSE)
  createProgressStream(jobId: string): EventSource {
    return new EventSource(`${API_URL}/extract/${jobId}/progress`)
  },
  
  // ==================== Experiments ====================
  
  async getExperiments(filters?: {
    project_id?: string
    provider?: string
    min_recall?: number
    limit?: number
    offset?: number
  }): Promise<{ experiments: Experiment[]; total: number }> {
    const params = new URLSearchParams()
    if (filters?.project_id) params.append('project_id', filters.project_id)
    if (filters?.provider) params.append('provider', filters.provider)
    if (filters?.min_recall !== undefined) params.append('min_recall', String(filters.min_recall))
    if (filters?.limit) params.append('limit', String(filters.limit))
    if (filters?.offset) params.append('offset', String(filters.offset))
    
    const url = `${API_URL}/experiments/${params.toString() ? '?' + params.toString() : ''}`
    const response = await fetch(url)
    return handleResponse(response)
  },
  
  async getExperiment(id: string): Promise<Experiment & { rows: PCARow[] }> {
    const response = await fetch(`${API_URL}/experiments/${id}`)
    return handleResponse(response)
  },
  
  async deleteExperiment(id: string): Promise<void> {
    const response = await fetch(`${API_URL}/experiments/${id}`, {
      method: 'DELETE',
    })
    if (!response.ok) {
      throw new APIError(response.status, 'Failed to delete experiment')
    }
  },
  
  async updateExperimentRows(id: string, rows: PCARow[]): Promise<void> {
    const response = await fetch(`${API_URL}/experiments/${id}/rows`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ rows }),
    })
    if (!response.ok) {
      throw new APIError(response.status, 'Failed to update rows')
    }
  },
  
  // ==================== Evaluation ====================
  
  async runBenchmark(
    experimentDir: string,
    groundTruthPath: string
  ): Promise<EvaluationResult> {
    const response = await fetch(`${API_URL}/benchmark/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        experiment_dir: experimentDir,
        ground_truth_path: groundTruthPath,
      }),
    })
    return handleResponse(response)
  },
  
  // ==================== Comparison ====================
  
  async compareExperiments(experimentIds: string[]): Promise<ComparisonResult> {
    const response = await fetch(`${API_URL}/experiments/compare`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ experiment_ids: experimentIds }),
    })
    return handleResponse(response)
  },
  
  // ==================== Health Check ====================
  
  async healthCheck(): Promise<{ status: string }> {
    const response = await fetch(`${API_URL}/`)
    return handleResponse(response)
  },
  
  async testConnection(
    provider: 'openai' | 'gemini',
    apiKey: string
  ): Promise<{ success: boolean; message: string }> {
    const response = await fetch(`${API_URL}/test-connection`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ provider, api_key: apiKey }),
    })
    return handleResponse(response)
  },
}

export { APIError }

