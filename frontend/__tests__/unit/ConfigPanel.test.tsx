import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ConfigPanel } from '@/components/features/extraction/ConfigPanel'
import type { ExtractionConfig } from '@/lib/types'

// Mock storage
vi.mock('@/lib/storage', () => ({
  storage: {
    setProvider: vi.fn(),
    setModel: vi.fn(),
    setTemperature: vi.fn(),
    setChunkSize: vi.fn(),
  },
}))

describe('ConfigPanel', () => {
  const defaultConfig: ExtractionConfig = {
    provider: 'gemini',
    model: 'gemini-2.5-flash',
    temperature: 0.1,
    chunk_size: 3000,
  }

  const defaultProps = {
    config: defaultConfig,
    onChange: vi.fn(),
    openaiKey: '',
    geminiKey: '',
    onKeysChange: vi.fn(),
  }

  it('renders all Gemini model options including gemini-2.5-flash-lite', () => {
    const { container } = render(<ConfigPanel {...defaultProps} />)
    
    // Expand the panel
    const header = screen.getByText('Configuration').closest('div')
    if (header?.parentElement) {
      fireEvent.click(header.parentElement)
    }

    // Check that model select has all Gemini options
    const modelSelect = container.querySelector('#model') as HTMLSelectElement
    expect(modelSelect).toBeTruthy()
    
    const options = Array.from(modelSelect?.options || []).map(opt => opt.value)
    expect(options).toContain('gemini-2.5-pro')
    expect(options).toContain('gemini-2.5-flash')
    expect(options).toContain('gemini-2.5-flash-lite')
  })

  it('renders all OpenAI model options', () => {
    const openaiConfig = { ...defaultConfig, provider: 'openai' as const, model: 'gpt-4o' }
    const { container } = render(<ConfigPanel {...defaultProps} config={openaiConfig} />)
    
    // Expand the panel
    const header = screen.getByText('Configuration').closest('div')
    if (header?.parentElement) {
      fireEvent.click(header.parentElement)
    }

    const modelSelect = container.querySelector('#model') as HTMLSelectElement
    const options = Array.from(modelSelect?.options || []).map(opt => opt.value)
    
    expect(options).toContain('gpt-4o')
    expect(options).toContain('gpt-4o-mini')
    expect(options).toContain('gpt-4-turbo')
  })

  it('allows selecting gemini-2.5-flash-lite', () => {
    const onChange = vi.fn()
    const { container } = render(<ConfigPanel {...defaultProps} onChange={onChange} />)
    
    // Expand the panel
    const header = screen.getByText('Configuration').closest('div')
    if (header?.parentElement) {
      fireEvent.click(header.parentElement)
    }

    const modelSelect = container.querySelector('#model') as HTMLSelectElement
    fireEvent.change(modelSelect, { target: { value: 'gemini-2.5-flash-lite' } })

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'gemini-2.5-flash-lite',
      })
    )
  })

  it('displays current provider and model in collapsed state', () => {
    render(<ConfigPanel {...defaultProps} />)
    
    expect(screen.getByText('gemini / gemini-2.5-flash')).toBeInTheDocument()
  })

  it('switches models when provider changes', () => {
    const onChange = vi.fn()
    const { container } = render(<ConfigPanel {...defaultProps} onChange={onChange} />)
    
    // Expand the panel
    const header = screen.getByText('Configuration').closest('div')
    if (header?.parentElement) {
      fireEvent.click(header.parentElement)
    }

    const providerSelect = container.querySelector('#provider') as HTMLSelectElement
    fireEvent.change(providerSelect, { target: { value: 'openai' } })

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'openai',
        model: 'gpt-4o', // First OpenAI model
      })
    )
  })

  it('has exactly 3 Gemini models', () => {
    const { container } = render(<ConfigPanel {...defaultProps} />)
    
    // Expand the panel
    const header = screen.getByText('Configuration').closest('div')
    if (header?.parentElement) {
      fireEvent.click(header.parentElement)
    }

    const modelSelect = container.querySelector('#model') as HTMLSelectElement
    const options = Array.from(modelSelect?.options || [])
    
    expect(options).toHaveLength(3)
  })
})

