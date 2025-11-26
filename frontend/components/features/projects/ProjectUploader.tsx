'use client'

import { useState } from 'react'
import { Upload, FileText, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { api } from '@/lib/api'
import { useStore } from '@/store'

interface ProjectUploaderProps {
  onSuccess?: () => void
}

export function ProjectUploader({ onSuccess }: ProjectUploaderProps) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [erisFile, setErisFile] = useState<File | null>(null)
  const [gtFile, setGtFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const { addProject } = useStore()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!name || !erisFile) {
      setError('Project name and ERIS file are required')
      return
    }
    
    setUploading(true)
    setError(null)
    
    try {
      const project = await api.createProject(name, erisFile, gtFile || undefined)
      addProject(project)
      
      // Reset form
      setName('')
      setErisFile(null)
      setGtFile(null)
      setOpen(false)
      
      if (onSuccess) onSuccess()
    } catch (err: any) {
      setError(err.message || 'Failed to create project')
    } finally {
      setUploading(false)
    }
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} size="lg">
        <Upload className="w-4 h-4 mr-2" />
        New Project
      </Button>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>Create New Project</CardTitle>
            <CardDescription>Upload an ERIS report and optional ground truth</CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setOpen(false)}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Project Name */}
          <div>
            <Label htmlFor="name">Project Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., 670-progress-avenue"
              required
            />
          </div>
          
          {/* ERIS PDF */}
          <div>
            <Label htmlFor="eris">ERIS Report (PDF) *</Label>
            <Input
              id="eris"
              type="file"
              accept=".pdf"
              onChange={(e) => setErisFile(e.target.files?.[0] || null)}
              required
            />
            {erisFile && (
              <div className="mt-2 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <FileText className="w-4 h-4" />
                {erisFile.name} ({(erisFile.size / 1024 / 1024).toFixed(2)} MB)
              </div>
            )}
          </div>
          
          {/* Ground Truth CSV */}
          <div>
            <Label htmlFor="gt">Ground Truth (CSV) - Optional</Label>
            <Input
              id="gt"
              type="file"
              accept=".csv"
              onChange={(e) => setGtFile(e.target.files?.[0] || null)}
            />
            {gtFile && (
              <div className="mt-2 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <FileText className="w-4 h-4" />
                {gtFile.name} ({(gtFile.size / 1024).toFixed(2)} KB)
              </div>
            )}
          </div>
          
          {error && (
            <div className="p-3 border rounded text-sm" style={{ backgroundColor: 'var(--burgundy-dark)/10', borderColor: 'var(--burgundy-light)', color: 'var(--burgundy-dark)' }}>
              {error}
            </div>
          )}
          
          <div className="flex gap-2">
            <Button type="submit" loading={uploading} disabled={uploading}>
              Create Project
            </Button>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

