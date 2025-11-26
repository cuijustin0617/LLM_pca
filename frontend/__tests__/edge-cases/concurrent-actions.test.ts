import { describe, it, expect } from 'vitest'
import { useStore } from '@/store'

describe('Concurrent Action Edge Cases', () => {
  it('should handle multiple rapid project additions', () => {
    useStore.setState({ projects: [] })
    
    const projects = Array.from({ length: 10 }, (_, i) => ({
      id: `test-${i}`,
      name: `Test ${i}`,
      eris_file: 'test.pdf',
      ground_truth_file: 'test.csv',
      created_at: new Date().toISOString(),
      experiment_count: 0,
    }))

    projects.forEach(p => useStore.getState().addProject(p))
    
    expect(useStore.getState().projects).toHaveLength(10)
  })

  it('should handle rapid theme toggles', () => {
    const initialTheme = useStore.getState().theme
    useStore.getState().toggleTheme()
    useStore.getState().toggleTheme()
    useStore.getState().toggleTheme()
    useStore.getState().toggleTheme()
    
    expect(useStore.getState().theme).toBe(initialTheme)
  })

  it('should handle rapid comparison additions', () => {
    useStore.setState({ comparisonExperiments: [] })
    
    useStore.getState().addToComparison('exp-1')
    useStore.getState().addToComparison('exp-2')
    useStore.getState().addToComparison('exp-1') // Duplicate
    useStore.getState().addToComparison('exp-3')
    useStore.getState().addToComparison('exp-4')
    useStore.getState().addToComparison('exp-5')
    
    expect(useStore.getState().comparisonExperiments).toHaveLength(3)
  })

  it('should handle rapid step changes', () => {
    useStore.getState().setExtractionStep('upload')
    useStore.getState().setExtractionStep('config')
    useStore.getState().setExtractionStep('running')
    useStore.getState().setExtractionStep('results')
    
    expect(useStore.getState().extraction.step).toBe('results')
  })

  it('should handle concurrent log additions', () => {
    useStore.getState().resetExtraction()
    
    const logs = Array.from({ length: 100 }, (_, i) => `Log ${i}`)
    logs.forEach(log => useStore.getState().addExtractionLog(log))
    
    expect(useStore.getState().extraction.logs).toHaveLength(100)
  })

  it('should handle add and remove in quick succession', () => {
    useStore.setState({ projects: [] })
    
    const project = {
      id: 'test-1',
      name: 'Test',
      eris_file: 'test.pdf',
      ground_truth_file: 'test.csv',
      created_at: new Date().toISOString(),
      experiment_count: 0,
    }
    
    useStore.getState().addProject(project)
    useStore.getState().removeProject('test-1')
    
    expect(useStore.getState().projects).toHaveLength(0)
  })

  it('should handle multiple resets', () => {
    useStore.getState().setExtractionStep('results')
    useStore.getState().resetExtraction()
    useStore.getState().resetExtraction()
    useStore.getState().resetExtraction()
    
    expect(useStore.getState().extraction.step).toBe('upload')
  })
})

