'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Play, TrendingUp, FlaskConical, Clock } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import type { Experiment } from '@/lib/types'
import { formatDateTime, formatPercentage } from '@/lib/utils'

export default function DashboardPage() {
  const [recentExperiments, setRecentExperiments] = useState<Experiment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState({
    totalExperiments: 0,
    totalProjects: 0,
    avgRecall: 0,
  })

  useEffect(() => {
    async function loadData() {
      try {
        const [experimentsData, projectsData] = await Promise.all([
          api.getExperiments({ limit: 5 }),
          api.getProjects(),
        ])
        
        setRecentExperiments(experimentsData.experiments)
        
        const avgRecall = experimentsData.experiments
          .filter(e => e.metrics)
          .reduce((sum, e) => sum + (e.metrics?.recall || 0), 0) / 
          Math.max(experimentsData.experiments.filter(e => e.metrics).length, 1)
        
        setStats({
          totalExperiments: experimentsData.total,
          totalProjects: projectsData.length,
          avgRecall,
        })
        setError(null)
      } catch (error: any) {
        console.error('Failed to load dashboard data:', error)
        if (error.message?.includes('fetch') || error.message?.includes('Failed')) {
          setError('Backend server is not running. Please start it at http://localhost:8000')
        } else {
          setError('Failed to load dashboard data')
        }
      } finally {
        setLoading(false)
      }
    }
    
    loadData()
  }, [])

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold bg-clip-text text-transparent" style={{
          backgroundImage: `linear-gradient(to right, var(--navy-dark), var(--burgundy-light))`,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          Dashboard
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-2">
          Overview of your PCA extraction pipeline
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <Card className="border-gray-200 dark:border-gray-800" style={{ backgroundColor: 'var(--cream)/30' }}>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="mt-1" style={{ color: 'var(--burgundy-dark)' }}>⚠️</div>
                <div className="flex-1">
                  <h3 className="font-semibold mb-2" style={{ color: 'var(--burgundy-dark)' }}>
                    Backend Server Not Running
                  </h3>
                  <p className="text-sm mb-3" style={{ color: 'var(--burgundy-dark)' }}>
                    The frontend is working, but it can't connect to the backend API.
                  </p>
                  <div className="rounded p-3 font-mono text-xs space-y-2" style={{ backgroundColor: 'var(--cream)' }}>
                    <p className="font-semibold">To fix this, open a new terminal and run:</p>
                    <p style={{ color: 'var(--navy-dark)' }}>cd backend</p>
                    <p style={{ color: 'var(--navy-dark)' }}>uvicorn main:app --reload</p>
                  </div>
                  <p className="text-xs mt-3" style={{ color: 'var(--burgundy-dark)' }}>
                    Backend should start at: <strong>http://localhost:8000</strong>
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.reload()}
                className="border-gray-300 dark:border-gray-700"
              >
                Retry Connection
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Experiments</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalExperiments}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Projects</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalProjects}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Avg Recall</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {formatPercentage(stats.avgRecall)}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Quick Action</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/extract">
              <Button className="w-full">
                <Play className="w-4 h-4 mr-2" />
                New Extraction
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Recent Experiments
          </CardTitle>
          <CardDescription>Your latest extraction runs</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading...</div>
          ) : recentExperiments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No experiments yet. Start your first extraction!
            </div>
          ) : (
            <div className="space-y-4">
              {recentExperiments.map((exp) => (
                <div
                  key={exp.id}
                  className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="font-medium">{exp.project_name}</div>
                    <div className="text-sm text-gray-500">
                      {formatDateTime(exp.created_at)} • {exp.config.provider} / {exp.config.model}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-sm text-gray-500">Recall</div>
                      <div className="font-semibold">
                        {exp.metrics ? formatPercentage(exp.metrics.recall) : 'N/A'}
                      </div>
                    </div>
                    
                    <Badge variant={exp.status === 'completed' ? 'success' : exp.status === 'failed' ? 'error' : 'default'}>
                      {exp.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
