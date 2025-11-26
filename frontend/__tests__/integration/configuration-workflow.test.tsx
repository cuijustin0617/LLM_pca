import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ConfigurationPage from '@/app/configuration/page'

vi.mock('@/lib/storage', () => ({
  storage: {
    getOpenAIKey: vi.fn(() => ''),
    getGeminiKey: vi.fn(() => ''),
    setOpenAIKey: vi.fn(),
    setGeminiKey: vi.fn(),
    setProvider: vi.fn(),
    setModel: vi.fn(),
    setTemperature: vi.fn(),
    setChunkSize: vi.fn(),
  },
}))

vi.mock('@/store', () => ({
  useStore: () => ({
    extraction: {
      config: {
        provider: 'gemini',
        model: 'gemini-2.5-flash',
        temperature: 0.0,
        chunk_size: 3500,
      },
    },
    setExtractionConfig: vi.fn(),
  }),
}))

describe('Configuration Workflow Integration', () => {
  it('complete configuration workflow', async () => {
    render(<ConfigurationPage />)
    
    // 1. User enters API keys
    const openaiInput = screen.getByLabelText(/OpenAI API Key/i)
    const geminiInput = screen.getByLabelText(/Gemini API Key/i)
    
    fireEvent.change(openaiInput, { target: { value: 'sk-test123' } })
    fireEvent.change(geminiInput, { target: { value: 'AIza-test456' } })
    
    // 2. User selects provider
    const providerSelect = screen.getByLabelText(/Provider/i)
    fireEvent.change(providerSelect, { target: { value: 'openai' } })
    
    // 3. User adjusts chunk size
    const chunkSizeInput = screen.getByLabelText(/Chunk Size/i)
    fireEvent.change(chunkSizeInput, { target: { value: '5000' } })
    
    // 4. User saves configuration
    const saveButton = screen.getByRole('button', { name: /Save Configuration/i })
    fireEvent.click(saveButton)
    
    // 5. Verify success feedback
    await waitFor(() => {
      expect(screen.getByText('Saved!')).toBeInTheDocument()
    })
  })

  it('allows switching between providers', () => {
    render(<ConfigurationPage />)
    
    const providerSelect = screen.getByLabelText(/Provider/i)
    
    // Switch to OpenAI
    fireEvent.change(providerSelect, { target: { value: 'openai' } })
    expect(providerSelect).toHaveValue('openai')
    
    // Switch back to Gemini
    fireEvent.change(providerSelect, { target: { value: 'gemini' } })
    expect(providerSelect).toHaveValue('gemini')
  })
})


