'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { 
  FileText, Play, CheckCircle, XCircle, Loader2, RefreshCw,
  Plus, Save, Trash2, ChevronDown, ChevronUp, AlertTriangle, Star
} from 'lucide-react'
import { storage } from '@/lib/storage'
import Link from 'next/link'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface PromptVersion {
  id: string
  name: string
  content: string
  created_at: string
  is_active: boolean
}

interface Project {
  project_id: string
  eris_pdf: string
  ground_truth_csv: string
  ground_truth_count: number
}

interface ChunkResult {
  chunk_num: number
  total_chunks: number
  pages_start: number
  pages_end: number
  pca_count: number
}

interface BenchmarkMetrics {
  precision: number
  recall: number
  f1_score: number
  true_positives: number
  false_positives: number
  false_negatives: number
}

interface BenchmarkStatus {
  job_id?: string
  project_id?: string
  prompt_version?: string
  status: string
  current_step: string
  progress_percent: number
  total_chunks: number
  completed_chunks: number
  chunk_results: ChunkResult[]
  extracted_pcas: number
  metrics?: BenchmarkMetrics
  ground_truth_count: number
  error?: string
}

export default function PromptsPage() {
  // Prompt state
  const [versions, setVersions] = useState<PromptVersion[]>([])
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [newName, setNewName] = useState('')
  const [newContent, setNewContent] = useState('')
  const [showNewForm, setShowNewForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [expandedPrompt, setExpandedPrompt] = useState<string | null>(null)
  
  // Benchmark state
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProject, setSelectedProject] = useState<string | null>(null)
  const [benchmarkStatus, setBenchmarkStatus] = useState<BenchmarkStatus | null>(null)
  const [polling, setPolling] = useState(false)
  const [apiKey, setApiKey] = useState<string | null>(null)
  
  // Check for API key on mount
  useEffect(() => {
    setApiKey(storage.getGeminiKey())
  }, [])

  // Load prompt versions
  const loadVersions = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/prompts/versions`)
      const data = await res.json()
      setVersions(data.versions || [])
      
      // Select first version if none selected
      if (!selectedVersion && data.versions?.length > 0) {
        setSelectedVersion(data.versions[0].id)
        setEditContent(data.versions[0].content)
      }
    } catch (err) {
      console.error('Failed to load versions:', err)
    }
  }, [selectedVersion])

  // Load benchmark projects
  const loadProjects = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/benchmark/projects`)
      const data = await res.json()
      setProjects(data.projects || [])
      
      // Select first project if none selected
      if (!selectedProject && data.projects?.length > 0) {
        setSelectedProject(data.projects[0].project_id)
      }
    } catch (err) {
      console.error('Failed to load projects:', err)
    }
  }, [selectedProject])

  // Poll benchmark status
  const pollBenchmarkStatus = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/benchmark/status`)
      const data = await res.json()
      setBenchmarkStatus(data)
      
      if (data.status === 'completed' || data.status === 'error' || data.status === 'idle') {
        setPolling(false)
      }
    } catch (err) {
      console.error('Failed to poll benchmark status:', err)
    }
  }, [])

  useEffect(() => {
    loadVersions()
    loadProjects()
    pollBenchmarkStatus()
  }, [loadVersions, loadProjects, pollBenchmarkStatus])

  useEffect(() => {
    if (!polling) return
    const interval = setInterval(pollBenchmarkStatus, 1000)
    return () => clearInterval(interval)
  }, [polling, pollBenchmarkStatus])

  // Handle version selection
  const handleSelectVersion = (versionId: string) => {
    setSelectedVersion(versionId)
    const version = versions.find(v => v.id === versionId)
    if (version) {
      setEditContent(version.content)
    }
  }

  // Save prompt changes
  const handleSavePrompt = async () => {
    if (!selectedVersion) return
    setSaving(true)
    
    try {
      const res = await fetch(`${API_BASE}/prompts/versions/${selectedVersion}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editContent })
      })
      
      if (res.ok) {
        await loadVersions()
      } else {
        const error = await res.json()
        alert(error.detail || 'Save failed')
      }
    } catch (err) {
      console.error('Save error:', err)
      alert('Save failed')
    } finally {
      setSaving(false)
    }
  }

  // Create new prompt version
  const handleCreatePrompt = async () => {
    if (!newName || !newContent) {
      alert('Please provide a name and content')
      return
    }
    setSaving(true)
    
    try {
      const res = await fetch(`${API_BASE}/prompts/versions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName, content: newContent })
      })
      
      if (res.ok) {
        setNewName('')
        setNewContent('')
        setShowNewForm(false)
        await loadVersions()
      } else {
        const error = await res.json()
        alert(error.detail || 'Create failed')
      }
    } catch (err) {
      console.error('Create error:', err)
      alert('Create failed')
    } finally {
      setSaving(false)
    }
  }

  // Delete prompt version
  const handleDeletePrompt = async (versionId: string) => {
    if (!confirm('Are you sure you want to delete this prompt version?')) return
    
    try {
      const res = await fetch(`${API_BASE}/prompts/versions/${versionId}`, {
        method: 'DELETE'
      })
      
      if (res.ok) {
        await loadVersions()
        if (selectedVersion === versionId) {
          setSelectedVersion(null)
          setEditContent('')
        }
      } else {
        const error = await res.json()
        alert(error.detail || 'Delete failed')
      }
    } catch (err) {
      console.error('Delete error:', err)
      alert('Delete failed')
    }
  }

  // Set prompt as active
  const handleSetActive = async (versionId: string) => {
    try {
      const res = await fetch(`${API_BASE}/prompts/versions/${versionId}/activate`, {
        method: 'POST'
      })
      
      if (res.ok) {
        await loadVersions()
      } else {
        const error = await res.json()
        alert(error.detail || 'Failed to set active')
      }
    } catch (err) {
      console.error('Set active error:', err)
      alert('Failed to set active')
    }
  }

  // Run benchmark
  const handleRunBenchmark = async () => {
    if (!selectedProject || !selectedVersion) {
      alert('Please select a project and prompt version')
      return
    }
    
    // Re-check API key from storage
    const currentKey = storage.getGeminiKey()
    if (!currentKey) {
      alert('Please configure your Gemini API key in the Configuration page first.')
      return
    }
    
    try {
      const res = await fetch(`${API_BASE}/benchmark/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: selectedProject,
          prompt_version: selectedVersion,
          api_key: currentKey,
          chunk_size: storage.getChunkSize() || 10000,
          model: storage.getModel() || 'gemini-2.5-flash',
          temperature: storage.getTemperature() ?? 0.1
        })
      })
      
      if (res.ok) {
        setPolling(true)
      } else {
        const error = await res.json()
        alert(error.detail || 'Failed to start benchmark')
      }
    } catch (err) {
      console.error('Benchmark error:', err)
      alert('Failed to start benchmark')
    }
  }

  const isRunning = benchmarkStatus?.status === 'running'
  const isCompleted = benchmarkStatus?.status === 'completed'
  const isError = benchmarkStatus?.status === 'error'

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--navy-dark)' }}>
          Prompts & Benchmark
        </h1>
        <p className="text-gray-600 mt-1">
          Manage extraction prompts and benchmark against ground truth data
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Prompts Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Prompt Versions
              </span>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowNewForm(!showNewForm)}
              >
                <Plus className="w-4 h-4 mr-1" />
                New
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* New Prompt Form */}
            {showNewForm && (
              <div className="p-4 border rounded-lg bg-gray-50 space-y-3">
                <Input
                  placeholder="Version name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
                <Textarea
                  placeholder="Prompt content..."
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  rows={6}
                />
                <div className="flex gap-2">
                  <Button onClick={handleCreatePrompt} disabled={saving} size="sm">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create'}
                  </Button>
                  <Button variant="outline" onClick={() => setShowNewForm(false)} size="sm">
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {/* Version List */}
            <div className="space-y-2">
              {versions.map((version) => (
                <div
                  key={version.id}
                  className={`border rounded-lg overflow-hidden ${
                    version.is_active ? 'border-amber-400 ring-1 ring-amber-200' :
                    selectedVersion === version.id ? 'border-blue-500' : ''
                  }`}
                >
                  <div 
                    className={`p-3 cursor-pointer flex items-center justify-between ${
                      version.is_active ? 'bg-amber-50' :
                      selectedVersion === version.id ? 'bg-blue-50' : 'bg-white hover:bg-gray-50'
                    }`}
                    onClick={() => handleSelectVersion(version.id)}
                  >
                    <div className="flex items-center gap-2">
                      {version.is_active && (
                        <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                      )}
                      <div>
                        <div className="font-medium flex items-center gap-2">
                          {version.name}
                          {version.is_active && (
                            <span className="text-xs bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full">
                              Active
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500">{version.id}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {!version.is_active && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleSetActive(version.id)
                          }}
                          className="text-xs h-7"
                        >
                          <Star className="w-3 h-3 mr-1" />
                          Set Active
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          setExpandedPrompt(expandedPrompt === version.id ? null : version.id)
                        }}
                      >
                        {expandedPrompt === version.id ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeletePrompt(version.id)
                        }}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                  
                  {/* Expanded content */}
                  {expandedPrompt === version.id && (
                    <div className="p-3 border-t bg-gray-50">
                      <pre className="text-xs whitespace-pre-wrap max-h-64 overflow-y-auto">
                        {version.content}
                      </pre>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Edit Selected Version */}
            {selectedVersion && (
              <div className="space-y-3 pt-4 border-t">
                <h4 className="font-medium">Edit: {versions.find(v => v.id === selectedVersion)?.name}</h4>
                <Textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  rows={12}
                  className="font-mono text-sm"
                />
                <Button onClick={handleSavePrompt} disabled={saving}>
                  {saving ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Save Changes
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Benchmark Section */}
        <div className="space-y-4">
          {/* API Key Warning */}
          {!apiKey && (
            <Card className="border-amber-300 bg-amber-50">
              <CardContent className="py-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-amber-800">Gemini API Key Required</p>
                    <p className="text-sm text-amber-700 mt-1">
                      Please configure your Gemini API key before running benchmarks.
                    </p>
                    <Link 
                      href="/configuration"
                      className="inline-block mt-2 text-sm font-medium text-amber-800 underline hover:text-amber-900"
                    >
                      Go to Configuration →
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Play className="w-5 h-5" />
                Run Benchmark
              </CardTitle>
              <CardDescription>
                Test extraction against ground truth data
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Project Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Project:</label>
                <div className="grid grid-cols-1 gap-2">
                  {projects.map((project) => (
                    <div
                      key={project.project_id}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedProject === project.project_id
                          ? 'border-blue-500 bg-blue-50'
                          : 'hover:bg-gray-50'
                      }`}
                      onClick={() => setSelectedProject(project.project_id)}
                    >
                      <div className="font-medium">{project.project_id}</div>
                      <div className="text-xs text-gray-500">
                        {project.ground_truth_count} PCAs in ground truth
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Selected Prompt */}
              <div className="p-3 bg-gray-50 rounded-lg text-sm">
                <strong>Using prompt:</strong>{' '}
                {selectedVersion ? versions.find(v => v.id === selectedVersion)?.name || selectedVersion : 'None selected'}
              </div>

              {/* Run Button */}
              <Button
                onClick={handleRunBenchmark}
                disabled={isRunning || !selectedProject || !selectedVersion}
                className="w-full"
                style={{ 
                  backgroundColor: 'var(--burgundy-light)',
                  color: 'white'
                }}
              >
                {isRunning ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Running...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Run Benchmark
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Benchmark Progress/Results */}
          {benchmarkStatus && benchmarkStatus.status !== 'idle' && (
            <Card className={
              isCompleted ? 'border-green-200 bg-green-50/30' :
              isError ? 'border-red-200 bg-red-50/30' :
              'border-blue-200 bg-blue-50/30'
            }>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {isRunning && <Loader2 className="w-5 h-5 animate-spin text-blue-600" />}
                  {isCompleted && <CheckCircle className="w-5 h-5 text-green-600" />}
                  {isError && <XCircle className="w-5 h-5 text-red-600" />}
                  {isRunning ? 'Benchmark Running' : isCompleted ? 'Benchmark Complete' : 'Benchmark Failed'}
                </CardTitle>
                <CardDescription>
                  {benchmarkStatus.project_id} • {benchmarkStatus.prompt_version}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Current Step */}
                <div className="text-sm">{benchmarkStatus.current_step}</div>
                
                {/* Progress Bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span>Progress</span>
                    <span>{benchmarkStatus.progress_percent.toFixed(0)}%</span>
                  </div>
                  <Progress value={benchmarkStatus.progress_percent} className="h-2" />
                </div>

                {/* Chunk Results */}
                {benchmarkStatus.chunk_results.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Chunks:</h4>
                    <div className="grid grid-cols-2 gap-1 text-xs">
                      {benchmarkStatus.chunk_results.map((chunk) => (
                        <div 
                          key={chunk.chunk_num}
                          className="p-2 bg-white border rounded"
                        >
                          Chunk {chunk.chunk_num}: {chunk.pca_count} PCAs
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Results */}
                {isCompleted && benchmarkStatus.metrics && (
                  <div className="p-4 bg-white border rounded-lg">
                    <h4 className="font-semibold mb-3">Results</h4>
                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div>
                        <div className="text-2xl font-bold text-green-600">
                          {(benchmarkStatus.metrics.recall * 100).toFixed(1)}%
                        </div>
                        <div className="text-xs text-gray-500">Recall</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold" style={{ color: 'var(--navy-dark)' }}>
                          {benchmarkStatus.extracted_pcas}
                        </div>
                        <div className="text-xs text-gray-500">PCAs Extracted</div>
                      </div>
                    </div>
                    <div className="mt-3 text-sm text-gray-500 text-center">
                      Ground truth: {benchmarkStatus.ground_truth_count} PCAs
                    </div>
                  </div>
                )}

                {/* Error */}
                {isError && benchmarkStatus.error && (
                  <div className="p-3 bg-red-100 border border-red-200 rounded text-red-700 text-sm">
                    {benchmarkStatus.error}
                  </div>
                )}

                {/* Refresh */}
                <Button variant="outline" size="sm" onClick={pollBenchmarkStatus}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
