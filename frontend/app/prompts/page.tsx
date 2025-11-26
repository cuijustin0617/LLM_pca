'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Save, CheckCircle, FileText, Edit2, Trash2 } from 'lucide-react'
import { storage } from '@/lib/storage'

interface PromptVersion {
  id: string
  name: string
  content: string
  createdAt: string
  active: boolean
}

const DEFAULT_PROMPT = `Loading...`

export default function PromptsPage() {
  const [versions, setVersions] = useState<PromptVersion[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [newVersionName, setNewVersionName] = useState('')
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadPrompts()
  }, [])

  const loadPrompts = async () => {
    try {
      setLoading(true)
      // Try to load from backend API first
      const response = await fetch('http://localhost:8000/prompts/versions')
      if (response.ok) {
        const apiVersions = await response.json()
        
        // Fetch content for each version
        const versionsWithContent = await Promise.all(
          apiVersions.map(async (v: any) => {
            try {
              const contentRes = await fetch(`http://localhost:8000/prompts/versions/${v.id}`)
              if (contentRes.ok) {
                const data = await contentRes.json()
                return {
                  id: v.id,
                  name: v.name,
                  content: data.content,
                  createdAt: v.createdAt,
                  active: v.active,
                }
              }
            } catch (err) {
              console.error(`Failed to load content for ${v.id}:`, err)
            }
            return null
          })
        )
        
        const validVersions = versionsWithContent.filter((v): v is PromptVersion => v !== null)
        
        if (validVersions.length > 0) {
          setVersions(validVersions)
          storage.setPromptVersions(validVersions)
          setError(null)
        } else {
          throw new Error('No valid versions loaded')
        }
      } else {
        throw new Error('Backend not available')
      }
    } catch (err) {
      console.error('Failed to load prompts from backend:', err)
      setError('Backend not available. Using local storage.')
      
      // Fall back to localStorage
      const stored = storage.getPromptVersions()
      if (stored && stored.length > 0) {
        setVersions(stored)
      } else {
        // Initialize with placeholder (backend should be started)
        const placeholderVersion: PromptVersion = {
          id: 'v1',
          name: 'Version 1 (Default)',
          content: 'Please start the backend server to load prompts.\n\ncd backend\nuvicorn main:app --reload',
          createdAt: new Date().toISOString(),
          active: true,
        }
        setVersions([placeholderVersion])
      }
    } finally {
      setLoading(false)
    }
  }

  const handleAddVersion = async () => {
    const name = newVersionName.trim() || `Version ${versions.length + 1}`
    
    try {
      // Get the first version's content as a template
      const templateContent = versions[0]?.content || 'New prompt template...'
      
      const response = await fetch('http://localhost:8000/prompts/versions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          content: templateContent,
          description: 'New version created from UI'
        })
      })
      
      if (response.ok) {
        const newVersion = await response.json()
        const versionWithContent: PromptVersion = {
          id: newVersion.id,
          name: newVersion.name,
          content: newVersion.content,
          createdAt: newVersion.createdAt,
          active: newVersion.active
        }
        
        const updated = [...versions, versionWithContent]
        setVersions(updated)
        storage.setPromptVersions(updated)
        setNewVersionName('')
        setEditingId(versionWithContent.id)
        setEditContent(versionWithContent.content)
        
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      } else {
        setError('Failed to create version. Backend may not be available.')
      }
    } catch (err) {
      console.error('Failed to create version:', err)
      setError('Failed to create version. Please ensure backend is running.')
    }
  }

  const handleSetActive = async (id: string) => {
    try {
      const response = await fetch(`http://localhost:8000/prompts/versions/${id}/activate`, {
        method: 'PUT'
      })
      
      if (response.ok) {
        const updated = versions.map((v) => ({
          ...v,
          active: v.id === id,
        }))
        setVersions(updated)
        storage.setPromptVersions(updated)
        
        // Save active prompt content
        const activeVersion = updated.find((v) => v.id === id)
        if (activeVersion) {
          storage.setActivePrompt(activeVersion.content)
        }
        
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      } else {
        setError('Failed to activate version. Changes not persisted to files.')
      }
    } catch (err) {
      console.error('Failed to activate version:', err)
      setError('Backend not available. Changes not saved to files.')
    }
  }

  const handleSaveEdit = async (id: string) => {
    try {
      const response = await fetch(`http://localhost:8000/prompts/versions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editContent })
      })
      
      if (response.ok) {
        const updated = versions.map((v) =>
          v.id === id ? { ...v, content: editContent } : v
        )
        setVersions(updated)
        storage.setPromptVersions(updated)
        
        // If this is the active version, update active prompt
        const version = updated.find((v) => v.id === id)
        if (version?.active) {
          storage.setActivePrompt(version.content)
        }
        
        setEditingId(null)
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      } else {
        setError('Failed to save changes. Changes not persisted to files.')
      }
    } catch (err) {
      console.error('Failed to save edit:', err)
      setError('Backend not available. Changes not saved to files.')
    }
  }

  const handleDelete = async (id: string) => {
    if (versions.length === 1) {
      alert('Cannot delete the last prompt version')
      return
    }
    
    const versionToDelete = versions.find((v) => v.id === id)
    
    if (versionToDelete?.active) {
      alert('Cannot delete the active version. Please set another version as active first.')
      return
    }
    
    try {
      const response = await fetch(`http://localhost:8000/prompts/versions/${id}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        const updated = versions.filter((v) => v.id !== id)
        setVersions(updated)
        storage.setPromptVersions(updated)
        
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      } else {
        const error = await response.json()
        alert(error.detail || 'Failed to delete version')
      }
    } catch (err) {
      console.error('Failed to delete version:', err)
      setError('Backend not available. Changes not saved to files.')
    }
  }

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Prompt Management</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            Manage and version control extraction prompts
          </p>
        </div>
        {saved && (
          <Badge className="bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Saved!
          </Badge>
        )}
      </div>

      {/* Add New Version */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Add New Version
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="Version name (optional)"
              value={newVersionName}
              onChange={(e) => setNewVersionName(e.target.value)}
              className="flex-1"
            />
            <Button onClick={handleAddVersion}>
              <Plus className="w-4 h-4 mr-2" />
              Create Version
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Prompt Versions */}
      <div className="space-y-4">
        {versions.map((version) => (
          <Card key={version.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    {version.name}
                    {version.active && (
                      <Badge style={{ backgroundColor: 'var(--navy-dark)', color: 'white' }}>
                        Active
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription>
                    Created: {new Date(version.createdAt).toLocaleString()}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  {!version.active && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSetActive(version.id)}
                    >
                      Set Active
                    </Button>
                  )}
                  {editingId === version.id ? (
                    <Button
                      size="sm"
                      onClick={() => handleSaveEdit(version.id)}
                    >
                      <Save className="w-4 h-4 mr-1" />
                      Save
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingId(version.id)
                        setEditContent(version.content)
                      }}
                    >
                      <Edit2 className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(version.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {editingId === version.id ? (
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full h-96 p-3 border rounded-lg font-mono text-sm bg-white dark:bg-gray-800 dark:border-gray-700"
                  placeholder="Enter prompt content..."
                />
              ) : (
                <pre className="w-full max-h-96 overflow-auto p-3 bg-gray-50 dark:bg-gray-900 rounded-lg text-xs font-mono whitespace-pre-wrap">
                  {version.content}
                </pre>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}


