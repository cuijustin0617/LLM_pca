'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'
import { Settings, CheckCircle, XCircle } from 'lucide-react'
import type { ExtractionConfig } from '@/lib/types'
import { storage } from '@/lib/storage'

interface ConfigPanelProps {
  config: ExtractionConfig
  onChange: (config: ExtractionConfig) => void
  openaiKey: string
  geminiKey: string
  onKeysChange: (openai: string, gemini: string) => void
}

const MODELS = {
  openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'],
  gemini: ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.5-flash-lite'],
}

export function ConfigPanel({
  config,
  onChange,
  openaiKey,
  geminiKey,
  onKeysChange,
}: ConfigPanelProps) {
  const [expanded, setExpanded] = useState(false)

  const updateConfig = (updates: Partial<ExtractionConfig>) => {
    const newConfig = { ...config, ...updates }
    onChange(newConfig)
    
    // Save to localStorage
    storage.setProvider(newConfig.provider)
    storage.setModel(newConfig.model)
    storage.setTemperature(newConfig.temperature)
    storage.setChunkSize(newConfig.chunk_size)
  }

  return (
    <Card>
      <CardHeader className="cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Configuration
            </CardTitle>
            <CardDescription>
              {config.provider} / {config.model}
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm">
            {expanded ? 'Collapse' : 'Expand'}
          </Button>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="space-y-6">
          {/* API Keys */}
          <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
            <h4 className="font-medium text-sm">API Keys (Session Only)</h4>
            
            <div>
              <Label htmlFor="openai-key">OpenAI API Key</Label>
              <Input
                id="openai-key"
                type="password"
                value={openaiKey}
                onChange={(e) => onKeysChange(e.target.value, geminiKey)}
                placeholder="sk-..."
              />
            </div>
            
            <div>
              <Label htmlFor="gemini-key">Gemini API Key</Label>
              <Input
                id="gemini-key"
                type="password"
                value={geminiKey}
                onChange={(e) => onKeysChange(openaiKey, e.target.value)}
                placeholder="AIza..."
              />
            </div>
          </div>

          {/* Provider & Model */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="provider">Provider</Label>
              <Select
                id="provider"
                value={config.provider}
                onChange={(e) => {
                  const provider = e.target.value as 'openai' | 'gemini'
                  updateConfig({
                    provider,
                    model: MODELS[provider][0],
                  })
                }}
              >
                <option value="openai">OpenAI</option>
                <option value="gemini">Gemini</option>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="model">Model</Label>
              <Select
                id="model"
                value={config.model}
                onChange={(e) => updateConfig({ model: e.target.value })}
              >
                {MODELS[config.provider].map((model) => (
                  <option key={model} value={model}>
                    {model}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {/* Temperature */}
          <div>
            <Slider
              label="Temperature"
              min={0}
              max={1}
              step={0.1}
              value={config.temperature}
              onChange={(e) => updateConfig({ temperature: parseFloat(e.target.value) })}
            />
          </div>

          {/* Chunk Size */}
          <div>
            <Label htmlFor="chunk-size">Chunk Size (words)</Label>
            <Input
              id="chunk-size"
              type="number"
              min={1000}
              max={10000}
              step={500}
              value={config.chunk_size}
              onChange={(e) => updateConfig({ chunk_size: parseInt(e.target.value) })}
            />
          </div>
        </CardContent>
      )}
    </Card>
  )
}

