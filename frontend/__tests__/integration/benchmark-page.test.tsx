/**
 * Test cases for Benchmark page
 * Testing project loading and ground truth filtering
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import BenchmarkPage from '@/app/benchmark/page'

// Mock the API
vi.mock('@/lib/api', () => ({
  api: {
    getExperiments: vi.fn(),
    getProjects: vi.fn(),
    runBenchmark: vi.fn(),
  },
}))

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => ({
    get: vi.fn(),
  }),
  usePathname: () => '/benchmark',
}))

describe('BenchmarkPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders benchmark page', async () => {
    const { api } = require('@/lib/api')
    api.getExperiments.mockResolvedValue({ experiments: [], total: 0 })
    api.getProjects.mockResolvedValue([])

    render(<BenchmarkPage />)

    await waitFor(() => {
      expect(screen.getByText('Benchmark Experiments')).toBeInTheDocument()
    })
  })

  it('loads and displays projects with ground truth', async () => {
    const { api } = require('@/lib/api')
    api.getExperiments.mockResolvedValue({ experiments: [], total: 0 })
    api.getProjects.mockResolvedValue([
      {
        id: 'project-1',
        name: 'Project 1',
        ground_truth_file: '/path/to/gt.csv',
        eris_file: '/path/to/eris.pdf',
        created_at: '2025-01-01T00:00:00',
        experiment_count: 0,
      },
      {
        id: 'project-2',
        name: 'Project 2',
        ground_truth_file: null,
        eris_file: '/path/to/eris2.pdf',
        created_at: '2025-01-02T00:00:00',
        experiment_count: 0,
      },
    ])

    render(<BenchmarkPage />)

    await waitFor(() => {
      // Should show project with GT
      expect(screen.getByText('Project 1')).toBeInTheDocument()
      // Should NOT show project without GT
      expect(screen.queryByText('Project 2')).not.toBeInTheDocument()
    })
  })

  it('filters out projects with "None" as ground truth', async () => {
    const { api } = require('@/lib/api')
    api.getExperiments.mockResolvedValue({ experiments: [], total: 0 })
    api.getProjects.mockResolvedValue([
      {
        id: 'project-1',
        name: 'Valid Project',
        ground_truth_file: '/path/to/gt.csv',
        eris_file: '/path/to/eris.pdf',
        created_at: '2025-01-01T00:00:00',
        experiment_count: 0,
      },
      {
        id: 'project-2',
        name: 'Invalid Project',
        ground_truth_file: 'None', // String "None" should be filtered
        eris_file: '/path/to/eris2.pdf',
        created_at: '2025-01-02T00:00:00',
        experiment_count: 0,
      },
    ])

    render(<BenchmarkPage />)

    await waitFor(() => {
      expect(screen.getByText('Valid Project')).toBeInTheDocument()
      expect(screen.queryByText('Invalid Project')).not.toBeInTheDocument()
    })
  })

  it('shows helpful message when no projects with ground truth', async () => {
    const { api } = require('@/lib/api')
    api.getExperiments.mockResolvedValue({ experiments: [], total: 0 })
    api.getProjects.mockResolvedValue([
      {
        id: 'project-1',
        name: 'Project Without GT',
        ground_truth_file: null,
        eris_file: '/path/to/eris.pdf',
        created_at: '2025-01-01T00:00:00',
        experiment_count: 0,
      },
    ])

    render(<BenchmarkPage />)

    await waitFor(() => {
      expect(screen.getByText('No Ground Truth Projects Found')).toBeInTheDocument()
      expect(screen.getByText(/To run benchmarks, you need projects with ground truth/)).toBeInTheDocument()
    })
  })

  it('handles experiments response as object with experiments array', async () => {
    const { api } = require('@/lib/api')
    api.getExperiments.mockResolvedValue({
      experiments: [
        {
          id: 'exp_001',
          project_id: 'project-1',
          project_name: 'Test Project',
          created_at: '2025-01-01T00:00:00',
          config: { provider: 'openai', model: 'gpt-4o', chunk_size: 3500, temperature: 0.0 },
          rows_extracted: 10,
          status: 'complete',
          experiment_dir: '/path/to/exp',
        },
      ],
      total: 1,
    })
    api.getProjects.mockResolvedValue([])

    render(<BenchmarkPage />)

    await waitFor(() => {
      expect(screen.getByText(/exp_001/)).toBeInTheDocument()
    })
  })

  it('handles experiments response as direct array (backwards compatibility)', async () => {
    const { api } = require('@/lib/api')
    api.getExperiments.mockResolvedValue([
      {
        id: 'exp_002',
        project_id: 'project-1',
        project_name: 'Test Project',
        created_at: '2025-01-01T00:00:00',
        config: { provider: 'gemini', model: 'gemini-2.5-flash', chunk_size: 3500, temperature: 0.0 },
        rows_extracted: 15,
        status: 'complete',
        experiment_dir: '/path/to/exp',
      },
    ])
    api.getProjects.mockResolvedValue([])

    render(<BenchmarkPage />)

    await waitFor(() => {
      expect(screen.getByText(/exp_002/)).toBeInTheDocument()
    })
  })

  it('handles API errors gracefully', async () => {
    const { api } = require('@/lib/api')
    api.getExperiments.mockRejectedValue(new Error('API Error'))
    api.getProjects.mockRejectedValue(new Error('API Error'))

    render(<BenchmarkPage />)

    await waitFor(() => {
      // Should still render without crashing
      expect(screen.getByText('Benchmark Experiments')).toBeInTheDocument()
      // Should show empty state
      expect(screen.getByText('No Ground Truth Projects Found')).toBeInTheDocument()
    })
  })

  it('disables project select when no projects available', async () => {
    const { api } = require('@/lib/api')
    api.getExperiments.mockResolvedValue({ experiments: [], total: 0 })
    api.getProjects.mockResolvedValue([])

    render(<BenchmarkPage />)

    await waitFor(() => {
      const select = screen.getByRole('combobox', { name: /ground truth project/i })
      expect(select).toBeDisabled()
    })
  })

  it('enables project select when projects are available', async () => {
    const { api } = require('@/lib/api')
    api.getExperiments.mockResolvedValue({ experiments: [], total: 0 })
    api.getProjects.mockResolvedValue([
      {
        id: 'project-1',
        name: 'Project 1',
        ground_truth_file: '/path/to/gt.csv',
        eris_file: '/path/to/eris.pdf',
        created_at: '2025-01-01T00:00:00',
        experiment_count: 0,
      },
    ])

    render(<BenchmarkPage />)

    await waitFor(() => {
      const select = screen.getByRole('combobox', { name: /ground truth project/i })
      expect(select).not.toBeDisabled()
    })
  })
})

