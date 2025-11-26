'use client'

import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Edit2,
  Trash2,
  Plus,
  Save,
  X,
  Undo2,
  Redo2,
  Download,
  RotateCcw,
} from 'lucide-react'
import type { PCARow } from '@/lib/types'
import { downloadCSV, downloadJSON } from '@/lib/utils'

interface EditablePCATableProps {
  rows: PCARow[]
  onChange: (rows: PCARow[]) => void
  onSave?: (rows: PCARow[]) => Promise<void>
  isDirty?: boolean
}

interface EditState {
  rowIndex: number | null
  editedRow: PCARow | null
}

export function EditablePCATable({
  rows,
  onChange,
  onSave,
  isDirty = false,
}: EditablePCATableProps) {
  const [editState, setEditState] = useState<EditState>({ rowIndex: null, editedRow: null })
  const [history, setHistory] = useState<PCARow[][]>([rows])
  const [historyIndex, setHistoryIndex] = useState(0)
  const [saving, setSaving] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)

  const canUndo = historyIndex > 0
  const canRedo = historyIndex < history.length - 1

  const updateHistory = (newRows: PCARow[]) => {
    const newHistory = history.slice(0, historyIndex + 1)
    newHistory.push(newRows)
    setHistory(newHistory)
    setHistoryIndex(newHistory.length - 1)
    onChange(newRows)
  }

  const undo = () => {
    if (canUndo) {
      const newIndex = historyIndex - 1
      setHistoryIndex(newIndex)
      onChange(history[newIndex])
    }
  }

  const redo = () => {
    if (canRedo) {
      const newIndex = historyIndex + 1
      setHistoryIndex(newIndex)
      onChange(history[newIndex])
    }
  }

  const startEdit = (index: number) => {
    setEditState({
      rowIndex: index,
      editedRow: { ...rows[index] },
    })
  }

  const cancelEdit = () => {
    setEditState({ rowIndex: null, editedRow: null })
  }

  const saveEdit = () => {
    if (editState.rowIndex !== null && editState.editedRow) {
      const newRows = [...rows]
      newRows[editState.rowIndex] = editState.editedRow
      updateHistory(newRows)
      cancelEdit()
    }
  }

  const deleteRow = (index: number) => {
    if (confirm('Delete this row?')) {
      const newRows = rows.filter((_, i) => i !== index)
      updateHistory(newRows)
    }
  }

  const addRow = (newRow: PCARow) => {
    updateHistory([...rows, newRow])
    setShowAddForm(false)
  }

  const revertChanges = () => {
    if (confirm('Revert all changes?')) {
      const originalRows = history[0]
      setHistory([originalRows])
      setHistoryIndex(0)
      onChange(originalRows)
    }
  }

  const handleSave = async () => {
    if (!onSave) return
    
    setSaving(true)
    try {
      await onSave(rows)
    } catch (error) {
      console.error('Failed to save:', error)
      alert('Failed to save changes')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-2 justify-between">
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={undo}
                disabled={!canUndo}
              >
                <Undo2 className="w-4 h-4 mr-1" />
                Undo
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={redo}
                disabled={!canRedo}
              >
                <Redo2 className="w-4 h-4 mr-1" />
                Redo
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAddForm(true)}
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Row
              </Button>
              
              {isDirty && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={revertChanges}
                >
                  <RotateCcw className="w-4 h-4 mr-1" />
                  Revert
                </Button>
              )}
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => downloadCSV(rows, 'pca_results.csv')}
              >
                <Download className="w-4 h-4 mr-1" />
                CSV
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => downloadJSON(rows, 'pca_results.json')}
              >
                <Download className="w-4 h-4 mr-1" />
                JSON
              </Button>
              
              {onSave && isDirty && (
                <Button
                  size="sm"
                  onClick={handleSave}
                  loading={saving}
                >
                  <Save className="w-4 h-4 mr-1" />
                  Save Changes
                </Button>
              )}
            </div>
          </div>
          
          {isDirty && (
            <div className="mt-3 text-sm text-amber-600 dark:text-amber-400">
              You have unsaved changes
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Form */}
      {showAddForm && (
        <AddRowForm
          onAdd={addRow}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800 text-xs uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">ID</th>
                  <th className="px-4 py-3 text-left">Address</th>
                  <th className="px-4 py-3 text-left">Location</th>
                  <th className="px-4 py-3 text-left">PCA #</th>
                  <th className="px-4 py-3 text-left">PCA Name</th>
                  <th className="px-4 py-3 text-left">Description</th>
                  <th className="px-4 py-3 text-left">Pages</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                      No rows yet. Add your first row above.
                    </td>
                  </tr>
                ) : (
                  rows.map((row, index) => (
                    <tr
                      key={index}
                      className="border-b border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                    >
                      {editState.rowIndex === index ? (
                        <EditableRow
                          row={editState.editedRow!}
                          onChange={(updated) =>
                            setEditState({ ...editState, editedRow: updated })
                          }
                          onSave={saveEdit}
                          onCancel={cancelEdit}
                        />
                      ) : (
                        <>
                          <td className="px-4 py-3">{row.pca_identifier}</td>
                          <td className="px-4 py-3 max-w-xs truncate" title={row.address}>
                            {row.address}
                          </td>
                          <td className="px-4 py-3">
                            <Badge
                              variant={
                                row.location_relation_to_site === 'On-Site'
                                  ? 'success'
                                  : 'warning'
                              }
                            >
                              {row.location_relation_to_site}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">{row.pca_number || '-'}</td>
                          <td className="px-4 py-3 max-w-xs truncate" title={row.pca_name}>
                            {row.pca_name}
                          </td>
                          <td className="px-4 py-3 max-w-md truncate" title={row.description_timeline}>
                            {row.description_timeline}
                          </td>
                          <td className="px-4 py-3 text-gray-500">{row.source_pages}</td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex gap-1 justify-end">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => startEdit(index)}
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteRow(index)}
                              >
                                <Trash2 className="w-4 h-4" style={{ color: 'var(--burgundy-dark)' }} />
                              </Button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Editable Row Component
function EditableRow({
  row,
  onChange,
  onSave,
  onCancel,
}: {
  row: PCARow
  onChange: (row: PCARow) => void
  onSave: () => void
  onCancel: () => void
}) {
  return (
    <>
      <td className="px-2 py-2">
        <Input
          type="number"
          value={row.pca_identifier}
          onChange={(e) =>
            onChange({ ...row, pca_identifier: parseInt(e.target.value) })
          }
          className="w-20"
        />
      </td>
      <td className="px-2 py-2">
        <Input
          value={row.address}
          onChange={(e) => onChange({ ...row, address: e.target.value })}
        />
      </td>
      <td className="px-2 py-2">
        <select
          value={row.location_relation_to_site}
          onChange={(e) =>
            onChange({ ...row, location_relation_to_site: e.target.value })
          }
          className="w-full px-2 py-1 border rounded"
        >
          <option value="On-Site">On-Site</option>
          <option value="Off-Site">Off-Site</option>
        </select>
      </td>
      <td className="px-2 py-2">
        <Input
          type="number"
          value={row.pca_number || ''}
          onChange={(e) =>
            onChange({
              ...row,
              pca_number: e.target.value ? parseInt(e.target.value) : null,
            })
          }
          className="w-20"
        />
      </td>
      <td className="px-2 py-2">
        <Input
          value={row.pca_name}
          onChange={(e) => onChange({ ...row, pca_name: e.target.value })}
        />
      </td>
      <td className="px-2 py-2">
        <Input
          value={row.description_timeline}
          onChange={(e) =>
            onChange({ ...row, description_timeline: e.target.value })
          }
        />
      </td>
      <td className="px-2 py-2">
        <Input
          value={row.source_pages}
          onChange={(e) => onChange({ ...row, source_pages: e.target.value })}
          className="w-24"
        />
      </td>
      <td className="px-2 py-2 text-right">
        <div className="flex gap-1 justify-end">
          <Button variant="ghost" size="sm" onClick={onSave}>
            <Save className="w-4 h-4" style={{ color: 'var(--navy-dark)' }} />
          </Button>
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <X className="w-4 h-4" style={{ color: 'var(--burgundy-dark)' }} />
          </Button>
        </div>
      </td>
    </>
  )
}

// Add Row Form Component
function AddRowForm({
  onAdd,
  onCancel,
}: {
  onAdd: (row: PCARow) => void
  onCancel: () => void
}) {
  const [newRow, setNewRow] = useState<PCARow>({
    pca_identifier: 0,
    address: '',
    location_relation_to_site: 'On-Site',
    pca_number: null,
    pca_name: '',
    description_timeline: '',
    source_pages: '',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onAdd(newRow)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Add New Row</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">PCA Identifier *</label>
              <Input
                type="number"
                required
                value={newRow.pca_identifier}
                onChange={(e) =>
                  setNewRow({ ...newRow, pca_identifier: parseInt(e.target.value) })
                }
              />
            </div>
            <div>
              <label className="text-sm font-medium">Address *</label>
              <Input
                required
                value={newRow.address}
                onChange={(e) => setNewRow({ ...newRow, address: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Location</label>
              <select
                value={newRow.location_relation_to_site}
                onChange={(e) =>
                  setNewRow({ ...newRow, location_relation_to_site: e.target.value })
                }
                className="w-full px-3 py-2 border rounded"
              >
                <option value="On-Site">On-Site</option>
                <option value="Off-Site">Off-Site</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">PCA Number</label>
              <Input
                type="number"
                value={newRow.pca_number || ''}
                onChange={(e) =>
                  setNewRow({
                    ...newRow,
                    pca_number: e.target.value ? parseInt(e.target.value) : null,
                  })
                }
              />
            </div>
            <div className="col-span-2">
              <label className="text-sm font-medium">PCA Name *</label>
              <Input
                required
                value={newRow.pca_name}
                onChange={(e) => setNewRow({ ...newRow, pca_name: e.target.value })}
              />
            </div>
            <div className="col-span-2">
              <label className="text-sm font-medium">Description/Timeline *</label>
              <Input
                required
                value={newRow.description_timeline}
                onChange={(e) =>
                  setNewRow({ ...newRow, description_timeline: e.target.value })
                }
              />
            </div>
            <div>
              <label className="text-sm font-medium">Source Pages</label>
              <Input
                value={newRow.source_pages}
                onChange={(e) =>
                  setNewRow({ ...newRow, source_pages: e.target.value })
                }
                placeholder="e.g., 10-12"
              />
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button type="submit">
              <Plus className="w-4 h-4 mr-2" />
              Add Row
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

