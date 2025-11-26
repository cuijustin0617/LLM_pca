/**
 * Test cases for ElegantProgressVisualizer component
 * Testing progress calculation and step updates
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { ElegantProgressVisualizer } from '@/components/features/extraction/ElegantProgressVisualizer'

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}))

// Mock the API
vi.mock('@/lib/api', () => ({
  api: {
    createProgressStream: vi.fn(),
    cancelExtraction: vi.fn(),
  },
}))

describe('ElegantProgressVisualizer', () => {
  let mockEventSource: any

  beforeEach(() => {
    mockEventSource = {
      onmessage: null,
      onerror: null,
      close: vi.fn(),
    }

    const { api } = require('@/lib/api')
    api.createProgressStream.mockReturnValue(mockEventSource)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('renders with initial state showing 5% progress', () => {
    const mockOnComplete = vi.fn()
    const mockOnError = vi.fn()

    render(
      <ElegantProgressVisualizer
        jobId="test-job-123"
        onComplete={mockOnComplete}
        onError={mockOnError}
      />
    )

    expect(screen.getByText('Extraction Progress')).toBeInTheDocument()
    expect(screen.getByText('5% complete')).toBeInTheDocument()
    expect(screen.getByText('Extracting Text from PDF')).toBeInTheDocument()
  })

  it('updates progress to 15% when text extraction completes', async () => {
    const mockOnComplete = vi.fn()
    const mockOnError = vi.fn()

    render(
      <ElegantProgressVisualizer
        jobId="test-job-123"
        onComplete={mockOnComplete}
        onError={mockOnError}
      />
    )

    mockEventSource.onmessage({
      data: JSON.stringify({
        status: 'progress',
        message: 'Extracted text from 256 pages.',
      }),
    })

    await waitFor(() => {
      expect(screen.getByText('15% complete')).toBeInTheDocument()
      expect(screen.getByText('Chunking Content')).toBeInTheDocument()
    })
  })

  it('updates progress to 25% when chunking completes', async () => {
    const mockOnComplete = vi.fn()
    const mockOnError = vi.fn()

    render(
      <ElegantProgressVisualizer
        jobId="test-job-123"
        onComplete={mockOnComplete}
        onError={mockOnError}
      />
    )

    mockEventSource.onmessage({
      data: JSON.stringify({
        status: 'progress',
        message: 'Created 20 chunks using word limit=3500.',
      }),
    })

    await waitFor(() => {
      expect(screen.getByText('25% complete')).toBeInTheDocument()
      expect(screen.getByText('Analyzing with LLM')).toBeInTheDocument()
    })
  })

  it('calculates chunk progress correctly (50% of chunks = 55% total)', async () => {
    const mockOnComplete = vi.fn()
    const mockOnError = vi.fn()

    render(
      <ElegantProgressVisualizer
        jobId="test-job-123"
        onComplete={mockOnComplete}
        onError={mockOnError}
      />
    )

    mockEventSource.onmessage({
      data: JSON.stringify({
        status: 'progress',
        message: 'Processing pages 1 to 20 by LLM (chunk 5/10)',
      }),
    })

    await waitFor(() => {
      // 25% base + (5/10 * 60%) = 25 + 30 = 55%
      expect(screen.getByText('55% complete')).toBeInTheDocument()
      expect(screen.getByText('Chunk 5 of 10')).toBeInTheDocument()
    })
  })

  it('calculates chunk progress correctly (10/10 chunks = 85% total)', async () => {
    const mockOnComplete = vi.fn()
    const mockOnError = vi.fn()

    render(
      <ElegantProgressVisualizer
        jobId="test-job-123"
        onComplete={mockOnComplete}
        onError={mockOnError}
      />
    )

    mockEventSource.onmessage({
      data: JSON.stringify({
        status: 'progress',
        message: 'Processing pages 240 to 256 by LLM (chunk 10/10)',
      }),
    })

    await waitFor(() => {
      // 25% base + (10/10 * 60%) = 25 + 60 = 85%
      expect(screen.getByText('85% complete')).toBeInTheDocument()
      expect(screen.getByText('Chunk 10 of 10')).toBeInTheDocument()
    })
  })

  it('updates progress to 90% when compiling starts', async () => {
    const mockOnComplete = vi.fn()
    const mockOnError = vi.fn()

    render(
      <ElegantProgressVisualizer
        jobId="test-job-123"
        onComplete={mockOnComplete}
        onError={mockOnError}
      />
    )

    mockEventSource.onmessage({
      data: JSON.stringify({
        status: 'progress',
        message: 'Compiling all rows from chunks...',
      }),
    })

    await waitFor(() => {
      expect(screen.getByText('90% complete')).toBeInTheDocument()
      expect(screen.getByText('Compiling Results')).toBeInTheDocument()
    })
  })

  it('updates progress to 95% when saving', async () => {
    const mockOnComplete = vi.fn()
    const mockOnError = vi.fn()

    render(
      <ElegantProgressVisualizer
        jobId="test-job-123"
        onComplete={mockOnComplete}
        onError={mockOnError}
      />
    )

    mockEventSource.onmessage({
      data: JSON.stringify({
        status: 'progress',
        message: 'Saving final results...',
      }),
    })

    await waitFor(() => {
      expect(screen.getByText('95% complete')).toBeInTheDocument()
    })
  })

  it('reaches 100% on completion', async () => {
    const mockOnComplete = vi.fn()
    const mockOnError = vi.fn()

    render(
      <ElegantProgressVisualizer
        jobId="test-job-123"
        onComplete={mockOnComplete}
        onError={mockOnError}
      />
    )

    const completionData = {
      status: 'complete',
      experiment_dir: '/path/to/exp',
      rows: [{ id: 1 }],
    }

    mockEventSource.onmessage({ data: JSON.stringify(completionData) })

    await waitFor(() => {
      expect(screen.getByText('100% complete')).toBeInTheDocument()
      expect(mockOnComplete).toHaveBeenCalledWith(completionData)
    })
  })

  it('shows all 4 steps in correct order', () => {
    const mockOnComplete = vi.fn()
    const mockOnError = vi.fn()

    render(
      <ElegantProgressVisualizer
        jobId="test-job-123"
        onComplete={mockOnComplete}
        onError={mockOnError}
      />
    )

    const steps = [
      'Extracting Text from PDF',
      'Chunking Content',
      'Analyzing with LLM',
      'Compiling Results',
    ]

    steps.forEach((step) => {
      expect(screen.getByText(step)).toBeInTheDocument()
    })
  })

  it('handles cancellation correctly', async () => {
    const mockOnComplete = vi.fn()
    const mockOnError = vi.fn()
    const mockOnCancel = vi.fn()

    render(
      <ElegantProgressVisualizer
        jobId="test-job-123"
        onComplete={mockOnComplete}
        onError={mockOnError}
        onCancel={mockOnCancel}
      />
    )

    mockEventSource.onmessage({
      data: JSON.stringify({
        status: 'cancelled',
        message: 'Extraction cancelled',
      }),
    })

    await waitFor(() => {
      expect(screen.getByText('Extraction cancelled by user')).toBeInTheDocument()
      expect(mockOnCancel).toHaveBeenCalled()
    })
  })

  it('handles errors correctly', async () => {
    const mockOnComplete = vi.fn()
    const mockOnError = vi.fn()

    render(
      <ElegantProgressVisualizer
        jobId="test-job-123"
        onComplete={mockOnComplete}
        onError={mockOnError}
      />
    )

    mockEventSource.onmessage({
      data: JSON.stringify({
        status: 'error',
        message: 'API key invalid',
      }),
    })

    await waitFor(() => {
      expect(mockOnError).toHaveBeenCalledWith('API key invalid')
    })
  })
})

