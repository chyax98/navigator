import OpenAI from 'openai'

export type AIProvider = 'openai' | 'custom'

export interface AIServiceConfig {
  provider: AIProvider
  apiKey: string
  baseURL?: string
  embeddingModel: string
  chatModel: string
}

function sanitizeProvider(provider?: AIProvider): AIProvider {
  return provider === 'custom' ? 'custom' : 'openai'
}

function resolveBaseURL(provider: AIProvider, baseURL?: string): string | undefined {
  const trimmed = baseURL?.trim()
  if (provider === 'custom') {
    return trimmed && trimmed.length > 0 ? trimmed : undefined
  }
  return trimmed && trimmed.length > 0 ? trimmed : undefined
}

const DEFAULT_EMBEDDING_MODEL = 'text-embedding-3-small'
const DEFAULT_CHAT_MODEL = 'gpt-3.5-turbo'

class AIServiceManager {
  private static instance: AIServiceManager

  private config: AIServiceConfig = {
    provider: 'openai',
    apiKey: '',
    baseURL: undefined,
    embeddingModel: DEFAULT_EMBEDDING_MODEL,
    chatModel: DEFAULT_CHAT_MODEL
  }

  private client: OpenAI | null = null
  private clientSignature: string | null = null

  static getInstance(): AIServiceManager {
    if (!AIServiceManager.instance) {
      AIServiceManager.instance = new AIServiceManager()
    }
    return AIServiceManager.instance
  }

  updateConfig(partial: Partial<AIServiceConfig>): void {
    const provider = sanitizeProvider(partial.provider ?? this.config.provider)
    const apiKey = (partial.apiKey ?? this.config.apiKey ?? '').trim()
    const baseURL = resolveBaseURL(provider, partial.baseURL ?? this.config.baseURL)
    const embeddingModel = (partial.embeddingModel ?? this.config.embeddingModel ?? DEFAULT_EMBEDDING_MODEL).trim() || DEFAULT_EMBEDDING_MODEL
    const chatModel = (partial.chatModel ?? this.config.chatModel ?? DEFAULT_CHAT_MODEL).trim() || DEFAULT_CHAT_MODEL

    const nextConfig: AIServiceConfig = {
      provider,
      apiKey,
      baseURL,
      embeddingModel,
      chatModel
    }

    const nextSignature = this.buildSignature(nextConfig)
    if (this.clientSignature && nextSignature !== this.clientSignature) {
      this.resetClient()
    }

    this.config = nextConfig
  }

  getConfig(): AIServiceConfig {
    return { ...this.config }
  }

  getEmbeddingModel(): string {
    return this.config.embeddingModel || DEFAULT_EMBEDDING_MODEL
  }

  getChatModel(): string {
    return this.config.chatModel || DEFAULT_CHAT_MODEL
  }

  hasValidApiKey(): boolean {
    return this.config.apiKey.trim().length > 0
  }

  getClient(): OpenAI {
    if (!this.hasValidApiKey()) {
      throw new Error('AI API密钥未配置')
    }

    const signature = this.buildSignature(this.config)
    if (!this.client || this.clientSignature !== signature) {
      this.client = new OpenAI({
        apiKey: this.config.apiKey,
        baseURL: this.resolveClientBaseURL(),
        dangerouslyAllowBrowser: true
      })
      this.clientSignature = signature
    }

    return this.client
  }

  resetClient(): void {
    this.client = null
    this.clientSignature = null
  }

  private resolveClientBaseURL(): string | undefined {
    if (this.config.baseURL && this.config.baseURL.length > 0) {
      return this.config.baseURL
    }
    return this.config.provider === 'openai' ? 'https://api.openai.com/v1' : undefined
  }

  private buildSignature(config: AIServiceConfig): string {
    return `${config.apiKey}::${config.baseURL || ''}`
  }
}

export const aiServiceManager = AIServiceManager.getInstance()
export default aiServiceManager
