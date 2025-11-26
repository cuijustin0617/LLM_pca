import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { EditablePCATable } from '@/components/features/extraction/EditablePCATable'

describe('Empty State Edge Cases', () => {
  it('should handle empty rows array', () => {
    render(<EditablePCATable rows={[]} onChange={vi.fn()} />)
    expect(screen.getByText(/No rows yet/i)).toBeInTheDocument()
  })

  it('should handle undefined onChange', () => {
    const { container } = render(
      <EditablePCATable rows={[]} onChange={vi.fn()} />
    )
    expect(container).toBeInTheDocument()
  })

  it('should handle missing optional props', () => {
    render(<EditablePCATable rows={[]} onChange={vi.fn()} />)
    expect(screen.getByText(/Add Row/i)).toBeInTheDocument()
  })

  it('should render when isDirty is false', () => {
    render(<EditablePCATable rows={[]} onChange={vi.fn()} isDirty={false} />)
    expect(screen.queryByText(/unsaved changes/i)).not.toBeInTheDocument()
  })

  it('should show dirty indicator when isDirty is true', () => {
    render(<EditablePCATable rows={[]} onChange={vi.fn()} isDirty={true} />)
    expect(screen.getByText(/unsaved changes/i)).toBeInTheDocument()
  })

  it('should handle null pca_number', () => {
    const rows = [{
      pca_identifier: 1,
      address: 'Test',
      location_relation_to_site: 'On-Site',
      pca_number: null,
      pca_name: 'Test',
      description_timeline: 'Test',
      source_pages: '1',
    }]
    render(<EditablePCATable rows={rows} onChange={vi.fn()} />)
    expect(screen.getByText('-')).toBeInTheDocument()
  })

  it('should handle empty strings', () => {
    const rows = [{
      pca_identifier: 1,
      address: '',
      location_relation_to_site: 'On-Site',
      pca_number: null,
      pca_name: '',
      description_timeline: '',
      source_pages: '',
    }]
    render(<EditablePCATable rows={rows} onChange={vi.fn()} />)
    expect(screen.getByText('1')).toBeInTheDocument()
  })

  it('should handle very long strings', () => {
    const longString = 'A'.repeat(500)
    const rows = [{
      pca_identifier: 1,
      address: longString,
      location_relation_to_site: 'On-Site',
      pca_number: 1,
      pca_name: longString,
      description_timeline: longString,
      source_pages: '1',
    }]
    render(<EditablePCATable rows={rows} onChange={vi.fn()} />)
    expect(screen.getAllByTitle(longString)).toHaveLength(3)
  })

  it('should handle special characters', () => {
    const specialString = '!@#$%^&*()_+-=[]{}|;:\'",.<>?/~`'
    const rows = [{
      pca_identifier: 1,
      address: specialString,
      location_relation_to_site: 'On-Site',
      pca_number: 1,
      pca_name: specialString,
      description_timeline: specialString,
      source_pages: '1',
    }]
    render(<EditablePCATable rows={rows} onChange={vi.fn()} />)
    expect(screen.getAllByTitle(specialString)).toBeTruthy()
  })

  it('should handle unicode characters', () => {
    const unicodeString = '你好世界 🌍 émojis'
    const rows = [{
      pca_identifier: 1,
      address: unicodeString,
      location_relation_to_site: 'On-Site',
      pca_number: 1,
      pca_name: unicodeString,
      description_timeline: unicodeString,
      source_pages: '1',
    }]
    render(<EditablePCATable rows={rows} onChange={vi.fn()} />)
    expect(screen.getAllByTitle(unicodeString)).toBeTruthy()
  })
})

