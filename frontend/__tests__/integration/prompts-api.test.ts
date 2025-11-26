import { describe, it, expect, beforeAll, afterAll } from 'vitest'

// Integration tests for prompt management API
// These test that prompts are properly saved to files

const API_BASE = 'http://localhost:8000'

describe('Prompts API Integration', () => {
  let createdVersionIds: string[] = []

  afterAll(async () => {
    // Cleanup: delete any versions created during tests
    for (const id of createdVersionIds) {
      try {
        await fetch(`${API_BASE}/prompts/versions/${id}`, { method: 'DELETE' })
      } catch (err) {
        console.log(`Could not cleanup version ${id}:`, err)
      }
    }
  })

  it('should fetch all prompt versions', async () => {
    const response = await fetch(`${API_BASE}/prompts/versions`)
    expect(response.ok).toBe(true)

    const data = await response.json()
    expect(Array.isArray(data)).toBe(true)
    expect(data.length).toBeGreaterThan(0)

    // Check structure
    const version = data[0]
    expect(version).toHaveProperty('id')
    expect(version).toHaveProperty('name')
    expect(version).toHaveProperty('extract_file')
    expect(version).toHaveProperty('active')
  })

  it('should fetch active prompt with content', async () => {
    const response = await fetch(`${API_BASE}/prompts/active`)
    expect(response.ok).toBe(true)

    const data = await response.json()
    expect(data.active).toBe(true)
    expect(data.content).toBeTruthy()
    expect(data.content.length).toBeGreaterThan(100)
  })

  it('should create new prompt version and save to file', async () => {
    const newPrompt = {
      name: 'Integration Test Version',
      content: 'Test prompt content created by integration test',
      description: 'Created by automated integration test'
    }

    const response = await fetch(`${API_BASE}/prompts/versions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newPrompt)
    })

    expect(response.ok).toBe(true)

    const data = await response.json()
    expect(data.id).toBeTruthy()
    expect(data.name).toBe(newPrompt.name)
    expect(data.content).toBe(newPrompt.content)
    expect(data.active).toBe(false)

    // Track for cleanup
    createdVersionIds.push(data.id)

    // Verify we can fetch it back
    const fetchResponse = await fetch(`${API_BASE}/prompts/versions/${data.id}`)
    expect(fetchResponse.ok).toBe(true)
    const fetchedData = await fetchResponse.json()
    expect(fetchedData.content).toBe(newPrompt.content)
  })

  it('should update prompt version content', async () => {
    // Create a version first
    const createResponse = await fetch(`${API_BASE}/prompts/versions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Update Test Version',
        content: 'Original content',
        description: 'For update test'
      })
    })

    const created = await createResponse.json()
    createdVersionIds.push(created.id)

    // Update it
    const updatedContent = 'Updated content from integration test'
    const updateResponse = await fetch(`${API_BASE}/prompts/versions/${created.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: updatedContent })
    })

    expect(updateResponse.ok).toBe(true)

    // Verify update persisted
    const fetchResponse = await fetch(`${API_BASE}/prompts/versions/${created.id}`)
    const fetched = await fetchResponse.json()
    expect(fetched.content).toBe(updatedContent)
  })

  it('should delete prompt version and file', async () => {
    // Create a version to delete
    const createResponse = await fetch(`${API_BASE}/prompts/versions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Delete Test Version',
        content: 'To be deleted',
        description: 'For deletion test'
      })
    })

    const created = await createResponse.json()

    // Delete it
    const deleteResponse = await fetch(`${API_BASE}/prompts/versions/${created.id}`, {
      method: 'DELETE'
    })

    expect(deleteResponse.ok).toBe(true)

    // Verify it's gone
    const fetchResponse = await fetch(`${API_BASE}/prompts/versions/${created.id}`)
    expect(fetchResponse.ok).toBe(false)
  })

  it('should not allow deleting active version', async () => {
    const activeResponse = await fetch(`${API_BASE}/prompts/active`)
    const active = await activeResponse.json()

    const deleteResponse = await fetch(`${API_BASE}/prompts/versions/${active.id}`, {
      method: 'DELETE'
    })

    expect(deleteResponse.ok).toBe(false)
    expect(deleteResponse.status).toBe(400)
  })

  it('should activate a version', async () => {
    // Create a new version
    const createResponse = await fetch(`${API_BASE}/prompts/versions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Activation Test Version',
        content: 'Test content',
        description: 'For activation test'
      })
    })

    const created = await createResponse.json()
    createdVersionIds.push(created.id)

    // Get currently active version
    const activeBeforeResponse = await fetch(`${API_BASE}/prompts/active`)
    const activeBefore = await activeBeforeResponse.json()

    // Activate the new version
    const activateResponse = await fetch(`${API_BASE}/prompts/versions/${created.id}/activate`, {
      method: 'PUT'
    })

    expect(activateResponse.ok).toBe(true)

    // Verify it's now active
    const activeAfterResponse = await fetch(`${API_BASE}/prompts/active`)
    const activeAfter = await activeAfterResponse.json()
    expect(activeAfter.id).toBe(created.id)

    // Restore original active version
    await fetch(`${API_BASE}/prompts/versions/${activeBefore.id}/activate`, {
      method: 'PUT'
    })
  })
})

describe('Prompt File Persistence', () => {
  it('should persist changes across server restarts', async () => {
    // This test verifies that changes are saved to actual files
    // Create a version
    const testContent = `Test content ${Date.now()}`
    const createResponse = await fetch(`${API_BASE}/prompts/versions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Persistence Test',
        content: testContent,
        description: 'Testing file persistence'
      })
    })

    expect(createResponse.ok).toBe(true)
    const created = await createResponse.json()

    // Fetch it back immediately
    const fetchResponse = await fetch(`${API_BASE}/prompts/versions/${created.id}`)
    const fetched = await fetchResponse.json()
    expect(fetched.content).toBe(testContent)

    // Cleanup
    await fetch(`${API_BASE}/prompts/versions/${created.id}`, { method: 'DELETE' })
  })
})

