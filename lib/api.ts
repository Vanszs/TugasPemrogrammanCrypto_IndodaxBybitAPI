import { ApiResponse, ApiError, ApiConfig, BybitApiResponse, IndodaxApiResponse } from './types'

// Default configurations
export const DEFAULT_API_CONFIG: ApiConfig = {
  baseUrl: '',
  timeout: 10000,
  retryAttempts: 3,
  retryDelay: 1000,
  corsProxy: [
    'https://api.allorigins.win/get?url=',
    'https://api.codetabs.com/v1/proxy?quest=',
    'https://thingproxy.freeboard.io/fetch/',
    'https://cors-proxy.htmldriven.com/?url=',
    'https://yacdn.org/proxy/'
  ]
}

export const INDODAX_CONFIG: ApiConfig = {
  ...DEFAULT_API_CONFIG,
  baseUrl: 'https://indodax.com/api',
  timeout: 15000
}

export const BYBIT_CONFIG: ApiConfig = {
  ...DEFAULT_API_CONFIG,
  baseUrl: 'https://api.bybit.com',
  timeout: 12000
}

// Cache management
class ApiCache {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>()
  private readonly DEFAULT_TTL = 30000 // 30 seconds

  set(key: string, data: any, ttl = this.DEFAULT_TTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    })
  }

  get(key: string): any | null {
    const cached = this.cache.get(key)
    if (!cached) return null

    if (Date.now() - cached.timestamp > cached.ttl) {
      this.cache.delete(key)
      return null
    }

    return cached.data
  }

  clear(): void {
    this.cache.clear()
  }

  delete(key: string): void {
    this.cache.delete(key)
  }

  size(): number {
    return this.cache.size
  }
}

export const apiCache = new ApiCache()

// Utility functions
export const createApiError = (
  message: string, 
  code?: string | number, 
  details?: any
): ApiError => ({
  message,
  code,
  details,
  timestamp: Date.now(),
  retryCount: 0
})

export const delay = (ms: number): Promise<void> => 
  new Promise(resolve => setTimeout(resolve, ms))

export const isNetworkError = (error: any): boolean => {
  return error instanceof TypeError && error.message.includes('fetch')
}

export const isTimeoutError = (error: any): boolean => {
  return error.name === 'AbortError' || error.message.includes('timeout')
}

// Enhanced fetch with retry and error handling
export class ApiClient {
  private config: ApiConfig

  constructor(config: ApiConfig) {
    this.config = config
  }

  private async fetchWithTimeout(
    url: string, 
    options: RequestInit = {}, 
    timeout = this.config.timeout
  ): Promise<Response> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          ...options.headers
        }
      })
      clearTimeout(timeoutId)
      return response
    } catch (error) {
      clearTimeout(timeoutId)
      throw error
    }
  }

  private async fetchWithProxy(url: string, options: RequestInit = {}): Promise<any> {
    console.log('[API] Attempting to fetch:', url)

    // Try direct fetch first
    try {
      const response = await this.fetchWithTimeout(url, {
        ...options,
        mode: 'cors'
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      console.log('[API] Direct fetch successful')
      return data
    } catch (error) {
      console.log('[API] Direct fetch failed, trying proxies...', error)

      // Try CORS proxies
      const proxies = this.config.corsProxy || []
      let lastError = error

      for (const proxy of proxies) {
        try {
          console.log('[API] Trying proxy:', proxy)
          
          const proxyUrl = proxy.includes('?') 
            ? `${proxy}${encodeURIComponent(url)}`
            : `${proxy}${url}`

          const response = await this.fetchWithTimeout(proxyUrl, {
            ...options,
            mode: 'cors'
          })

          if (!response.ok) {
            throw new Error(`Proxy error! status: ${response.status}`)
          }

          const data = await response.json()

          // Handle different proxy response formats
          let parsedData = data
          if (data.contents) {
            try {
              parsedData = JSON.parse(data.contents)
            } catch {
              parsedData = data.contents
            }
          } else if (data.data) {
            parsedData = data.data
          }

          console.log('[API] Proxy fetch successful')
          return parsedData

        } catch (proxyError) {
          console.log('[API] Proxy failed:', proxyError)
          lastError = proxyError
          continue
        }
      }

      throw createApiError(
        'All API endpoints failed',
        'NETWORK_ERROR',
        { originalError: lastError, url }
      )
    }
  }

  private async retryWithBackoff<T>(
    operation: () => Promise<T>,
    maxAttempts = this.config.retryAttempts,
    baseDelay = this.config.retryDelay
  ): Promise<T> {
    let lastError: any

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation()
      } catch (error) {
        lastError = error

        if (attempt === maxAttempts) {
          break
        }

        // Don't retry on certain errors
        if (!isNetworkError(error) && !isTimeoutError(error)) {
          throw error
        }

        const delayMs = baseDelay * Math.pow(2, attempt - 1) // Exponential backoff
        console.log(`[API] Attempt ${attempt} failed, retrying in ${delayMs}ms...`)
        await delay(delayMs)
      }
    }

    throw createApiError(
      `Failed after ${maxAttempts} attempts`,
      'MAX_RETRIES_EXCEEDED',
      { originalError: lastError }
    )
  }

  async get<T>(endpoint: string, useCache = true, cacheTtl = 30000): Promise<ApiResponse<T>> {
    const url = `${this.config.baseUrl}${endpoint}`
    const cacheKey = `GET:${url}`

    // Check cache first
    if (useCache) {
      const cached = apiCache.get(cacheKey)
      if (cached) {
        return {
          data: cached,
          success: true,
          timestamp: Date.now(),
          cached: true
        }
      }
    }

    try {
      const data = await this.retryWithBackoff(
        () => this.fetchWithProxy(url)
      )

      if (useCache) {
        apiCache.set(cacheKey, data, cacheTtl)
      }

      return {
        data,
        success: true,
        timestamp: Date.now(),
        cached: false
      }

    } catch (error) {
      console.error('[API] GET request failed:', error)
      
      return {
        success: false,
        timestamp: Date.now(),
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  clearCache(): void {
    apiCache.clear()
  }

  getCacheSize(): number {
    return apiCache.size()
  }
}

// Exchange-specific API clients
export const indodaxApi = new ApiClient(INDODAX_CONFIG)
export const bybitApi = new ApiClient(BYBIT_CONFIG)

// Specialized API functions
export class IndodaxApiService {
  async getPairs(): Promise<ApiResponse<any[]>> {
    return indodaxApi.get('/pairs', true, 60000) // Cache for 1 minute
  }

  async getTicker(pairId: string): Promise<ApiResponse<any>> {
    return indodaxApi.get(`/ticker/${pairId}`, true, 5000) // Cache for 5 seconds
  }

  async getTrades(pairId: string): Promise<ApiResponse<any[]>> {
    return indodaxApi.get(`/trades/${pairId}`, true, 10000) // Cache for 10 seconds
  }

  async getDepth(pairId: string): Promise<ApiResponse<any>> {
    return indodaxApi.get(`/depth/${pairId}`, true, 5000) // Cache for 5 seconds
  }
}

export class BybitApiService {
  async getInstruments(category = 'linear', limit = 400): Promise<ApiResponse<BybitApiResponse<any>>> {
    return bybitApi.get(`/v5/market/instruments-info?category=${category}&limit=${limit}`, true, 300000) // Cache for 5 minutes
  }

  async getTicker(symbol: string, category = 'linear'): Promise<ApiResponse<BybitApiResponse<any>>> {
    return bybitApi.get(`/v5/market/tickers?category=${category}&symbol=${symbol}`, true, 5000)
  }

  async getRecentTrades(symbol: string, category = 'linear', limit = 20): Promise<ApiResponse<BybitApiResponse<any>>> {
    return bybitApi.get(`/v5/market/recent-trade?category=${category}&symbol=${symbol}&limit=${limit}`, true, 10000)
  }

  async getOrderbook(symbol: string, category = 'linear', limit = 50): Promise<ApiResponse<BybitApiResponse<any>>> {
    return bybitApi.get(`/v5/market/orderbook?category=${category}&symbol=${symbol}&limit=${limit}`, true, 5000)
  }
}

// Export singleton instances
export const indodaxApiService = new IndodaxApiService()
export const bybitApiService = new BybitApiService()

// Utility functions for data transformation
export const transformBybitInstrumentsToPairs = (instruments: any[]): any[] => {
  return instruments.map((instrument: any) => ({
    id: instrument.symbol.toLowerCase(),
    symbol: instrument.symbol,
    base_currency: instrument.baseCoin,
    traded_currency: instrument.quoteCoin,
    traded_currency_unit: instrument.baseCoin,
    description: `${instrument.baseCoin}/${instrument.quoteCoin}`,
    ticker_id: instrument.symbol.toLowerCase(),
    url_logo: `/placeholder.svg?height=32&width=32&query=${instrument.baseCoin}`,
    url_logo_png: `/placeholder.svg?height=32&width=32&query=${instrument.baseCoin}`,
    isActive: instrument.status === 'Trading',
    lastUpdate: Date.now()
  }))
}

export const transformBybitTickerData = (ticker: any): any => ({
  last: ticker.lastPrice,
  high: ticker.highPrice24h,
  low: ticker.lowPrice24h,
  vol_idr: ticker.turnover24h,
  buy: ticker.bid1Price,
  sell: ticker.ask1Price,
  server_time: Date.now() / 1000,
  lastPrice: ticker.lastPrice,
  highPrice24h: ticker.highPrice24h,
  lowPrice24h: ticker.lowPrice24h,
  volume24h: ticker.volume24h,
  price24hPcnt: ticker.price24hPcnt,
  bid1Price: ticker.bid1Price,
  ask1Price: ticker.ask1Price,
  lastFetch: Date.now()
})

export const transformBybitTrades = (trades: any[]): any[] => {
  return trades.map((trade: any) => ({
    date: (trade.time / 1000).toString(),
    price: trade.price,
    amount: trade.size,
    tid: trade.execId,
    type: trade.side.toLowerCase() as 'buy' | 'sell',
    timestamp: trade.time
  }))
}

export const transformBybitDepth = (orderbook: any): any => ({
  buy: orderbook.b || [],
  sell: orderbook.a || [],
  lastUpdate: Date.now(),
  sequence: orderbook.seq
})