import { z } from 'zod'

// Search validation schema
export const searchSchema = z.object({
  term: z.string()
    .min(1, 'Search term cannot be empty')
    .max(50, 'Search term too long')
    .regex(/^[a-zA-Z0-9\s\-_./]+$/, 'Invalid characters in search term')
    .transform(val => val.trim().toLowerCase())
})

// Exchange selection schema
export const exchangeSchema = z.object({
  exchange: z.enum(['indodax', 'bybit'], {
    invalid_type_error: 'Invalid exchange selected'
  })
})

// Pair selection schema
export const pairSelectionSchema = z.object({
  pairId: z.string()
    .min(1, 'Pair ID is required')
    .regex(/^[a-z0-9_-]+$/, 'Invalid pair ID format'),
  symbol: z.string()
    .min(1, 'Symbol is required')
    .regex(/^[A-Z0-9/]+$/, 'Invalid symbol format')
})

// API request validation
export const apiRequestSchema = z.object({
  endpoint: z.string().url('Invalid endpoint URL'),
  method: z.enum(['GET', 'POST', 'PUT', 'DELETE']).default('GET'),
  timeout: z.number().min(1000).max(30000).default(10000),
  retries: z.number().min(0).max(5).default(3)
})

// WebSocket connection schema
export const websocketSchema = z.object({
  url: z.string().url('Invalid WebSocket URL'),
  protocols: z.array(z.string()).optional(),
  reconnectAttempts: z.number().min(0).max(10).default(3),
  reconnectDelay: z.number().min(1000).max(30000).default(2000)
})

// Data sanitization functions
export const sanitizeInput = {
  // Sanitize search input
  searchTerm: (input: string): string => {
    return input
      .trim()
      .replace(/[<>'"&]/g, '') // Remove potentially dangerous characters
      .slice(0, 50) // Limit length
  },

  // Sanitize symbol input
  symbol: (input: string): string => {
    return input
      .toUpperCase()
      .replace(/[^A-Z0-9/]/g, '')
      .slice(0, 20)
  },

  // Sanitize numeric input
  number: (input: string | number): number | null => {
    const num = typeof input === 'string' ? parseFloat(input) : input
    if (isNaN(num) || !isFinite(num)) return null
    return Math.max(0, num) // Ensure non-negative
  },

  // Sanitize URL
  url: (input: string): string | null => {
    try {
      const url = new URL(input)
      if (url.protocol !== 'https:' && url.protocol !== 'http:' && url.protocol !== 'wss:' && url.protocol !== 'ws:') {
        return null
      }
      return url.toString()
    } catch {
      return null
    }
  }
}

// Input validation hooks
export const useFormValidation = <T>(schema: z.ZodSchema<T>) => {
  const validate = (data: unknown): { success: true; data: T } | { success: false; errors: string[] } => {
    try {
      const validatedData = schema.parse(data)
      return { success: true, data: validatedData }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map(err => err.message)
        return { success: false, errors }
      }
      return { success: false, errors: ['Validation failed'] }
    }
  }

  const safeValidate = (data: unknown): { success: true; data: T } | { success: false; errors: string[] } => {
    const result = schema.safeParse(data)
    if (result.success) {
      return { success: true, data: result.data }
    }
    const errors = result.error.errors.map(err => err.message)
    return { success: false, errors }
  }

  return { validate, safeValidate }
}

// Rate limiting for API calls
export class RateLimiter {
  private requests: number[] = []
  private readonly maxRequests: number
  private readonly timeWindow: number

  constructor(maxRequests = 60, timeWindowMs = 60000) {
    this.maxRequests = maxRequests
    this.timeWindow = timeWindowMs
  }

  canMakeRequest(): boolean {
    const now = Date.now()
    
    // Remove old requests outside the time window
    this.requests = this.requests.filter(timestamp => now - timestamp < this.timeWindow)
    
    return this.requests.length < this.maxRequests
  }

  recordRequest(): void {
    this.requests.push(Date.now())
  }

  getRemainingRequests(): number {
    const now = Date.now()
    this.requests = this.requests.filter(timestamp => now - timestamp < this.timeWindow)
    return Math.max(0, this.maxRequests - this.requests.length)
  }

  getTimeUntilReset(): number {
    if (this.requests.length === 0) return 0
    
    const oldestRequest = Math.min(...this.requests)
    const timeUntilReset = this.timeWindow - (Date.now() - oldestRequest)
    return Math.max(0, timeUntilReset)
  }
}

// Content Security Policy helpers
export const cspHelpers = {
  // Check if URL is allowed
  isAllowedUrl: (url: string): boolean => {
    const allowedDomains = [
      'indodax.com',
      'api.bybit.com',
      'stream.bybit.com',
      'ws3.indodax.com'
    ]

    try {
      const urlObj = new URL(url)
      return allowedDomains.some(domain => 
        urlObj.hostname === domain || urlObj.hostname.endsWith(`.${domain}`)
      )
    } catch {
      return false
    }
  },

  // Sanitize HTML content
  sanitizeHtml: (html: string): string => {
    return html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
  }
}

// Error validation and reporting
export const errorValidation = {
  isNetworkError: (error: unknown): boolean => {
    return error instanceof TypeError && 
           (error.message.includes('fetch') || error.message.includes('network'))
  },

  isTimeoutError: (error: unknown): boolean => {
    return error instanceof Error && 
           (error.name === 'AbortError' || error.message.includes('timeout'))
  },

  isRateLimitError: (error: unknown): boolean => {
    return error instanceof Error && 
           (error.message.includes('rate limit') || error.message.includes('429'))
  },

  categorizeError: (error: unknown): {
    type: 'network' | 'timeout' | 'rate-limit' | 'validation' | 'api' | 'unknown'
    message: string
    retryable: boolean
  } => {
    if (errorValidation.isNetworkError(error)) {
      return {
        type: 'network',
        message: 'Network connection failed',
        retryable: true
      }
    }

    if (errorValidation.isTimeoutError(error)) {
      return {
        type: 'timeout',
        message: 'Request timed out',
        retryable: true
      }
    }

    if (errorValidation.isRateLimitError(error)) {
      return {
        type: 'rate-limit',
        message: 'Rate limit exceeded',
        retryable: true
      }
    }

    if (error instanceof z.ZodError) {
      return {
        type: 'validation',
        message: 'Invalid input data',
        retryable: false
      }
    }

    if (error instanceof Error) {
      return {
        type: 'api',
        message: error.message,
        retryable: false
      }
    }

    return {
      type: 'unknown',
      message: 'An unexpected error occurred',
      retryable: false
    }
  }
}

// Performance monitoring
export const performanceMonitor = {
  startTiming: (label: string): void => {
    if (typeof performance !== 'undefined') {
      performance.mark(`${label}-start`)
    }
  },

  endTiming: (label: string): number => {
    if (typeof performance !== 'undefined') {
      performance.mark(`${label}-end`)
      performance.measure(label, `${label}-start`, `${label}-end`)
      
      const entries = performance.getEntriesByName(label, 'measure')
      if (entries.length > 0) {
        return entries[entries.length - 1].duration
      }
    }
    return 0
  },

  clearTimings: (label?: string): void => {
    if (typeof performance !== 'undefined') {
      if (label) {
        performance.clearMarks(`${label}-start`)
        performance.clearMarks(`${label}-end`)
        performance.clearMeasures(label)
      } else {
        performance.clearMarks()
        performance.clearMeasures()
      }
    }
  }
}

// Export rate limiter instance for API calls
export const apiRateLimiter = new RateLimiter(100, 60000) // 100 requests per minute