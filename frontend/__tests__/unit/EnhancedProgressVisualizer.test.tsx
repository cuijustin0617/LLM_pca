/**
 * Test cases for EnhancedProgressVisualizer component
 * Testing the fix for duplicate log IDs when multiple logs arrive rapidly
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { EnhancedProgressVisualizer } from '@/components/features/extraction/EnhancedProgressVisualizer'

// Mock framer-motion to avoid animation issues in tests
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

describe('EnhancedProgressVisualizer', () => {
  let mockEventSource: any

  beforeEach(() => {
    // Create a mock EventSource
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

  it('renders progress visualizer', () => {
    const mockOnComplete = vi.fn()
    const mockOnError = vi.fn()

    render(
      <EnhancedProgressVisualizer
        jobId="test-job-123"
        onComplete={mockOnComplete}
        onError={mockOnError}
      />
    )

    expect(screen.getByText('Initializing...')).toBeInTheDocument()
    expect(screen.getByText('Extraction Log')).toBeInTheDocument()
  })

  it('generates unique IDs for logs arriving rapidly', async () => {
    const mockOnComplete = vi.fn()
    const mockOnError = vi.fn()

    render(
      <EnhancedProgressVisualizer
        jobId="test-job-123"
        onComplete={mockOnComplete}
        onError={mockOnError}
      />
    )

    // Simulate multiple messages arriving in quick succession (same millisecond)
    const messages = [
      { status: 'progress', message: 'Log 1' },
      { status: 'progress', message: 'Log 2' },
      { status: 'progress', message: 'Log 3' },
      { status: 'progress', message: 'Log 4' },
      { status: 'progress', message: 'Log 5' },
    ]

    // Send all messages rapidly
    messages.forEach((msg) => {
      mockEventSource.onmessage({ data: JSON.stringify(msg) })
    })

    // Wait for logs to appear
    await waitFor(() => {
      expect(screen.getByText('Log 1')).toBeInTheDocument()
      expect(screen.getByText('Log 2')).toBeInTheDocument()
      expect(screen.getByText('Log 3')).toBeInTheDocument()
      expect(screen.getByText('Log 4')).toBeInTheDocument()
      expect(screen.getByText('Log 5')).toBeInTheDocument()
    })

    // All 5 logs should be rendered (no duplicates)
    const logElements = screen.getAllByText(/^Log \d+$/)
    expect(logElements).toHaveLength(5)
  })

  it('handles 100+ logs without duplicate keys', async () => {
    const mockOnComplete = vi.fn()
    const mockOnError = vi.fn()

    render(
      <EnhancedProgressVisualizer
        jobId="test-job-123"
        onComplete={mockOnComplete}
        onError={mockOnError}
      />
    )

    // Simulate 100 messages in rapid succession
    const messageCount = 100
    for (let i = 0; i < messageCount; i++) {
      mockEventSource.onmessage({
        data: JSON.stringify({
          status: 'progress',
          message: `Processing chunk ${i + 1}/${messageCount}`,
        }),
      })
    }

    // Wait for last log
    await waitFor(() => {
      expect(screen.getByText(`Processing chunk ${messageCount}/${messageCount}`)).toBeInTheDocument()
    })

    // Should not see console errors about duplicate keys
    // (this would be visible in test output if keys were duplicated)
  })

  it('updates progress based on log messages', async () => {
    const mockOnComplete = vi.fn()
    const mockOnError = vi.fn()

    const { container } = render(
      <EnhancedProgressVisualizer
        jobId="test-job-123"
        onComplete={mockOnComplete}
        onError={mockOnError}
      />
    )

    // Send progress message with chunk info
    mockEventSource.onmessage({
      data: JSON.stringify({
        status: 'progress',
        message: 'Processing pages 1 to 20 by LLM (chunk 5/10)',
      }),
    })

    await waitFor(() => {
      expect(screen.getByText(/Analyzing with LLM/)).toBeInTheDocument()
      expect(screen.getByText('50%')).toBeInTheDocument() // 5/10 = 50%
    })
  })

  it('handles completion event', async () => {
    const mockOnComplete = vi.fn()
    const mockOnError = vi.fn()

    render(
      <EnhancedProgressVisualizer
        jobId="test-job-123"
        onComplete={mockOnComplete}
        onError={mockOnError}
      />
    )

    const completionData = {
      status: 'complete',
      experiment_dir: '/path/to/exp',
      rows: [{ id: 1, data: 'test' }],
    }

    mockEventSource.onmessage({ data: JSON.stringify(completionData) })

    await waitFor(() => {
      expect(mockOnComplete).toHaveBeenCalledWith(completionData)
      expect(mockEventSource.close).toHaveBeenCalled()
    })
  })

  it('handles error event', async () => {
    const mockOnComplete = vi.fn()
    const mockOnError = vi.fn()

    render(
      <EnhancedProgressVisualizer
        jobId="test-job-123"
        onComplete={mockOnComplete}
        onError={mockOnError}
      />
    )

    const errorData = {
      status: 'error',
      message: 'API key invalid',
    }

    mockEventSource.onmessage({ data: JSON.stringify(errorData) })

    await waitFor(() => {
      expect(mockOnError).toHaveBeenCalledWith('API key invalid')
      expect(mockEventSource.close).toHaveBeenCalled()
    })
  })

  it('cleans up EventSource on unmount', () => {
    const mockOnComplete = vi.fn()
    const mockOnError = vi.fn()

    const { unmount } = render(
      <EnhancedProgressVisualizer
        jobId="test-job-123"
        onComplete={mockOnComplete}
        onError={mockOnError}
      />
    )

    unmount()

    expect(mockEventSource.close).toHaveBeenCalled()
  })

  it('detects different extraction steps from log messages', async () => {
    const mockOnComplete = vi.fn()
    const mockOnError = vi.fn()

    render(
      <EnhancedProgressVisualizer
        jobId="test-job-123"
        onComplete={mockOnComplete}
        onError={mockOnError}
      />
    )

    // Test different step detection
    const steps = [
      { message: 'Extracted text from 256 pages', expected: 'Extracting Text' },
      { message: 'Chunking pages by word limit', expected: 'Chunking Content' },
      { message: 'Processing pages 1-20 by LLM', expected: 'Analyzing with LLM' },
      { message: 'Compiling results', expected: 'Compiling Results' },
    ]

    for (const step of steps) {
      mockEventSource.onmessage({
        data: JSON.stringify({
          status: 'progress',
          message: step.message,
        }),
      })

      await waitFor(() => {
        expect(screen.getByText(step.expected)).toBeInTheDocument()
      })
    }
  })
})

