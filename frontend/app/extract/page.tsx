'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import { Upload, FileText, CheckCircle, XCircle, Loader2, RefreshCw, AlertTriangle, Download, Plus, Trash2, Save, Edit2, X, Star } from 'lucide-react'
import { storage } from '@/lib/storage'
import Link from 'next/link'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface ActivePrompt {
  id: string
  name: string
}

interface ChunkResult {
  chunk_num: number
  total_chunks: number
  pages_start: number
  pages_end: number
  pca_count: number
  status: string
}

interface ExtractionStatus {
  job_id?: string
  status: string
  current_step: string
  progress_percent: number
  total_chunks: number
  completed_chunks: number
  chunk_results: ChunkResult[]
  total_pcas: number
  experiment_dir?: string
  error?: string
  started_at?: string
  completed_at?: string
}

interface PCARow {
  pca_identifier?: number
  address: string
  location_relation_to_site: string
  pca_number: number | null
  pca_name: string
  description_timeline: string
  source_pages: string
}

export default function ExtractPage() {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [status, setStatus] = useState<ExtractionStatus | null>(null)
  const [polling, setPolling] = useState(false)
  const [apiKey, setApiKey] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [activePrompt, setActivePrompt] = useState<ActivePrompt | null>(null)
  
  // Table state
  const [rows, setRows] = useState<PCARow[]>([])
  const [isFinal, setIsFinal] = useState(false)
  const [editingRow, setEditingRow] = useState<number | null>(null)
  const [editedRow, setEditedRow] = useState<PCARow | null>(null)
  const [saving, setSaving] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  
  // Fetch active prompt
  const fetchActivePrompt = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/prompts/versions`)
      const data = await res.json()
      const active = data.versions?.find((v: { is_active: boolean }) => v.is_active)
      if (active) {
        setActivePrompt({ id: active.id, name: active.name })
      }
    } catch (err) {
      console.error('Failed to fetch active prompt:', err)
    }
  }, [])
  
  // Check for API key on mount
  useEffect(() => {
    setApiKey(storage.getGeminiKey())
    fetchActivePrompt()
  }, [fetchActivePrompt])

  // Fetch rows
  const fetchRows = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/extract/rows`)
      const data = await res.json()
      setRows(data.rows || [])
      setIsFinal(data.is_final || false)
    } catch (err) {
      console.error('Failed to fetch rows:', err)
    }
  }, [])

  // Poll for status updates
  const pollStatus = useCallback(async () => {
    setRefreshing(true)
    try {
      const res = await fetch(`${API_BASE}/extract/status`)
      const data = await res.json()
      setStatus(data)
      
      // Fetch rows if there's an experiment
      if (data.experiment_dir) {
        await fetchRows()
      }
      
      // Stop polling if completed or error
      if (data.status === 'completed' || data.status === 'error' || data.status === 'idle') {
        setPolling(false)
      }
    } catch (err) {
      console.error('Failed to poll status:', err)
    } finally {
      setTimeout(() => setRefreshing(false), 300)
    }
  }, [fetchRows])
  
  // Reset status to start fresh
  const handleReset = async () => {
    try {
      const res = await fetch(`${API_BASE}/extract/reset`, { method: 'POST' })
      if (res.ok) {
        setStatus(null)
        setRows([])
        setIsFinal(false)
        setHasUnsavedChanges(false)
      } else {
        const error = await res.json()
        alert(error.detail || 'Failed to reset')
      }
    } catch (err) {
      console.error('Reset error:', err)
    }
  }

  useEffect(() => {
    // Initial status check
    pollStatus()
  }, [pollStatus])

  useEffect(() => {
    if (!polling) return
    
    const interval = setInterval(pollStatus, 2000)
    return () => clearInterval(interval)
  }, [polling, pollStatus])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
    }
  }

  const handleUpload = async () => {
    if (!file) return
    
    const currentKey = storage.getGeminiKey()
    if (!currentKey) {
      alert('Please configure your Gemini API key in the Configuration page first.')
      return
    }
    
    setUploading(true)
    
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('api_key', currentKey)
      formData.append('chunk_size', String(storage.getChunkSize() || 10000))
      if (activePrompt) {
        formData.append('prompt_version', activePrompt.id)
      }
      // Include model and temperature from configuration
      const savedModel = storage.getModel()
      const savedTemp = storage.getTemperature()
      if (savedModel) {
        formData.append('model', savedModel)
      }
      if (savedTemp !== null) {
        formData.append('temperature', String(savedTemp))
      }
      
      const res = await fetch(`${API_BASE}/extract/upload`, {
        method: 'POST',
        body: formData,
      })
      
      if (!res.ok) {
        const error = await res.json()
        alert(error.detail || 'Upload failed')
        return
      }
      
      setPolling(true)
      setFile(null)
      setRows([])
      setIsFinal(false)
      
    } catch (err) {
      console.error('Upload error:', err)
      alert('Upload failed: ' + String(err))
    } finally {
      setUploading(false)
    }
  }

  // Table editing functions
  const startEdit = (index: number) => {
    setEditingRow(index)
    setEditedRow({ ...rows[index] })
  }

  const cancelEdit = () => {
    setEditingRow(null)
    setEditedRow(null)
  }

  const saveEdit = () => {
    if (editingRow === null || !editedRow) return
    const newRows = [...rows]
    newRows[editingRow] = editedRow
    setRows(newRows)
    setEditingRow(null)
    setEditedRow(null)
    setHasUnsavedChanges(true)
  }

  const deleteRow = (index: number) => {
    if (!confirm('Delete this row?')) return
    const newRows = rows.filter((_, i) => i !== index)
    setRows(newRows)
    setHasUnsavedChanges(true)
  }

  const addRow = () => {
    const newRow: PCARow = {
      address: '',
      location_relation_to_site: 'Off-Site',
      pca_number: null,
      pca_name: '',
      description_timeline: '',
      source_pages: ''
    }
    setRows([...rows, newRow])
    setEditingRow(rows.length)
    setEditedRow(newRow)
    setHasUnsavedChanges(true)
  }

  const saveAllChanges = async () => {
    setSaving(true)
    try {
      const res = await fetch(`${API_BASE}/extract/rows`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rows)
      })
      if (res.ok) {
        setHasUnsavedChanges(false)
        await fetchRows() // Refresh to get updated pca_identifiers
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

  const downloadCSV = () => {
    window.open(`${API_BASE}/extract/download`, '_blank')
  }

  const isRunning = status?.status === 'running'
  const isCompleted = status?.status === 'completed'
  const isError = status?.status === 'error'
  const canEdit = isFinal && !isRunning

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--navy-dark)' }}>
          Extract PCAs
        </h1>
        <p className="text-gray-600 mt-1">
          Upload an ERIS report PDF to extract Potentially Contaminating Activities
        </p>
      </div>
      
      {/* API Key Warning */}
      {!apiKey && (
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-amber-800">Gemini API Key Required</p>
                <p className="text-sm text-amber-700 mt-1">
                  Please configure your Gemini API key before running extractions.
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

      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Upload ERIS Report
          </CardTitle>
          <CardDescription>
            Select a PDF file to begin extraction
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Active Prompt Info */}
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                  <span className="text-sm font-medium text-amber-800">
                    Using Prompt: {activePrompt ? activePrompt.name : 'Loading...'}
                  </span>
                  {activePrompt && (
                    <span className="text-xs text-amber-600">({activePrompt.id})</span>
                  )}
                </div>
                <Link 
                  href="/prompts"
                  className="text-xs text-amber-700 underline hover:text-amber-900"
                >
                  Change →
                </Link>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
                disabled={isRunning || uploading}
                className="block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-lg file:border-0
                  file:text-sm file:font-semibold
                  file:bg-blue-50 file:text-blue-700
                  hover:file:bg-blue-100
                  disabled:opacity-50"
              />
            </div>
            
            {file && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <FileText className="w-4 h-4" />
                {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
              </div>
            )}
            
            <Button 
              onClick={handleUpload}
              disabled={!file || isRunning || uploading}
              className="w-full"
              style={{ backgroundColor: 'var(--navy-dark)', color: 'white' }}
            >
              {uploading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Uploading...</>
              ) : isRunning ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Extraction in progress...</>
              ) : (
                <><Upload className="w-4 h-4 mr-2" />Start Extraction</>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Progress Section */}
      {(isRunning || isCompleted || isError) && status && (
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
              Extraction {isRunning ? 'Progress' : isCompleted ? 'Complete' : 'Failed'}
            </CardTitle>
            <CardDescription>{status.current_step}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span>{status.progress_percent.toFixed(0)}%</span>
              </div>
              <Progress value={status.progress_percent} className="h-3" />
            </div>
            
            {status.chunk_results.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Chunk Processing:</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {status.chunk_results.map((chunk) => (
                    <div key={chunk.chunk_num} className="flex items-center justify-between p-2 rounded-lg bg-white border text-sm">
                      <span>Chunk {chunk.chunk_num}<span className="text-gray-400 text-xs ml-1">(pp.{chunk.pages_start}-{chunk.pages_end})</span></span>
                      <span className="font-semibold text-green-600">{chunk.pca_count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {isError && status.error && (
              <div className="p-4 rounded-lg bg-red-100 border border-red-200 text-red-700">
                <strong>Error:</strong> {status.error}
              </div>
            )}
            
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={pollStatus} disabled={refreshing} className="flex-1">
                <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                {refreshing ? 'Refreshing...' : 'Refresh'}
              </Button>
              {(isCompleted || isError) && (
                <Button size="sm" onClick={handleReset} className="flex-1" style={{ backgroundColor: 'var(--navy-dark)', color: 'white' }}>
                  <Upload className="w-4 h-4 mr-2" />New Extraction
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* PCA Table */}
      {rows.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  {isFinal ? 'Extracted PCAs' : 'Preview (Processing...)'}
                  <span className="text-sm font-normal text-gray-500">({rows.length} rows)</span>
                </CardTitle>
                <CardDescription>
                  {canEdit ? 'Click a row to edit, or use the buttons to add/remove rows' : 'Table will be editable after extraction completes'}
                </CardDescription>
              </div>
              {canEdit && (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={addRow}>
                    <Plus className="w-4 h-4 mr-1" />Add Row
                  </Button>
                  <Button size="sm" variant="outline" onClick={downloadCSV}>
                    <Download className="w-4 h-4 mr-1" />Download CSV
                  </Button>
                  {hasUnsavedChanges && (
                    <Button size="sm" onClick={saveAllChanges} disabled={saving} style={{ backgroundColor: 'var(--navy-dark)', color: 'white' }}>
                      {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
                      Save Changes
                    </Button>
                  )}
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto border rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">#</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">Address</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">Location</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">PCA #</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">PCA Name</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">Description</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">Pages</th>
                    {canEdit && <th className="px-3 py-2 text-center font-medium text-gray-600 w-20">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {rows.map((row, idx) => (
                    <tr key={idx} className={`${editingRow === idx ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
                      {editingRow === idx && editedRow ? (
                        <>
                          <td className="px-3 py-2 text-gray-400">{idx + 1}</td>
                          <td className="px-3 py-1"><Input value={editedRow.address} onChange={e => setEditedRow({...editedRow, address: e.target.value})} className="h-8 text-sm" /></td>
                          <td className="px-3 py-1">
                            <select value={editedRow.location_relation_to_site} onChange={e => setEditedRow({...editedRow, location_relation_to_site: e.target.value})} className="h-8 text-sm border rounded px-2">
                              <option value="On-Site">On-Site</option>
                              <option value="Off-Site">Off-Site</option>
                            </select>
                          </td>
                          <td className="px-3 py-1"><Input type="number" value={editedRow.pca_number ?? ''} onChange={e => setEditedRow({...editedRow, pca_number: e.target.value ? parseInt(e.target.value) : null})} className="h-8 text-sm w-16" /></td>
                          <td className="px-3 py-1"><Input value={editedRow.pca_name} onChange={e => setEditedRow({...editedRow, pca_name: e.target.value})} className="h-8 text-sm" /></td>
                          <td className="px-3 py-1"><Input value={editedRow.description_timeline} onChange={e => setEditedRow({...editedRow, description_timeline: e.target.value})} className="h-8 text-sm" /></td>
                          <td className="px-3 py-1"><Input value={editedRow.source_pages} onChange={e => setEditedRow({...editedRow, source_pages: e.target.value})} className="h-8 text-sm w-20" /></td>
                          <td className="px-3 py-1">
                            <div className="flex gap-1 justify-center">
                              <Button size="sm" variant="ghost" onClick={saveEdit} className="h-7 w-7 p-0 text-green-600"><CheckCircle className="w-4 h-4" /></Button>
                              <Button size="sm" variant="ghost" onClick={cancelEdit} className="h-7 w-7 p-0 text-gray-400"><X className="w-4 h-4" /></Button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-3 py-2 text-gray-400">{row.pca_identifier || idx + 1}</td>
                          <td className="px-3 py-2 max-w-[200px] truncate" title={row.address}>{row.address}</td>
                          <td className="px-3 py-2">{row.location_relation_to_site}</td>
                          <td className="px-3 py-2">{row.pca_number ?? '-'}</td>
                          <td className="px-3 py-2 max-w-[150px] truncate" title={row.pca_name}>{row.pca_name}</td>
                          <td className="px-3 py-2 max-w-[200px] truncate" title={row.description_timeline}>{row.description_timeline}</td>
                          <td className="px-3 py-2">{row.source_pages}</td>
                          {canEdit && (
                            <td className="px-3 py-2">
                              <div className="flex gap-1 justify-center">
                                <Button size="sm" variant="ghost" onClick={() => startEdit(idx)} className="h-7 w-7 p-0 text-blue-600"><Edit2 className="w-4 h-4" /></Button>
                                <Button size="sm" variant="ghost" onClick={() => deleteRow(idx)} className="h-7 w-7 p-0 text-red-500"><Trash2 className="w-4 h-4" /></Button>
                              </div>
                            </td>
                          )}
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {!isFinal && (
              <div className="mt-3 text-center text-sm text-amber-600 bg-amber-50 p-2 rounded">
                <Loader2 className="w-4 h-4 inline-block mr-2 animate-spin" />
                Preview only - rows may change after deduplication completes
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
