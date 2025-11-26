'use client'

import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { FileText, CheckCircle, Play, Trash2 } from 'lucide-react'
import type { Project } from '@/lib/types'
import { formatDate } from '@/lib/utils'
import Link from 'next/link'

interface ProjectCardProps {
  project: Project
  onDelete?: (id: string) => void
}

export function ProjectCard({ project, onDelete }: ProjectCardProps) {
  const hasGroundTruth = Boolean(project.ground_truth_file)
  
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <h3 className="font-semibold text-lg">{project.name}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Created {formatDate(project.created_at)}
            </p>
          </div>
          
          {hasGroundTruth && (
            <Badge variant="success">
              <CheckCircle className="w-3 h-3 mr-1" />
              Has GT
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 p-3 bg-gray-50 dark:bg-gray-800/50 rounded">
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Experiments</div>
            <div className="text-lg font-semibold">{project.experiment_count}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Files</div>
            <div className="flex items-center gap-1 text-sm mt-1">
              <FileText className="w-3 h-3" />
              {hasGroundTruth ? 2 : 1}
            </div>
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex gap-2">
          <Link href={`/extract?project=${project.id}`} className="flex-1">
            <Button className="w-full" size="sm">
              <Play className="w-4 h-4 mr-2" />
              Run Extraction
            </Button>
          </Link>
          
          {onDelete && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                if (confirm(`Delete project "${project.name}"?`)) {
                  onDelete(project.id)
                }
              }}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

