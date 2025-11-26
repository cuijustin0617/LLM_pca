import { describe, it, expect, beforeEach } from 'vitest'
import { useStore } from '@/store'
import type { Project, Experiment } from '@/lib/types'

describe('Zustand Store', () => {
  beforeEach(() => {
    // Reset store before each test
    useStore.setState({
      projects: [],
      experiments: [],
      extraction: useStore.getState().extraction,
      comparisonExperiments: [],
    })
  })

  describe('Projects', () => {
    const mockProject: Project = {
      id: 'test-1',
      name: 'Test Project',
      eris_file: '/path/to/eris.pdf',
      ground_truth_file: '/path/to/gt.csv',
      created_at: new Date().toISOString(),
      experiment_count: 0,
    }

    it('should add project', () => {
      useStore.getState().addProject(mockProject)
      expect(useStore.getState().projects).toHaveLength(1)
      expect(useStore.getState().projects[0].id).toBe('test-1')
    })

    it('should remove project', () => {
      useStore.getState().addProject(mockProject)
      useStore.getState().removeProject('test-1')
      expect(useStore.getState().projects).toHaveLength(0)
    })

    it('should set projects', () => {
      const projects = [mockProject, { ...mockProject, id: 'test-2' }]
      useStore.getState().setProjects(projects)
      expect(useStore.getState().projects).toHaveLength(2)
    })

    it('should set selected project', () => {
      useStore.getState().setSelectedProject(mockProject)
      expect(useStore.getState().selectedProject?.id).toBe('test-1')
    })

    it('should clear selected project when deleted', () => {
      useStore.getState().setSelectedProject(mockProject)
      useStore.getState().addProject(mockProject)
      useStore.getState().removeProject('test-1')
      expect(useStore.getState().selectedProject).toBeNull()
    })
  })

  describe('Extraction', () => {
    it('should set extraction step', () => {
      useStore.getState().setExtractionStep('config')
      expect(useStore.getState().extraction.step).toBe('config')
    })

    it('should set extraction config', () => {
      const config = {
        provider: 'openai' as const,
        model: 'gpt-4o',
        chunk_size: 4000,
        temperature: 0.5,
      }
      useStore.getState().setExtractionConfig(config)
      expect(useStore.getState().extraction.config).toEqual(config)
    })

    it('should add extraction log', () => {
      useStore.getState().addExtractionLog('Test log')
      expect(useStore.getState().extraction.logs).toContain('Test log')
    })

    it('should set extraction results', () => {
      const rows = [
        {
          pca_identifier: 1,
          address: 'Test Address',
          location_relation_to_site: 'On-Site',
          pca_number: 1,
          pca_name: 'Test PCA',
          description_timeline: 'Test Description',
          source_pages: '1-2',
        },
      ]
      useStore.getState().setExtractionResults(rows)
      expect(useStore.getState().extraction.results).toEqual(rows)
      expect(useStore.getState().extraction.editedResults).toEqual(rows)
      expect(useStore.getState().extraction.isDirty).toBe(false)
    })

    it('should mark as dirty when edited results change', () => {
      const rows = [
        {
          pca_identifier: 1,
          address: 'Test Address',
          location_relation_to_site: 'On-Site',
          pca_number: 1,
          pca_name: 'Test PCA',
          description_timeline: 'Test Description',
          source_pages: '1-2',
        },
      ]
      useStore.getState().setExtractionResults(rows)
      
      const editedRows = [{ ...rows[0], address: 'Modified Address' }]
      useStore.getState().setEditedResults(editedRows)
      
      expect(useStore.getState().extraction.isDirty).toBe(true)
    })

    it('should reset extraction', () => {
      useStore.getState().setExtractionStep('results')
      useStore.getState().resetExtraction()
      expect(useStore.getState().extraction.step).toBe('upload')
    })
  })

  describe('Comparison', () => {
    it('should add experiment to comparison', () => {
      useStore.getState().addToComparison('exp-1')
      expect(useStore.getState().comparisonExperiments).toContain('exp-1')
    })

    it('should not add duplicate', () => {
      useStore.getState().addToComparison('exp-1')
      useStore.getState().addToComparison('exp-1')
      expect(useStore.getState().comparisonExperiments).toHaveLength(1)
    })

    it('should limit to 3 experiments', () => {
      useStore.getState().addToComparison('exp-1')
      useStore.getState().addToComparison('exp-2')
      useStore.getState().addToComparison('exp-3')
      useStore.getState().addToComparison('exp-4')
      expect(useStore.getState().comparisonExperiments).toHaveLength(3)
      expect(useStore.getState().comparisonExperiments).not.toContain('exp-1')
    })

    it('should remove from comparison', () => {
      useStore.getState().addToComparison('exp-1')
      useStore.getState().removeFromComparison('exp-1')
      expect(useStore.getState().comparisonExperiments).toHaveLength(0)
    })

    it('should clear comparison', () => {
      useStore.getState().addToComparison('exp-1')
      useStore.getState().addToComparison('exp-2')
      useStore.getState().clearComparison()
      expect(useStore.getState().comparisonExperiments).toHaveLength(0)
    })
  })

  describe('Theme', () => {
    it('should toggle theme', () => {
      const initialTheme = useStore.getState().theme
      useStore.getState().toggleTheme()
      expect(useStore.getState().theme).not.toBe(initialTheme)
    })

    it('should set theme', () => {
      useStore.getState().setTheme('light')
      expect(useStore.getState().theme).toBe('light')
    })
  })
})

