/**
 * Local storage utilities for managing session-based data
 */

const STORAGE_KEYS = {
  OPENAI_KEY: 'pca_openai_key',
  GEMINI_KEY: 'pca_gemini_key',
  PROVIDER: 'pca_provider',
  MODEL: 'pca_model',
  TEMPERATURE: 'pca_temperature',
  CHUNK_SIZE: 'pca_chunk_size',
  PROMPT_VERSIONS: 'pca_prompt_versions',
  ACTIVE_PROMPT: 'pca_active_prompt',
} as const

export const storage = {
  // API Keys (session only, cleared on close)
  setOpenAIKey: (key: string) => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(STORAGE_KEYS.OPENAI_KEY, key)
    }
  },
  
  getOpenAIKey: (): string | null => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem(STORAGE_KEYS.OPENAI_KEY)
    }
    return null
  },
  
  setGeminiKey: (key: string) => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(STORAGE_KEYS.GEMINI_KEY, key)
    }
  },
  
  getGeminiKey: (): string | null => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem(STORAGE_KEYS.GEMINI_KEY)
    }
    return null
  },
  
  clearKeys: () => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(STORAGE_KEYS.OPENAI_KEY)
      sessionStorage.removeItem(STORAGE_KEYS.GEMINI_KEY)
    }
  },
  
  // Extraction config (persistent)
  setProvider: (provider: string) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.PROVIDER, provider)
    }
  },
  
  getProvider: (): string | null => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(STORAGE_KEYS.PROVIDER)
    }
    return null
  },
  
  setModel: (model: string) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.MODEL, model)
    }
  },
  
  getModel: (): string | null => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(STORAGE_KEYS.MODEL)
    }
    return null
  },
  
  setTemperature: (temp: number) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.TEMPERATURE, String(temp))
    }
  },
  
  getTemperature: (): number | null => {
    if (typeof window !== 'undefined') {
      const temp = localStorage.getItem(STORAGE_KEYS.TEMPERATURE)
      return temp ? parseFloat(temp) : null
    }
    return null
  },
  
  setChunkSize: (size: number) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.CHUNK_SIZE, String(size))
    }
  },
  
  getChunkSize: (): number | null => {
    if (typeof window !== 'undefined') {
      const size = localStorage.getItem(STORAGE_KEYS.CHUNK_SIZE)
      return size ? parseInt(size, 10) : null
    }
    return null
  },
  
  // Prompt versions (persistent)
  setPromptVersions: (versions: any[]) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.PROMPT_VERSIONS, JSON.stringify(versions))
    }
  },
  
  getPromptVersions: (): any[] | null => {
    if (typeof window !== 'undefined') {
      const versions = localStorage.getItem(STORAGE_KEYS.PROMPT_VERSIONS)
      return versions ? JSON.parse(versions) : null
    }
    return null
  },
  
  setActivePrompt: (prompt: string) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_PROMPT, prompt)
    }
  },
  
  getActivePrompt: (): string | null => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(STORAGE_KEYS.ACTIVE_PROMPT)
    }
    return null
  },
}

