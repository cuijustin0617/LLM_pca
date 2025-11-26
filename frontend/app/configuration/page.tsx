'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Settings, Save, CheckCircle } from 'lucide-react'
import { useStore } from '@/store'
import { storage } from '@/lib/storage'

const MODELS = {
  openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'],
  gemini: ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.5-flash-lite'],
}

export default function ConfigurationPage() {
  const { extraction, setExtractionConfig } = useStore()
  const [config, setConfig] = useState(extraction.config)
  const [openaiKey, setOpenaiKey] = useState(storage.getOpenAIKey() || '')
  const [geminiKey, setGeminiKey] = useState(storage.getGeminiKey() || '')
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    // Update global store
    setExtractionConfig(config)
    
    // Save to localStorage
    storage.setProvider(config.provider)
    storage.setModel(config.model)
    storage.setTemperature(config.temperature)
    storage.setChunkSize(config.chunk_size)
    storage.setOpenAIKey(openaiKey)
    storage.setGeminiKey(geminiKey)
    
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Configuration</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-2">
          Configure extraction settings and API keys
        </p>
      </div>

      {/* API Keys */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            API Keys
          </CardTitle>
          <CardDescription>
            Keys are stored in browser session storage only (not on server)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="openai-key">OpenAI API Key</Label>
            <Input
              id="openai-key"
              type="password"
              value={openaiKey}
              onChange={(e) => setOpenaiKey(e.target.value)}
              placeholder="sk-..."
            />
            <p className="text-xs text-gray-500 mt-1">
              Required for OpenAI models (GPT-4o, etc.)
            </p>
          </div>
          
          <div>
            <Label htmlFor="gemini-key">Gemini API Key</Label>
            <Input
              id="gemini-key"
              type="password"
              value={geminiKey}
              onChange={(e) => setGeminiKey(e.target.value)}
              placeholder="AIza..."
            />
            <p className="text-xs text-gray-500 mt-1">
              Required for Gemini models (Gemini 2.5 Pro, etc.)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Model Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Model Settings</CardTitle>
          <CardDescription>
            Choose the LLM provider and model for extraction
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Provider & Model */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="provider">Provider</Label>
              <select
                id="provider"
                value={config.provider}
                onChange={(e) => {
                  const provider = e.target.value as 'openai' | 'gemini'
                  setConfig({
                    ...config,
                    provider,
                    model: MODELS[provider][0],
                  })
                }}
                className="w-full p-2 border rounded-lg bg-white dark:bg-gray-800 dark:border-gray-700"
              >
                <option value="openai">OpenAI</option>
                <option value="gemini">Gemini</option>
              </select>
            </div>
            
            <div>
              <Label htmlFor="model">Model</Label>
              <select
                id="model"
                value={config.model}
                onChange={(e) => setConfig({ ...config, model: e.target.value })}
                className="w-full p-2 border rounded-lg bg-white dark:bg-gray-800 dark:border-gray-700"
              >
                {MODELS[config.provider].map((model) => (
                  <option key={model} value={model}>
                    {model}
                  </option>
                ))}
              </select>
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
              onChange={(e) => setConfig({ ...config, temperature: parseFloat(e.target.value) })}
            />
            <p className="text-xs text-gray-500 mt-1">
              Lower values make output more focused and deterministic. Recommended: 0.0
            </p>
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
              onChange={(e) => setConfig({ ...config, chunk_size: parseInt(e.target.value) })}
            />
            <p className="text-xs text-gray-500 mt-1">
              PDF will be split into chunks of this size. Recommended: 3500
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex gap-2">
        <Button onClick={handleSave} size="lg">
          {saved ? (
            <>
              <CheckCircle className="w-4 h-4 mr-2" />
              Saved!
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Configuration
            </>
          )}
        </Button>
      </div>
    </div>
  )
}


