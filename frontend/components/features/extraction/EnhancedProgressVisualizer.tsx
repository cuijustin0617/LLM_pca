'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Terminal, Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { api } from '@/lib/api'

interface EnhancedProgressVisualizerProps {
  jobId: string
  onComplete: (data: any) => void
  onError: (message: string) => void
  onCancel?: () => void
}

interface LogEntry {
  id: number
  message: string
  timestamp: Date
}

export function EnhancedProgressVisualizer({
  jobId,
  onComplete,
  onError,
  onCancel,
}: EnhancedProgressVisualizerProps) {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [currentStep, setCurrentStep] = useState<string>('Initializing...')
  const [progress, setProgress] = useState(0)
  const logsEndRef = useRef<HTMLDivElement>(null)
  const [cancelling, setCancelling] = useState(false)
  const logIdCounter = useRef(0) // Counter to ensure unique IDs

  useEffect(() => {
    if (!jobId) return

    const eventSource = api.createProgressStream(jobId)

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data)

      if (data.status === 'progress') {
        const message = data.message
        setLogs((prev) => [...prev, { id: ++logIdCounter.current, message, timestamp: new Date() }])

        // Update progress and current step
        if (data.progress !== undefined) {
          setProgress(data.progress)
        }

        // Extract step from message
        if (message.includes('Extracted text')) setCurrentStep('Extracting Text')
        else if (message.includes('Chunking')) setCurrentStep('Chunking Content')
        else if (message.includes('Processing pages')) {
          setCurrentStep('Analyzing with LLM')
          // Try to extract chunk info
          const match = message.match(/chunk (\d+)\/(\d+)/)
          if (match) {
            const current = parseInt(match[1])
            const total = parseInt(match[2])
            setProgress((current / total) * 100)
          }
        } else if (message.includes('Compiling')) setCurrentStep('Compiling Results')
        else setCurrentStep(message)
      } else if (data.status === 'complete') {
        setProgress(100)
        setCurrentStep('Complete!')
        eventSource.close()
        onComplete(data)
      } else if (data.status === 'cancelled') {
        setCurrentStep('Cancelled')
        eventSource.close()
        if (onCancel) onCancel()
      } else if (data.status === 'error') {
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
  }, [jobId, onComplete, onError])

  // Auto-scroll
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel this extraction?')) return
    
    setCancelling(true)
    try {
      await api.cancelExtraction(jobId)
      if (onCancel) onCancel()
    } catch (error) {
      console.error('Failed to cancel:', error)
    } finally {
      setCancelling(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Progress Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                <span className="font-medium">{currentStep}</span>
              </div>
              <span className="text-sm text-gray-500">{progress.toFixed(0)}%</span>
            </div>
            
            <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--cream)' }}>
              <motion.div
                className="h-full"
                style={{ background: `linear-gradient(to right, var(--navy-dark), var(--burgundy-light))` }}
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Terminal Log */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2 text-base">
              <Terminal className="w-4 h-4" />
              Extraction Log
            </CardTitle>
            {onCancel && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleCancel}
                loading={cancelling}
              >
                <X className="w-4 h-4 mr-1" />
                Cancel
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-900 rounded-lg p-4 h-64 overflow-y-auto font-mono text-sm">
            <AnimatePresence initial={false}>
              {logs.map((log) => (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="text-gray-300 flex gap-2 mb-1"
                >
                  <span className="text-gray-600">
                    [{log.timestamp.toLocaleTimeString()}]
                  </span>
                  <span>{log.message}</span>
                </motion.div>
              ))}
            </AnimatePresence>
            <div ref={logsEndRef} />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

