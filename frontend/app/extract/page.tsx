'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { FileUploader } from '@/components/FileUploader'
import { ConfigPanel } from '@/components/features/extraction/ConfigPanel'
import { ElegantProgressVisualizer } from '@/components/features/extraction/ElegantProgressVisualizer'
import { EditablePCATable } from '@/components/features/extraction/EditablePCATable'
import { useStore } from '@/store'
import { api } from '@/lib/api'
import { storage } from '@/lib/storage'
import { Play, CheckCircle } from 'lucide-react'
import { formatPercentage } from '@/lib/utils'
import type { Project } from '@/lib/types'

export default function ExtractPage() {
  const searchParams = useSearchParams()
  const projectIdParam = searchParams.get('project')
  
  const {
    extraction,
    setExtractionStep,
    setExtractionProject,
    setExtractionFile,
    setExtractionConfig,
    setExtractionJobId,
    setExtractionResults,
    setEditedResults,
    setExtractionExperimentDir,
    setExtractionEvaluation,
    resetExtraction,
  } = useStore()

  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [openaiKey, setOpenaiKey] = useState(storage.getOpenAIKey() || '')
  const [geminiKey, setGeminiKey] = useState(storage.getGeminiKey() || '')
  const [error, setError] = useState<string | null>(null)
  const [running, setRunning] = useState(false)
  const [livePreviewRows, setLivePreviewRows] = useState<any[]>([]) // Live preview during extraction

  // Load project if specified in URL
  useEffect(() => {
    if (projectIdParam) {
      api.getProject(projectIdParam).then(setSelectedProject).catch(console.error)
    }
  }, [projectIdParam])

  // Save keys to session storage
  useEffect(() => {
    if (openaiKey) storage.setOpenAIKey(openaiKey)
    if (geminiKey) storage.setGeminiKey(geminiKey)
  }, [openaiKey, geminiKey])

  const handleFileUpload = (file: File) => {
    setExtractionFile(file)
    setExtractionStep('config')
  }

  const validateAndStart = () => {
    const requiredKey =
      extraction.config.provider === 'openai' ? openaiKey : geminiKey
    
    if (!requiredKey) {
      setError(`Please provide ${extraction.config.provider === 'openai' ? 'OpenAI' : 'Gemini'} API key`)
      return
    }

    if (!extraction.uploadedFile && !selectedProject) {
      setError('Please select a project or upload a file')
      return
    }

    startExtraction()
  }

  const startExtraction = async () => {
    setRunning(true)
    setError(null)
    setExtractionStep('running')

    try {
      // Use uploaded file or project file
      let fileToProcess = extraction.uploadedFile
      
      if (!fileToProcess && selectedProject) {
        // Fetch project file
        const response = await fetch(selectedProject.eris_file)
        const blob = await response.blob()
        fileToProcess = new File([blob], `ERIS-${selectedProject.name}.pdf`, {
          type: 'application/pdf',
        })
      }

      if (!fileToProcess) {
        throw new Error('No file to process')
      }

      const result = await api.startExtraction(
        fileToProcess,
        extraction.config,
        openaiKey,
        geminiKey,
        selectedProject?.id
      )

      setExtractionJobId(result.job_id)
    } catch (err: any) {
      setError(err.message || 'Failed to start extraction')
      setExtractionStep('config')
      setRunning(false)
    }
  }

  const handleExtractionComplete = async (data: any) => {
    setExtractionResults(data.rows)
    setExtractionExperimentDir(data.experiment_dir)
    setExtractionStep('results')
    setRunning(false)
    setLivePreviewRows([]) // Clear preview

    // NOTE: Evaluation is now optional and moved to separate Benchmark tab
    // Users can run benchmarks manually from the Benchmark page
  }

  const handleProgressUpdate = (rows: any[]) => {
    setLivePreviewRows(rows) // Update live preview
  }

  const handleExtractionError = (message: string) => {
    setError(message)
    setExtractionStep('config')
    setRunning(false)
  }

  const handleCancel = () => {
    setExtractionJobId(null)
    setExtractionStep('config')
    setRunning(false)
  }

  const handleSaveChanges = async (rows: any[]) => {
    if (!extraction.experimentDir) {
      throw new Error('No experiment directory')
    }

    // Extract experiment ID from directory path
    const expId = extraction.experimentDir.split('/').pop()
    if (!expId) {
      throw new Error('Invalid experiment directory')
    }

    await api.updateExperimentRows(expId, rows)
    setExtractionResults(rows)
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Extract PCA Data</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-2">
          Run LLM-powered extraction on ERIS reports
        </p>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center gap-4">
        <StepBadge step={1} label="Upload" active={extraction.step === 'upload'} completed={extraction.step !== 'upload'} />
        <div className="flex-1 h-px bg-gray-300 dark:bg-gray-700" />
        <StepBadge step={2} label="Configure" active={extraction.step === 'config'} completed={['running', 'results'].includes(extraction.step)} />
        <div className="flex-1 h-px bg-gray-300 dark:bg-gray-700" />
        <StepBadge step={3} label="Extract" active={extraction.step === 'running'} completed={extraction.step === 'results'} />
        <div className="flex-1 h-px bg-gray-300 dark:bg-gray-700" />
        <StepBadge step={4} label="Results" active={extraction.step === 'results'} />
      </div>

      {error && (
        <div className="p-4 border rounded-lg" style={{ backgroundColor: 'var(--burgundy-dark)/10', borderColor: 'var(--burgundy-light)', color: 'var(--burgundy-dark)' }}>
          {error}
        </div>
      )}

      {/* Step 1: Upload */}
      {extraction.step === 'upload' && (
        <div className="space-y-4">
          {selectedProject && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-medium">Selected Project</div>
                    <div className="text-sm text-gray-500">{selectedProject.name}</div>
                  </div>
                  <Button onClick={() => setExtractionStep('config')}>
                    Continue
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
          
          {!selectedProject && (
            <FileUploader onUpload={handleFileUpload} isUploading={false} />
          )}
        </div>
      )}

      {/* Step 2: Configure */}
      {extraction.step === 'config' && (
        <div className="space-y-4">
          <ConfigPanel
            config={extraction.config}
            onChange={setExtractionConfig}
            openaiKey={openaiKey}
            geminiKey={geminiKey}
            onKeysChange={(o, g) => {
              setOpenaiKey(o)
              setGeminiKey(g)
            }}
          />

          <div className="flex gap-2">
            <Button onClick={validateAndStart} size="lg">
              <Play className="w-4 h-4 mr-2" />
              Start Extraction
            </Button>
            <Button variant="outline" onClick={() => setExtractionStep('upload')}>
              Back
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Running */}
      {extraction.step === 'running' && extraction.jobId && (
        <div className="space-y-6">
          <ElegantProgressVisualizer
            jobId={extraction.jobId}
            onComplete={handleExtractionComplete}
            onError={handleExtractionError}
            onCancel={handleCancel}
            onProgressUpdate={handleProgressUpdate}
          />
          
          {/* Live Preview */}
          {livePreviewRows.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: 'var(--burgundy-light)' }}></span>
                    <span className="relative inline-flex rounded-full h-3 w-3" style={{ backgroundColor: 'var(--burgundy-light)' }}></span>
                  </span>
                  Live Preview - {livePreviewRows.length} PCAs (Pre-deduplication)
                </CardTitle>
                <CardDescription>
                  This is a preview of extracted PCAs. Final results will be deduplicated and compiled.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="max-h-96 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b" style={{ borderColor: 'var(--cream)' }}>
                      <tr>
                        <th className="text-left p-2">#</th>
                        <th className="text-left p-2">PCA Number</th>
                        <th className="text-left p-2">Address</th>
                        <th className="text-left p-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {livePreviewRows.slice(0, 50).map((row, idx) => (
                        <tr key={idx} className="border-b" style={{ borderColor: 'var(--cream)' }}>
                          <td className="p-2 text-gray-500">{idx + 1}</td>
                          <td className="p-2 font-mono">{row.pca_number || 'N/A'}</td>
                          <td className="p-2">{row.address || 'N/A'}</td>
                          <td className="p-2">
                            <span className="px-2 py-1 rounded text-xs" style={{ backgroundColor: 'var(--cream)', color: 'var(--navy-dark)' }}>
                              Extracting...
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {livePreviewRows.length > 50 && (
                    <p className="text-center text-sm text-gray-500 mt-4">
                      ...and {livePreviewRows.length - 50} more
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Step 4: Results */}
      {extraction.step === 'results' && (
        <div className="space-y-6">
          {/* Metrics */}
          {extraction.evaluation && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" style={{ color: 'var(--navy-dark)' }} />
                  Evaluation Results
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <div className="text-sm text-gray-500">Recall</div>
                    <div className="text-2xl font-bold">
                      {formatPercentage(extraction.evaluation.metrics.recall)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Precision</div>
                    <div className="text-2xl font-bold">
                      {formatPercentage(extraction.evaluation.metrics.precision)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">F1 Score</div>
                    <div className="text-2xl font-bold">
                      {formatPercentage(extraction.evaluation.metrics.f1_score)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Rows</div>
                    <div className="text-2xl font-bold">{extraction.results.length}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Editable Table */}
          <EditablePCATable
            rows={extraction.editedResults}
            onChange={setEditedResults}
            onSave={handleSaveChanges}
            isDirty={extraction.isDirty}
          />

          {/* Actions */}
          <div className="flex gap-2">
            <Button onClick={resetExtraction}>
              Start New Extraction
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function StepBadge({
  step,
  label,
  active,
  completed,
}: {
  step: number
  label: string
  active?: boolean
  completed?: boolean
}) {
  return (
    <div className="flex items-center gap-2">
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center font-medium text-white"
        style={
          completed
            ? { backgroundColor: 'var(--navy-dark)' }
            : active
            ? { backgroundColor: 'var(--burgundy-light)' }
            : { backgroundColor: 'var(--cream)', color: 'var(--navy-dark)' }
        }
      >
        {completed ? <CheckCircle className="w-5 h-5" /> : step}
      </div>
      <span className={active ? 'font-medium' : 'text-gray-500'}>{label}</span>
    </div>
  )
}

