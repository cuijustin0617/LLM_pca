import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

describe('Color Palette Integration', () => {
  it('Button default variant uses navy-dark background', () => {
    const { container } = render(<Button>Test</Button>)
    const button = container.querySelector('button')
    expect(button).toBeTruthy()
    expect(button?.style.backgroundColor).toContain('var(--navy-dark)')
  })

  it('Button destructive variant uses burgundy-dark background', () => {
    const { container } = render(<Button variant="destructive">Delete</Button>)
    const button = container.querySelector('button')
    expect(button).toBeTruthy()
    expect(button?.style.backgroundColor).toContain('var(--burgundy-dark)')
  })

  it('Button link variant uses navy-dark text color', () => {
    const { container } = render(<Button variant="link">Link</Button>)
    const button = container.querySelector('button')
    expect(button).toBeTruthy()
    expect(button?.style.color).toContain('var(--navy-dark)')
  })

  it('Badge default variant uses cream background', () => {
    const { container } = render(<Badge>Default</Badge>)
    const badge = container.querySelector('div')
    expect(badge).toBeTruthy()
    expect(badge?.style.backgroundColor).toContain('var(--cream)')
  })

  it('Badge success variant uses navy-dark background', () => {
    const { container } = render(<Badge variant="success">Success</Badge>)
    const badge = container.querySelector('div')
    expect(badge).toBeTruthy()
    expect(badge?.style.backgroundColor).toContain('var(--navy-dark)')
  })

  it('Badge error variant uses burgundy-dark background', () => {
    const { container } = render(<Badge variant="error">Error</Badge>)
    const badge = container.querySelector('div')
    expect(badge).toBeTruthy()
    expect(badge?.style.backgroundColor).toContain('var(--burgundy-dark)')
  })

  it('Badge warning variant uses cream background with burgundy text', () => {
    const { container } = render(<Badge variant="warning">Warning</Badge>)
    const badge = container.querySelector('div')
    expect(badge).toBeTruthy()
    expect(badge?.style.backgroundColor).toContain('var(--cream)')
    expect(badge?.style.color).toContain('var(--burgundy-dark)')
  })

  it('No basic blue colors are used', () => {
    const { container: buttonContainer } = render(<Button>Test</Button>)
    const { container: badgeContainer } = render(<Badge>Test</Badge>)
    
    const buttonHTML = buttonContainer.innerHTML
    const badgeHTML = badgeContainer.innerHTML
    
    // Check for basic Tailwind blue classes
    expect(buttonHTML).not.toMatch(/bg-blue-[0-9]/)
    expect(buttonHTML).not.toMatch(/text-blue-[0-9]/)
    expect(badgeHTML).not.toMatch(/bg-blue-[0-9]/)
    expect(badgeHTML).not.toMatch(/text-blue-[0-9]/)
  })

  it('No basic green colors are used', () => {
    const { container: buttonContainer } = render(<Button>Test</Button>)
    const { container: badgeContainer } = render(<Badge>Test</Badge>)
    
    const buttonHTML = buttonContainer.innerHTML
    const badgeHTML = badgeContainer.innerHTML
    
    expect(buttonHTML).not.toMatch(/bg-green-[0-9]/)
    expect(buttonHTML).not.toMatch(/text-green-[0-9]/)
    expect(badgeHTML).not.toMatch(/bg-green-[0-9]/)
    expect(badgeHTML).not.toMatch(/text-green-[0-9]/)
  })

  it('No basic red colors are used', () => {
    const { container: buttonContainer } = render(<Button variant="destructive">Delete</Button>)
    const { container: badgeContainer } = render(<Badge variant="error">Error</Badge>)
    
    const buttonHTML = buttonContainer.innerHTML
    const badgeHTML = badgeContainer.innerHTML
    
    expect(buttonHTML).not.toMatch(/bg-red-[0-9]/)
    expect(buttonHTML).not.toMatch(/text-red-[0-9]/)
    expect(badgeHTML).not.toMatch(/bg-red-[0-9]/)
    expect(badgeHTML).not.toMatch(/text-red-[0-9]/)
  })

  it('No purple colors are used', () => {
    const { container } = render(
      <div>
        <Button>Test</Button>
        <Badge>Badge</Badge>
      </div>
    )
    
    const html = container.innerHTML
    expect(html).not.toMatch(/bg-purple-[0-9]/)
    expect(html).not.toMatch(/text-purple-[0-9]/)
  })
})

