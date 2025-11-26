'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, Circle, Loader2, X, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { api } from '@/lib/api'

interface ElegantProgressVisualizerProps {
  jobId: string
  onComplete: (data: any) => void
  onError: (message: string) => void
  onCancel?: () => void
  onProgressUpdate?: (rows: any[]) => void // Live preview callback
}

interface ProgressStep {
  id: string
  label: string
  status: 'pending' | 'running' | 'complete' | 'error'
  details?: string
}

interface ChunkResult {
  chunkNum: number
  pcaCount: number
}

export function ElegantProgressVisualizer({
  jobId,
  onComplete,
  onError,
  onCancel,
  onProgressUpdate,
}: ElegantProgressVisualizerProps) {
  const [steps, setSteps] = useState<ProgressStep[]>([
    { id: 'extract', label: 'Parsing PDF & Extracting Raw Text', status: 'running' },
    { id: 'chunk', label: 'Tokenizing & Chunking Document', status: 'pending' },
    { id: 'analyze', label: 'LLM Analysis & PCA Extraction', status: 'pending' },
    { id: 'compile', label: 'Deduplication & Data Compilation', status: 'pending' },
  ])
  
  const [progress, setProgress] = useState(5)
  const [currentChunk, setCurrentChunk] = useState<{current: number, total: number} | null>(null)
  const [chunkResults, setChunkResults] = useState<ChunkResult[]>([])
  const [totalExtracted, setTotalExtracted] = useState(0)
  const [cancelling, setCancelling] = useState(false)
  const [isCancelled, setIsCancelled] = useState(false)
  const logIdCounter = useRef(0)

  useEffect(() => {
    if (!jobId) return

    const eventSource = api.createProgressStream(jobId)

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data)

      if (data.status === 'progress') {
        const message = data.message
        
        // Update steps based on message
        if (message.includes('Extracted text')) {
          const pageMatch = message.match(/(\d+) pages/)
          const pageCount = pageMatch ? pageMatch[1] : 'N/A'
          updateStepStatus('extract', 'complete', `Extracted text from ${pageCount} pages`)
          updateStepStatus('chunk', 'running')
          setProgress(15)
        } else if (message.includes('Created') && message.includes('chunks')) {
          const chunkMatch = message.match(/(\d+) chunks/)
          const chunkCount = chunkMatch ? chunkMatch[1] : 'N/A'
          updateStepStatus('chunk', 'complete', `Created ${chunkCount} semantic chunks`)
          updateStepStatus('analyze', 'running')
          setProgress(20)
        } else if (message.includes('Processing pages')) {
          // Extract chunk info and PCA count
          const chunkMatch = message.match(/chunk (\d+)\/(\d+)/)
          const pcaMatch = message.match(/found (\d+) potential/)
          
          if (chunkMatch) {
            const current = parseInt(chunkMatch[1])
            const total = parseInt(chunkMatch[2])
            const pcaCount = pcaMatch ? parseInt(pcaMatch[1]) : 0
            
            setCurrentChunk({ current, total })
            
            // Add chunk result
            if (pcaCount > 0) {
              setChunkResults(prev => [...prev, { chunkNum: current, pcaCount }])
              setTotalExtracted(prev => prev + pcaCount)
            }
            
            // Progress from 20% to 75% based on chunks (longer analysis time)
            const chunkProgress = (current / total) * 55
            setProgress(20 + chunkProgress)
            
            updateStepStatus('analyze', 'running', `Processing chunk ${current}/${total} - ${pcaCount} PCAs extracted`)
            
            // Trigger live preview update if available
            if (data.rows && onProgressUpdate) {
              onProgressUpdate(data.rows)
            }
          }
        } else if (message.includes('Compiling')) {
          updateStepStatus('analyze', 'complete', `Extracted ${totalExtracted} total PCA entries`)
          updateStepStatus('compile', 'running', 'Scanning through all entries, removing duplicates & normalizing data')
          setProgress(80)
        } else if (message.includes('Dedup') || message.includes('duplicate')) {
          updateStepStatus('compile', 'running', 'Deduplication algorithm running')
          setProgress(85)
        } else if (message.includes('Saving')) {
          updateStepStatus('compile', 'running', 'Persisting deduplicated results to disk')
          setProgress(92)
        }
      } else if (data.status === 'complete') {
        updateStepStatus('compile', 'complete')
        setProgress(100)
        setTimeout(() => {
          eventSource.close()
          onComplete(data)
        }, 500)
      } else if (data.status === 'cancelled') {
        setIsCancelled(true)
        eventSource.close()
        if (onCancel) onCancel()
      } else if (data.status === 'error') {
        const currentRunningStep = steps.find(s => s.status === 'running')
        if (currentRunningStep) {
          updateStepStatus(currentRunningStep.id, 'error')
        }
        eventSource.close()
        onError(data.message)
      }
    }

    eventSource.onerror = () => {
      eventSource.close()
    }

    return () => {
      eventSource.close()
    }
  }, [jobId])

  const updateStepStatus = (stepId: string, status: ProgressStep['status'], details?: string) => {
    setSteps(prev => prev.map(step => 
      step.id === stepId ? { ...step, status, details } : step
    ))
  }

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel this extraction?')) return
    
    setCancelling(true)
    try {
      await api.cancelExtraction(jobId)
      setIsCancelled(true)
      if (onCancel) onCancel()
    } catch (error) {
      console.error('Failed to cancel:', error)
    } finally {
      setCancelling(false)
    }
  }

  const getStepIcon = (status: ProgressStep['status']) => {
    switch (status) {
      case 'complete':
        return <CheckCircle2 className="w-6 h-6" style={{ color: 'var(--navy-dark)' }} />
      case 'running':
        return <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--burgundy-light)' }} />
      case 'error':
        return <AlertCircle className="w-6 h-6" style={{ color: 'var(--burgundy-dark)' }} />
      default:
        return <Circle className="w-6 h-6" style={{ color: 'var(--cream)' }} />
    }
  }

  if (isCancelled) {
    return (
      <Card className="border-gray-200 dark:border-gray-800" style={{ backgroundColor: 'var(--cream)/50' }}>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3" style={{ color: 'var(--burgundy-dark)' }}>
            <AlertCircle className="w-5 h-5" />
            <p className="font-medium">Extraction cancelled by user</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Overall Progress Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-3">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-semibold text-lg">Extraction Progress</h3>
              {onCancel && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCancel}
                  disabled={cancelling}
                  className="hover:bg-gray-100"
                  style={{ color: 'var(--burgundy-dark)' }}
                >
                  <X className="w-4 h-4 mr-1" />
                  Cancel
                </Button>
              )}
            </div>
            
            {/* Progress Bar */}
            <div className="relative h-3 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--cream)' }}>
              <motion.div
                className="absolute h-full rounded-full"
                style={{ 
                  background: `linear-gradient(90deg, var(--navy-dark) 0%, var(--navy-light) 50%, var(--burgundy-light) 100%)`
                }}
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
            </div>
            
            {/* Progress Text */}
            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
              <span className="font-semibold">{progress.toFixed(0)}% complete</span>
              <div className="flex gap-4 font-mono text-xs">
                {currentChunk && (
                  <span>
                    Chunk {currentChunk.current}/{currentChunk.total}
                  </span>
                )}
                {totalExtracted > 0 && (
                  <span className="font-semibold" style={{ color: 'var(--navy-dark)' }}>
                    {totalExtracted} PCAs extracted
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Step-by-Step Progress */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {steps.map((step, index) => (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-start gap-4"
              >
                {/* Icon */}
                <div className="flex-shrink-0 mt-1">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={step.status}
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.8, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      {getStepIcon(step.status)}
                    </motion.div>
                  </AnimatePresence>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={`font-medium ${
                      step.status === 'complete' ? 'text-gray-900 dark:text-gray-100' : 
                      step.status === 'error' ? 'text-gray-400 dark:text-gray-600' :
                      'text-gray-400 dark:text-gray-600'
                    }`} style={
                      step.status === 'running' ? { color: 'var(--burgundy-light)' } :
                      step.status === 'complete' ? { color: 'var(--navy-dark)' } : undefined
                    }>
                      {step.label}
                    </p>
                    {step.status === 'running' && (
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: 'var(--burgundy-light)' }}></span>
                        <span className="relative inline-flex rounded-full h-2 w-2" style={{ backgroundColor: 'var(--burgundy-light)' }}></span>
                      </span>
                    )}
                  </div>
                  
                  {step.details && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 truncate">
                      {step.details}
                    </p>
                  )}
                </div>

                {/* Connector Line */}
                {index < steps.length - 1 && (
                  <div className="absolute left-[11px] ml-[12px] mt-8 h-12 w-0.5 bg-gray-200 dark:bg-gray-700" style={{position: 'relative', left: -40, width: 1}} />
                )}
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

