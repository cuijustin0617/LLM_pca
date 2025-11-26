import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'

describe('Card Components', () => {
  describe('Card', () => {
    it('should render children', () => {
      render(<Card>Card content</Card>)
      expect(screen.getByText('Card content')).toBeInTheDocument()
    })

    it('should apply custom className', () => {
      const { container } = render(<Card className="custom-class">Content</Card>)
      expect(container.firstChild).toHaveClass('custom-class')
    })
  })

  describe('CardHeader', () => {
    it('should render header content', () => {
      render(<CardHeader>Header</CardHeader>)
      expect(screen.getByText('Header')).toBeInTheDocument()
    })
  })

  describe('CardTitle', () => {
    it('should render title', () => {
      render(<CardTitle>Title</CardTitle>)
      expect(screen.getByText('Title')).toBeInTheDocument()
    })
  })

  describe('CardDescription', () => {
    it('should render description', () => {
      render(<CardDescription>Description</CardDescription>)
      expect(screen.getByText('Description')).toBeInTheDocument()
    })
  })

  describe('CardContent', () => {
    it('should render content', () => {
      render(<CardContent>Content</CardContent>)
      expect(screen.getByText('Content')).toBeInTheDocument()
    })
  })

  describe('CardFooter', () => {
    it('should render footer', () => {
      render(<CardFooter>Footer</CardFooter>)
      expect(screen.getByText('Footer')).toBeInTheDocument()
    })
  })

  it('should render complete card structure', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Test Card</CardTitle>
          <CardDescription>Test Description</CardDescription>
        </CardHeader>
        <CardContent>Main content</CardContent>
        <CardFooter>Footer content</CardFooter>
      </Card>
    )

    expect(screen.getByText('Test Card')).toBeInTheDocument()
    expect(screen.getByText('Test Description')).toBeInTheDocument()
    expect(screen.getByText('Main content')).toBeInTheDocument()
    expect(screen.getByText('Footer content')).toBeInTheDocument()
  })
})

