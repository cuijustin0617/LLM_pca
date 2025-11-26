import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useStore } from '@/store'

describe('Extraction Flow Integration', () => {
  beforeEach(() => {
    // Fully reset extraction state
    useStore.setState({
      extraction: {
        step: 'upload',
        projectId: null,
        uploadedFile: null,
        config: {
          provider: 'gemini',
          model: 'gemini-2.5-flash',
          chunk_size: 3500,
          temperature: 0.0,
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
    })
  })

  it('should complete full extraction flow', () => {
    // Step 1: Upload
    expect(useStore.getState().extraction.step).toBe('upload')
    
    // Step 2: Configure
    useStore.getState().setExtractionStep('config')
    expect(useStore.getState().extraction.step).toBe('config')
    
    useStore.getState().setExtractionConfig({
      provider: 'openai',
      model: 'gpt-4o',
      chunk_size: 3500,
      temperature: 0,
    })
    
    // Step 3: Running
    useStore.getState().setExtractionStep('running')
    useStore.getState().setExtractionJobId('job-123')
    expect(useStore.getState().extraction.jobId).toBe('job-123')
    
    // Simulate progress
    useStore.getState().setExtractionProgress(50)
    useStore.getState().addExtractionLog('Processing chunk 1/2')
    useStore.getState().addExtractionLog('Processing chunk 2/2')
    
    // Step 4: Results
    const mockRows = [
      {
        pca_identifier: 1,
        address: 'Test Address',
        location_relation_to_site: 'On-Site',
        pca_number: 1,
        pca_name: 'Test PCA',
        description_timeline: 'Test',
        source_pages: '1-2',
      },
    ]
    useStore.getState().setExtractionResults(mockRows)
    useStore.getState().setExtractionStep('results')
    
    expect(useStore.getState().extraction.step).toBe('results')
    expect(useStore.getState().extraction.results).toHaveLength(1)
    expect(useStore.getState().extraction.isDirty).toBe(false)
  })

  it('should handle extraction with edits', () => {
    const originalRows = [
      {
        pca_identifier: 1,
        address: 'Original',
        location_relation_to_site: 'On-Site',
        pca_number: 1,
        pca_name: 'Original',
        description_timeline: 'Original',
        source_pages: '1',
      },
    ]
    
    useStore.getState().setExtractionResults(originalRows)
    
    const editedRows = [
      { ...originalRows[0], address: 'Edited' },
    ]
    
    useStore.getState().setEditedResults(editedRows)
    
    expect(useStore.getState().extraction.isDirty).toBe(true)
    expect(useStore.getState().extraction.editedResults[0].address).toBe('Edited')
    expect(useStore.getState().extraction.results[0].address).toBe('Original')
  })

  it('should reset extraction properly', () => {
    useStore.getState().setExtractionStep('results')
    useStore.getState().setExtractionJobId('job-123')
    useStore.getState().setExtractionProgress(100)
    useStore.getState().addExtractionLog('Test log')
    
    useStore.getState().resetExtraction()
    
    expect(useStore.getState().extraction.step).toBe('upload')
    expect(useStore.getState().extraction.jobId).toBeNull()
    expect(useStore.getState().extraction.progress).toBe(0)
    expect(useStore.getState().extraction.logs).toHaveLength(0)
  })

  it('should handle extraction error state', () => {
    useStore.getState().setExtractionStep('running')
    useStore.getState().setExtractionJobId('job-123')
    useStore.getState().addExtractionLog('ERROR: Failed to process')
    
    // Simulate error handling
    useStore.getState().setExtractionStep('config')
    useStore.getState().setExtractionJobId(null)
    
    expect(useStore.getState().extraction.step).toBe('config')
    expect(useStore.getState().extraction.jobId).toBeNull()
  })
})

