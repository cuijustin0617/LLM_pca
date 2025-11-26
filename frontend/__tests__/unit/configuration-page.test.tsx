import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ConfigurationPage from '@/app/configuration/page'
import { storage } from '@/lib/storage'

// Mock storage
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

// Mock store
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

describe('ConfigurationPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders configuration page with title', () => {
    render(<ConfigurationPage />)
    expect(screen.getByText('Configuration')).toBeInTheDocument()
    expect(screen.getByText(/Configure extraction settings/i)).toBeInTheDocument()
  })

  it('renders API key inputs', () => {
    render(<ConfigurationPage />)
    expect(screen.getByLabelText(/OpenAI API Key/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Gemini API Key/i)).toBeInTheDocument()
  })

  it('renders model configuration section', () => {
    render(<ConfigurationPage />)
    expect(screen.getByLabelText(/Provider/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Model/i)).toBeInTheDocument()
  })

  it('renders save button', () => {
    render(<ConfigurationPage />)
    expect(screen.getByRole('button', { name: /Save Configuration/i })).toBeInTheDocument()
  })

  it('allows user to input API keys', () => {
    render(<ConfigurationPage />)
    const openaiInput = screen.getByLabelText(/OpenAI API Key/i)
    fireEvent.change(openaiInput, { target: { value: 'sk-test123' } })
    expect(openaiInput).toHaveValue('sk-test123')
  })

  it('shows saved confirmation after clicking save', async () => {
    render(<ConfigurationPage />)
    const saveButton = screen.getByRole('button', { name: /Save Configuration/i })
    fireEvent.click(saveButton)
    
    await waitFor(() => {
      expect(screen.getByText('Saved!')).toBeInTheDocument()
    })
  })
})


