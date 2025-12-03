/**
 * Zustand store for global state management
 */

import { create } from 'zustand'
import type {
  Project,
  Experiment,
  PCARow,
  ExtractionState,
  ExtractionConfig,
  EvaluationResult,
} from '@/lib/types'
import { storage } from '@/lib/storage'

interface AppState {
  // Projects
  projects: Project[]
  selectedProject: Project | null
  setProjects: (projects: Project[]) => void
  setSelectedProject: (project: Project | null) => void
  addProject: (project: Project) => void
  removeProject: (id: string) => void
  
  // Experiments
  experiments: Experiment[]
  selectedExperiment: Experiment | null
  setExperiments: (experiments: Experiment[]) => void
  setSelectedExperiment: (experiment: Experiment | null) => void
  addExperiment: (experiment: Experiment) => void
  removeExperiment: (id: string) => void
  updateExperiment: (id: string, updates: Partial<Experiment>) => void
  
  // Extraction state
  extraction: ExtractionState
  setExtractionStep: (step: ExtractionState['step']) => void
  setExtractionProject: (projectId: string | null) => void
  setExtractionFile: (file: File | null) => void
  setExtractionConfig: (config: ExtractionConfig) => void
  setExtractionJobId: (jobId: string | null) => void
  setExtractionProgress: (progress: number) => void
  addExtractionLog: (log: string) => void
  setExtractionResults: (rows: PCARow[]) => void
  setEditedResults: (rows: PCARow[]) => void
  setExtractionDirty: (isDirty: boolean) => void
  setExtractionExperimentDir: (dir: string | null) => void
  setExtractionEvaluation: (evaluation: EvaluationResult | null) => void
  resetExtraction: () => void
  
  // UI state
  sidebarOpen: boolean
  theme: 'light' | 'dark'
  setSidebarOpen: (open: boolean) => void
  setTheme: (theme: 'light' | 'dark') => void
  toggleTheme: () => void
  
  // Comparison
  comparisonExperiments: string[]
  setComparisonExperiments: (ids: string[]) => void
  addToComparison: (id: string) => void
  removeFromComparison: (id: string) => void
  clearComparison: () => void
}

const defaultExtractionState: ExtractionState = {
  step: 'upload',
  projectId: null,
  uploadedFile: null,
  config: {
    provider: (storage.getProvider() as 'openai' | 'gemini') || 'gemini',
    model: storage.getModel() || 'gemini-2.5-flash',
    chunk_size: storage.getChunkSize() || 10000,
    temperature: storage.getTemperature() || 0.0,
  },
  jobId: null,
  progress: 0,
  logs: [],
  results: [],
  editedResults: [],
  isDirty: false,
  experimentDir: null,
  evaluation: null,
}

export const useStore = create<AppState>((set, get) => ({
  // Projects
  projects: [],
  selectedProject: null,
  setProjects: (projects) => set({ projects }),
  setSelectedProject: (project) => set({ selectedProject: project }),
  addProject: (project) => set((state) => ({ projects: [...state.projects, project] })),
  removeProject: (id) => set((state) => ({
    projects: state.projects.filter((p) => p.id !== id),
    selectedProject: state.selectedProject?.id === id ? null : state.selectedProject,
  })),
  
  // Experiments
  experiments: [],
  selectedExperiment: null,
  setExperiments: (experiments) => set({ experiments }),
  setSelectedExperiment: (experiment) => set({ selectedExperiment: experiment }),
  addExperiment: (experiment) => set((state) => ({
    experiments: [experiment, ...state.experiments],
  })),
  removeExperiment: (id) => set((state) => ({
    experiments: state.experiments.filter((e) => e.id !== id),
    selectedExperiment: state.selectedExperiment?.id === id ? null : state.selectedExperiment,
  })),
  updateExperiment: (id, updates) => set((state) => ({
    experiments: state.experiments.map((e) =>
      e.id === id ? { ...e, ...updates } : e
    ),
    selectedExperiment:
      state.selectedExperiment?.id === id
        ? { ...state.selectedExperiment, ...updates }
        : state.selectedExperiment,
  })),
  
  // Extraction state
  extraction: defaultExtractionState,
  setExtractionStep: (step) => set((state) => ({
    extraction: { ...state.extraction, step },
  })),
  setExtractionProject: (projectId) => set((state) => ({
    extraction: { ...state.extraction, projectId },
  })),
  setExtractionFile: (uploadedFile) => set((state) => ({
    extraction: { ...state.extraction, uploadedFile },
  })),
  setExtractionConfig: (config) => set((state) => ({
    extraction: { ...state.extraction, config },
  })),
  setExtractionJobId: (jobId) => set((state) => ({
    extraction: { ...state.extraction, jobId },
  })),
  setExtractionProgress: (progress) => set((state) => ({
    extraction: { ...state.extraction, progress },
  })),
  addExtractionLog: (log) => set((state) => ({
    extraction: {
      ...state.extraction,
      logs: [...state.extraction.logs, log],
    },
  })),
  setExtractionResults: (results) => set((state) => ({
    extraction: {
      ...state.extraction,
      results,
      editedResults: results,
      isDirty: false,
    },
  })),
  setEditedResults: (editedResults) => set((state) => ({
    extraction: {
      ...state.extraction,
      editedResults,
      isDirty: JSON.stringify(editedResults) !== JSON.stringify(state.extraction.results),
    },
  })),
  setExtractionDirty: (isDirty) => set((state) => ({
    extraction: { ...state.extraction, isDirty },
  })),
  setExtractionExperimentDir: (experimentDir) => set((state) => ({
    extraction: { ...state.extraction, experimentDir },
  })),
  setExtractionEvaluation: (evaluation) => set((state) => ({
    extraction: { ...state.extraction, evaluation },
  })),
  resetExtraction: () => set({ extraction: defaultExtractionState }),
  
  // UI state
  sidebarOpen: true,
  theme: 'dark',
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setTheme: (theme) => set({ theme }),
  toggleTheme: () => set((state) => ({
    theme: state.theme === 'light' ? 'dark' : 'light',
  })),
  
  // Comparison
  comparisonExperiments: [],
  setComparisonExperiments: (ids) => set({ comparisonExperiments: ids }),
  addToComparison: (id) => set((state) => {
    if (state.comparisonExperiments.includes(id)) return state
    if (state.comparisonExperiments.length >= 3) {
      // Max 3 experiments
      return { comparisonExperiments: [...state.comparisonExperiments.slice(1), id] }
    }
    return { comparisonExperiments: [...state.comparisonExperiments, id] }
  }),
  removeFromComparison: (id) => set((state) => ({
    comparisonExperiments: state.comparisonExperiments.filter((eid) => eid !== id),
  })),
  clearComparison: () => set({ comparisonExperiments: [] }),
}))

