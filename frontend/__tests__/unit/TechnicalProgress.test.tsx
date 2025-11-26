/**
 * Test cases for technical progress messages and per-chunk updates
 * Testing new technical terminology and incremental progress
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
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

describe('Technical Progress Messages', () => {
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

  it('shows technical step labels', () => {
    render(
      <ElegantProgressVisualizer
        jobId="test-job"
        onComplete={vi.fn()}
        onError={vi.fn()}
      />
    )

    expect(screen.getByText('Parsing PDF & Extracting Raw Text')).toBeInTheDocument()
    expect(screen.getByText('Tokenizing & Chunking Document')).toBeInTheDocument()
    expect(screen.getByText('LLM Analysis & PCA Extraction')).toBeInTheDocument()
    expect(screen.getByText('Deduplication & Data Compilation')).toBeInTheDocument()
  })

  it('updates progress incrementally per chunk', async () => {
    render(
      <ElegantProgressVisualizer
        jobId="test-job"
        onComplete={vi.fn()}
        onError={vi.fn()}
      />
    )

    // Simulate chunk 1/10 completion
    mockEventSource.onmessage({
      data: JSON.stringify({
        status: 'progress',
        message: 'Processing pages 1 to 20 by LLM (chunk 1/10) - found 5 potential PCAs',
      }),
    })

    await waitFor(() => {
      // 20% base + (1/10 * 55%) = 20 + 5.5 = 25.5%
      expect(screen.getByText(/25% complete/)).toBeInTheDocument()
    })

    // Simulate chunk 5/10 completion
    mockEventSource.onmessage({
      data: JSON.stringify({
        status: 'progress',
        message: 'Processing pages 100 to 120 by LLM (chunk 5/10) - found 8 potential PCAs',
      }),
    })

    await waitFor(() => {
      // 20% base + (5/10 * 55%) = 20 + 27.5 = 47.5%
      expect(screen.getByText(/47% complete/)).toBeInTheDocument()
    })
  })

  it('displays PCA count from each chunk', async () => {
    render(
      <ElegantProgressVisualizer
        jobId="test-job"
        onComplete={vi.fn()}
        onError={vi.fn()}
      />
    )

    mockEventSource.onmessage({
      data: JSON.stringify({
        status: 'progress',
        message: 'Processing pages 1 to 20 by LLM (chunk 1/10) - found 12 potential PCAs',
      }),
    })

    await waitFor(() => {
      expect(screen.getByText(/12 PCAs extracted/)).toBeInTheDocument()
    })
  })

  it('accumulates total PCAs across chunks', async () => {
    render(
      <ElegantProgressVisualizer
        jobId="test-job"
        onComplete={vi.fn()}
        onError={vi.fn()}
      />
    )

    // First chunk: 5 PCAs
    mockEventSource.onmessage({
      data: JSON.stringify({
        status: 'progress',
        message: 'Processing pages 1 to 20 by LLM (chunk 1/10) - found 5 potential PCAs',
      }),
    })

    await waitFor(() => {
      expect(screen.getByText(/5 PCAs extracted/)).toBeInTheDocument()
    })

    // Second chunk: 8 more PCAs (total 13)
    mockEventSource.onmessage({
      data: JSON.stringify({
        status: 'progress',
        message: 'Processing pages 21 to 40 by LLM (chunk 2/10) - found 8 potential PCAs',
      }),
    })

    await waitFor(() => {
      expect(screen.getByText(/13 PCAs extracted/)).toBeInTheDocument()
    })
  })

  it('shows deduplication message during compile step', async () => {
    render(
      <ElegantProgressVisualizer
        jobId="test-job"
        onComplete={vi.fn()}
        onError={vi.fn()}
      />
    )

    mockEventSource.onmessage({
      data: JSON.stringify({
        status: 'progress',
        message: 'Compiling all rows...',
      }),
    })

    await waitFor(() => {
      expect(screen.getByText(/Scanning through all entries, removing duplicates/)).toBeInTheDocument()
    })
  })

  it('shows progress at 80% when compiling starts', async () => {
    render(
      <ElegantProgressVisualizer
        jobId="test-job"
        onComplete={vi.fn()}
        onError={vi.fn()}
      />
    )

    mockEventSource.onmessage({
      data: JSON.stringify({
        status: 'progress',
        message: 'Compiling all rows...',
      }),
    })

    await waitFor(() => {
      expect(screen.getByText(/80% complete/)).toBeInTheDocument()
    })
  })

  it('calls onProgressUpdate callback with live data', async () => {
    const mockProgressUpdate = vi.fn()
    
    render(
      <ElegantProgressVisualizer
        jobId="test-job"
        onComplete={vi.fn()}
        onError={vi.fn()}
        onProgressUpdate={mockProgressUpdate}
      />
    )

    const testRows = [{ id: 1, pca_number: 'PCA-001' }]
    
    mockEventSource.onmessage({
      data: JSON.stringify({
        status: 'progress',
        message: 'Processing pages 1 to 20 by LLM (chunk 1/10) - found 1 potential PCAs',
        rows: testRows,
      }),
    })

    await waitFor(() => {
      expect(mockProgressUpdate).toHaveBeenCalledWith(testRows)
    })
  })
})

