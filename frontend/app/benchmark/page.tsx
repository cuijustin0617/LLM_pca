'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select } from '@/components/ui/select'
import { api } from '@/lib/api'
import { Play, TrendingUp, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react'
import { formatPercentage } from '@/lib/utils'
import type { Experiment, Project, EvaluationResult } from '@/lib/types'

export default function BenchmarkPage() {
  const [experiments, setExperiments] = useState<Experiment[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedExperiment, setSelectedExperiment] = useState<string>('')
  const [selectedProject, setSelectedProject] = useState<string>('')
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<EvaluationResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [expsData, projsData] = await Promise.all([
        api.getExperiments(),
        api.getProjects(),
      ])
      
      // API returns { experiments: [], total: number }
      const experiments = Array.isArray(expsData) ? expsData : expsData.experiments || []
      setExperiments(experiments)
      
      // Ensure projsData is an array and filter for ground truth
      const projects = Array.isArray(projsData) ? projsData : []
      const projectsWithGT = projects.filter((p) => {
        const hasGroundTruth = p.ground_truth_file && 
                              p.ground_truth_file !== 'None' && 
                              p.ground_truth_file !== 'null'
        console.log(`Project ${p.name}: ground_truth_file = ${p.ground_truth_file}, hasGroundTruth = ${hasGroundTruth}`)
        return hasGroundTruth
      })
      
      console.log('Total projects loaded:', projects.length)
      console.log('Projects with ground truth:', projectsWithGT.length)
      console.log('Projects:', projects.map(p => ({ name: p.name, gt: p.ground_truth_file })))
      
      setProjects(projectsWithGT)
    } catch (error) {
      console.error('Failed to load data:', error)
      setError(`Failed to load projects: ${error}`)
      setExperiments([]) // Set to empty array on error
      setProjects([])
    }
  }

  const handleRunBenchmark = async () => {
    if (!selectedExperiment || !selectedProject) {
      setError('Please select both an experiment and a project with ground truth')
      return
    }

    setRunning(true)
    setError(null)
    setResult(null)

    try {
      const experiment = experiments.find((e) => e.id === selectedExperiment)
      const project = projects.find((p) => p.id === selectedProject)

      if (!experiment || !project || !project.ground_truth_file) {
        throw new Error('Invalid selection')
      }

      const evaluation = await api.runBenchmark(
        experiment.experiment_dir,
        project.ground_truth_file
      )

      setResult(evaluation)
    } catch (err: any) {
      setError(err.message || 'Failed to run benchmark')
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Benchmark Experiments</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-2">
          Evaluate extraction quality against ground truth data
        </p>
      </div>

      {/* Selection Card */}
      <Card>
        <CardHeader>
          <CardTitle>Run Benchmark</CardTitle>
          <CardDescription>
            Select an experiment and a project with ground truth to compare results
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Experiment Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Experiment</label>
            <select
              value={selectedExperiment}
              onChange={(e) => setSelectedExperiment(e.target.value)}
              className="w-full p-2 border rounded-lg bg-white dark:bg-gray-800 dark:border-gray-700"
              disabled={experiments.length === 0}
            >
              <option value="">
                {experiments.length === 0 
                  ? 'No experiments available...' 
                  : 'Select an experiment...'}
              </option>
              {experiments.map((exp) => (
                <option key={exp.id} value={exp.id}>
                  {exp.id} - {exp.config.model} ({new Date(exp.created_at).toLocaleDateString()})
                </option>
              ))}
            </select>
            {experiments.length === 0 && (
              <div className="p-3 border rounded-lg" style={{ backgroundColor: 'var(--cream)/50', borderColor: 'var(--navy-light)' }}>
                <p className="text-sm font-medium mb-1" style={{ color: 'var(--navy-dark)' }}>
                  No Experiments Found
                </p>
                <p className="text-xs text-muted-foreground">
                  Run an extraction first from the Extract page to create experiments that can be benchmarked.
                </p>
              </div>
            )}
          </div>

          {/* Project Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Ground Truth Project
              {projects.length > 0 && (
                <span className="ml-2 text-xs text-gray-500">
                  ({projects.length} available)
                </span>
              )}
            </label>
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="w-full p-2 border rounded-lg bg-white dark:bg-gray-800 dark:border-gray-700"
              disabled={projects.length === 0}
            >
              <option value="">
                {projects.length === 0 
                  ? 'No projects with ground truth available...' 
                  : 'Select a project...'}
              </option>
              {projects.map((proj) => (
                <option key={proj.id} value={proj.id}>
                  {proj.name} (Ground Truth: ✓)
                </option>
              ))}
            </select>
            {projects.length === 0 && (
              <div className="p-3 border rounded-lg" style={{ backgroundColor: 'var(--cream)/50', borderColor: 'var(--burgundy-light)' }}>
                <p className="text-sm font-medium mb-1" style={{ color: 'var(--burgundy-dark)' }}>
                  No Ground Truth Projects Found
                </p>
                <p className="text-xs text-muted-foreground">
                  Projects with ground truth CSV files are required for benchmarking.
                  Check that your projects in data/projects/ have both ERIS PDF and PCA CSV files.
                </p>
              </div>
            )}
          </div>

          {error && (
            <div className="p-3 border rounded-lg text-sm" style={{ backgroundColor: 'var(--burgundy-dark)/10', borderColor: 'var(--burgundy-light)', color: 'var(--burgundy-dark)' }}>
              {error}
            </div>
          )}

          <Button
            onClick={handleRunBenchmark}
            disabled={!selectedExperiment || !selectedProject || running}
            loading={running}
            size="lg"
            className="w-full"
          >
            <Play className="w-4 h-4 mr-2" />
            Run Benchmark
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {result && (
        <div className="space-y-4">
          {/* Metrics Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Performance Metrics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Recall - Emphasized */}
                <div className="p-6 rounded-lg" style={{
                  backgroundColor: 'var(--cream)',
                  border: '3px solid var(--navy-dark)',
                }}>
                  <p className="text-sm font-medium mb-2" style={{ color: 'var(--navy-dark)' }}>
                    Recall (Primary Metric)
                  </p>
                  <p className="text-5xl font-bold mb-2" style={{ color: 'var(--navy-dark)' }}>
                    {(result.metrics.recall * 100).toFixed(1)}%
                  </p>
                  <p className="text-xs text-gray-600">
                    Percentage of actual PCAs that were correctly identified
                  </p>
                </div>
                
                {/* Other Metrics */}
                <div className="grid grid-cols-3 gap-4">
                  <MetricCard
                    label="Precision"
                    value={result.metrics.precision}
                  />
                  <MetricCard
                    label="F1 Score"
                    value={result.metrics.f1_score}
                  />
                  <MetricCard
                    label="Accuracy"
                    value={result.metrics.accuracy}
                  />
                </div>
              </div>

              <div className="mt-6 grid grid-cols-3 gap-4 pt-4 border-t dark:border-gray-700">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-1" style={{ color: 'var(--navy-dark)' }}>
                    <CheckCircle2 className="w-4 h-4" />
                    <span className="text-2xl font-bold">{result.metrics.true_positives}</span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">True Positives</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-1" style={{ color: 'var(--burgundy-dark)' }}>
                    <XCircle className="w-4 h-4" />
                    <span className="text-2xl font-bold">{result.metrics.false_positives}</span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">False Positives</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-1" style={{ color: 'var(--burgundy-light)' }}>
                    <AlertTriangle className="w-4 h-4" />
                    <span className="text-2xl font-bold">{result.metrics.false_negatives}</span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">False Negatives</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Data Counts */}
          <Card>
            <CardHeader>
              <CardTitle>Data Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Ground Truth Rows</p>
                  <p className="text-3xl font-bold">{result.metrics.gt_count}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Extracted Rows</p>
                  <p className="text-3xl font-bold">{result.metrics.extracted_count}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Matches Preview */}
          {result.matches.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Matched Records ({result.matches.length})</CardTitle>
                <CardDescription>Successfully identified PCA entries</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {result.matches.slice(0, 10).map((match, idx) => (
                    <div
                      key={idx}
                      className="p-3 border rounded-lg"
                      style={{ backgroundColor: 'var(--cream)/50', borderColor: 'var(--navy-dark)' }}
                    >
                      <p className="text-sm font-mono">{JSON.stringify(match).slice(0, 100)}...</p>
                    </div>
                  ))}
                  {result.matches.length > 10 && (
                    <p className="text-sm text-gray-500 text-center pt-2">
                      ...and {result.matches.length - 10} more
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}

function MetricCard({
  label,
  value,
  description,
  highlight,
}: {
  label: string
  value: number
  description?: string
  highlight?: boolean
}) {
  const percentage = (value * 100).toFixed(1)
  const colorStyle =
    value >= 0.9
      ? { color: 'var(--navy-dark)' }
      : value >= 0.7
      ? { color: 'var(--cream)' }
      : { color: 'var(--burgundy-dark)' }

  return (
    <div
      className={`p-4 rounded-lg ${!highlight ? 'bg-gray-50 dark:bg-gray-800/50' : ''}`}
      style={highlight ? {
        backgroundColor: 'var(--cream)/50',
        border: '2px solid var(--navy-dark)',
      } : undefined}
    >
      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{label}</p>
      <p className="text-3xl font-bold mt-1" style={colorStyle}>{percentage}%</p>
      {description && (
        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">{description}</p>
      )}
    </div>
  )
}

