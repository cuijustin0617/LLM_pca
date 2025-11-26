import { describe, it, expect, beforeEach, vi } from 'vitest'
import { storage } from '@/lib/storage'

describe('Storage', () => {
  beforeEach(() => {
    // Clear storage before each test
    sessionStorage.clear()
    localStorage.clear()
  })

  describe('API Keys', () => {
    it('should store and retrieve OpenAI key', () => {
      storage.setOpenAIKey('test-key')
      expect(storage.getOpenAIKey()).toBe('test-key')
    })

    it('should store and retrieve Gemini key', () => {
      storage.setGeminiKey('test-gemini-key')
      expect(storage.getGeminiKey()).toBe('test-gemini-key')
    })

    it('should clear all keys', () => {
      storage.setOpenAIKey('key1')
      storage.setGeminiKey('key2')
      storage.clearKeys()
      expect(storage.getOpenAIKey()).toBeNull()
      expect(storage.getGeminiKey()).toBeNull()
    })

    it('should return null for non-existent keys', () => {
      expect(storage.getOpenAIKey()).toBeNull()
      expect(storage.getGeminiKey()).toBeNull()
    })
  })

  describe('Config', () => {
    it('should store and retrieve provider', () => {
      storage.setProvider('openai')
      expect(storage.getProvider()).toBe('openai')
    })

    it('should store and retrieve model', () => {
      storage.setModel('gpt-4o')
      expect(storage.getModel()).toBe('gpt-4o')
    })

    it('should store and retrieve temperature', () => {
      storage.setTemperature(0.5)
      expect(storage.getTemperature()).toBe(0.5)
    })

    it('should store and retrieve chunk size', () => {
      storage.setChunkSize(4000)
      expect(storage.getChunkSize()).toBe(4000)
    })

    it('should persist config across sessions', () => {
      storage.setProvider('gemini')
      expect(localStorage.getItem('pca_provider')).toBe('gemini')
    })
  })

  describe('Prompt Versions', () => {
    it('should store and retrieve prompt versions', () => {
      const versions = [
        { id: 'v1', name: 'Version 1', content: 'test prompt', createdAt: '2024-01-01', active: true }
      ]
      storage.setPromptVersions(versions)
      expect(storage.getPromptVersions()).toEqual(versions)
    })

    it('should store and retrieve active prompt', () => {
      storage.setActivePrompt('test active prompt')
      expect(storage.getActivePrompt()).toBe('test active prompt')
    })

    it('should return null for non-existent prompt versions', () => {
      expect(storage.getPromptVersions()).toBeNull()
      expect(storage.getActivePrompt()).toBeNull()
    })

    it('should persist prompt data across sessions', () => {
      const versions = [{ id: 'v1', name: 'Test', content: 'test', createdAt: '2024-01-01', active: true }]
      storage.setPromptVersions(versions)
      expect(localStorage.getItem('pca_prompt_versions')).toBeTruthy()
    })
  })
})

