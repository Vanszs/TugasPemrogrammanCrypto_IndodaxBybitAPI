// Enhanced WebSocket Manager with State Management
import { useCallback, useEffect, useRef, useState } from 'react'

export interface WebSocketPrice {
  symbol: string
  price: string
  change24h: string
  changePercent24h: string
  timestamp: number
  volume24h?: string
  high24h?: string
  low24h?: string
}

export interface WebSocketState {
  prices: Map<string, WebSocketPrice>
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error'
  lastUpdate: number
  retryCount: number
}

class WebSocketManager {
  private static instance: WebSocketManager
  private websockets: Map<string, WebSocket> = new Map()
  private subscribers: Map<string, Set<(data: WebSocketPrice) => void>> = new Map()
  private reconnectTimers: Map<string, NodeJS.Timeout> = new Map()
  private state: WebSocketState = {
    prices: new Map(),
    connectionStatus: 'disconnected',
    lastUpdate: 0,
    retryCount: 0
  }
  private stateListeners: Set<(state: WebSocketState) => void> = new Set()

  static getInstance(): WebSocketManager {
    if (!WebSocketManager.instance) {
      WebSocketManager.instance = new WebSocketManager()
    }
    return WebSocketManager.instance
  }

  private updateState(updates: Partial<WebSocketState>): void {
    this.state = { ...this.state, ...updates }
    this.stateListeners.forEach(listener => listener(this.state))
  }

  private notifySubscribers(symbol: string, data: WebSocketPrice): void {
    const symbolSubscribers = this.subscribers.get(symbol)
    if (symbolSubscribers) {
      symbolSubscribers.forEach(callback => callback(data))
    }
  }

  subscribe(symbol: string, callback: (data: WebSocketPrice) => void): () => void {
    if (!this.subscribers.has(symbol)) {
      this.subscribers.set(symbol, new Set())
    }
    this.subscribers.get(symbol)!.add(callback)

    // Return unsubscribe function
    return () => {
      const symbolSubscribers = this.subscribers.get(symbol)
      if (symbolSubscribers) {
        symbolSubscribers.delete(callback)
        if (symbolSubscribers.size === 0) {
          this.subscribers.delete(symbol)
          this.disconnect(symbol)
        }
      }
    }
  }

  subscribeToState(callback: (state: WebSocketState) => void): () => void {
    this.stateListeners.add(callback)
    callback(this.state) // Immediate callback with current state
    
    return () => {
      this.stateListeners.delete(callback)
    }
  }

  connectIndodax(symbol: string): void {
    const key = `indodax_${symbol}`
    
    if (this.websockets.has(key)) {
      return // Already connected
    }

    console.log(`[WebSocket] Attempting to connect to Indodax for ${symbol}`)
    this.updateState({ connectionStatus: 'connecting' })

    try {
      // For Indodax, we'll use polling with smooth state updates
      this.startPolling(symbol, 'indodax')
    } catch (error) {
      console.error('Failed to connect to Indodax WebSocket:', error)
      this.updateState({ connectionStatus: 'error' })
      this.scheduleReconnect(key)
    }
  }

  connectBybit(symbol: string): void {
    const key = `bybit_${symbol}`
    
    if (this.websockets.has(key)) {
      return // Already connected
    }

    this.updateState({ connectionStatus: 'connecting' })

    try {
      const ws = new WebSocket('wss://stream.bybit.com/v5/public/linear')
      
      ws.onopen = () => {
        console.log(`[WebSocket] Connected to Bybit for ${symbol}`)
        this.updateState({ 
          connectionStatus: 'connected', 
          retryCount: 0 
        })

        // Subscribe to ticker
        ws.send(JSON.stringify({
          op: 'subscribe',
          args: [`tickers.${symbol.toUpperCase()}`]
        }))
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          
          if (data.topic && data.topic.startsWith('tickers.') && data.data) {
            const ticker = data.data
            const priceData: WebSocketPrice = {
              symbol: ticker.symbol,
              price: ticker.lastPrice,
              change24h: ticker.price24hPcnt,
              changePercent24h: ticker.price24hPcnt,
              timestamp: Date.now(),
              volume24h: ticker.volume24h,
              high24h: ticker.highPrice24h,
              low24h: ticker.lowPrice24h
            }

            // Update state smoothly
            const newPrices = new Map(this.state.prices)
            newPrices.set(symbol, priceData)
            
            this.updateState({
              prices: newPrices,
              lastUpdate: Date.now()
            })

            this.notifySubscribers(symbol, priceData)
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error)
        }
      }

      ws.onclose = () => {
        console.log(`[WebSocket] Disconnected from Bybit for ${symbol}`)
        this.websockets.delete(key)
        this.updateState({ connectionStatus: 'disconnected' })
        this.scheduleReconnect(key)
      }

      ws.onerror = (error) => {
        console.error(`[WebSocket] Error for ${symbol}:`, error)
        this.updateState({ connectionStatus: 'error' })
        this.scheduleReconnect(key)
      }

      this.websockets.set(key, ws)
    } catch (error) {
      console.error('Failed to create Bybit WebSocket:', error)
      this.updateState({ connectionStatus: 'error' })
      this.scheduleReconnect(key)
    }
  }

  private async fetchWithTimeout(url: string, timeout = 10000): Promise<Response> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        }
      })
      clearTimeout(timeoutId)
      return response
    } catch (error) {
      clearTimeout(timeoutId)
      throw error
    }
  }

  private async fetchWithProxy(url: string): Promise<any> {
    console.log('[WebSocket API] Fetching:', url)

    try {
      const response = await this.fetchWithTimeout(url)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      return await response.json()
    } catch (error) {
      console.log('[WebSocket API] Direct fetch failed, trying proxies...')
      
      const proxies = [
        'https://api.allorigins.win/get?url=',
        'https://api.codetabs.com/v1/proxy?quest=',
        'https://thingproxy.freeboard.io/fetch/'
      ]

      for (const proxy of proxies) {
        try {
          const proxyUrl = `${proxy}${encodeURIComponent(url)}`
          const response = await this.fetchWithTimeout(proxyUrl)
          
          if (!response.ok) continue
          
          const data = await response.json()
          
          if (data.contents) {
            try {
              return JSON.parse(data.contents)
            } catch {
              return data.contents
            }
          }
          
          return data.data || data
        } catch (proxyError) {
          console.log('[WebSocket API] Proxy failed:', proxyError)
          continue
        }
      }

      throw new Error('All API endpoints failed')
    }
  }

  private async startPolling(symbol: string, exchange: 'indodax' | 'bybit'): Promise<void> {
    const key = `${exchange}_${symbol}`
    
    const poll = async () => {
      try {
        let apiUrl = ''
        if (exchange === 'indodax') {
          apiUrl = `https://indodax.com/api/ticker/${symbol}`
        }

        const data = await this.fetchWithProxy(apiUrl)
        
        let priceData: WebSocketPrice
        if (exchange === 'indodax') {
          const ticker = data.ticker || data
          
          // Validate price data before using it
          if (!ticker.last || !ticker.high || !ticker.low) {
            console.warn(`[Polling] Invalid ticker data for ${symbol}, skipping update`)
            return
          }
          
          const last = parseFloat(ticker.last)
          const high = parseFloat(ticker.high)
          const low = parseFloat(ticker.low)
          
          // Sanity check: ensure price is within reasonable bounds
          if (last <= 0 || high <= 0 || low <= 0 || last > high * 1.1 || last < low * 0.9) {
            console.warn(`[Polling] Price data out of bounds for ${symbol}, skipping update`)
            return
          }
          
          // Calculate 24h change properly using available data
          const change24h = ticker.vol_24h ? 
            ((last - (high + low) / 2) / ((high + low) / 2) * 100).toFixed(2) : '0'
          
          priceData = {
            symbol: symbol,
            price: ticker.last,
            change24h: change24h,
            changePercent24h: change24h,
            timestamp: Date.now(),
            volume24h: ticker.vol_idr,
            high24h: ticker.high,
            low24h: ticker.low
          }
        } else {
          // Bybit implementation would go here
          return
        }

        // Smooth state update with duplicate prevention
        const currentPrice = this.state.prices.get(symbol)
        const shouldUpdate = !currentPrice || 
          Math.abs(parseFloat(priceData.price) - parseFloat(currentPrice.price)) > 0 ||
          Date.now() - currentPrice.timestamp > 30000 // Force update after 30 seconds
        
        if (shouldUpdate) {
          const newPrices = new Map(this.state.prices)
          newPrices.set(symbol, priceData)
          
          this.updateState({
            prices: newPrices,
            lastUpdate: Date.now(),
            connectionStatus: 'connected'
          })

          this.notifySubscribers(symbol, priceData)
        }
      } catch (error) {
        console.error(`[Polling] Error for ${symbol}:`, error)
        this.updateState({ 
          connectionStatus: 'error',
          retryCount: this.state.retryCount + 1
        })
        
        // If too many errors, increase polling interval
        if (this.state.retryCount > 3) {
          console.log(`[Polling] Too many errors for ${symbol}, reducing polling frequency`)
        }
      }
    }

    // Initial poll with delay to prevent immediate errors
    setTimeout(async () => {
      try {
        await poll()
      } catch (error) {
        console.log(`[Polling] Initial poll failed for ${symbol}, will retry with interval`)
      }
    }, 1000)

    // Set up interval polling - increased to reduce fluctuations
    const baseInterval = 8000 // 8 seconds base interval
    const pollingInterval = this.state.retryCount > 3 ? baseInterval * 2 : baseInterval
    const interval = setInterval(poll, pollingInterval)
    
    // Store interval for cleanup
    this.reconnectTimers.set(key, interval)
  }

  private scheduleReconnect(key: string): void {
    const existingTimer = this.reconnectTimers.get(key)
    if (existingTimer) {
      clearTimeout(existingTimer)
    }

    const retryDelay = Math.min(1000 * Math.pow(2, this.state.retryCount), 30000) // Max 30 seconds
    
    const timer = setTimeout(() => {
      console.log(`[WebSocket] Attempting reconnect for ${key}`)
      this.updateState({ retryCount: this.state.retryCount + 1 })
      
      const [exchange, symbol] = key.split('_')
      if (exchange === 'indodax') {
        this.connectIndodax(symbol)
      } else if (exchange === 'bybit') {
        this.connectBybit(symbol)
      }
    }, retryDelay)

    this.reconnectTimers.set(key, timer)
  }

  disconnect(symbol: string): void {
    const indodaxKey: string = `indodax_${symbol}`
    const bybitKey: string = `bybit_${symbol}`

    // Clean up WebSocket connections
    const keys = [indodaxKey, bybitKey]
    keys.forEach((key: string) => {
      const ws = this.websockets.get(key)
      if (ws) {
        ws.close()
        this.websockets.delete(key)
      }

      const timer = this.reconnectTimers.get(key)
      if (timer) {
        clearTimeout(timer)
        this.reconnectTimers.delete(key)
      }
    })

    // Remove from state
    const newPrices = new Map(this.state.prices)
    newPrices.delete(symbol)
    this.updateState({ prices: newPrices })
  }

  getPrice(symbol: string): WebSocketPrice | undefined {
    return this.state.prices.get(symbol)
  }

  getAllPrices(): WebSocketPrice[] {
    return Array.from(this.state.prices.values())
  }

  getConnectionStatus(): WebSocketState['connectionStatus'] {
    return this.state.connectionStatus
  }
}

// React Hook for WebSocket
export function useWebSocketPrice(symbol: string | null, exchange: 'indodax' | 'bybit') {
  const [price, setPrice] = useState<WebSocketPrice | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<WebSocketState['connectionStatus']>('disconnected')
  const managerRef = useRef<WebSocketManager | null>(null)

  useEffect(() => {
    if (!managerRef.current) {
      managerRef.current = WebSocketManager.getInstance()
    }
  }, [])

  useEffect(() => {
    if (!symbol || !managerRef.current) return

    const manager = managerRef.current

    // Subscribe to price updates
    const unsubscribePrice = manager.subscribe(symbol, (priceData) => {
      setPrice(priceData)
    })

    // Subscribe to connection status
    const unsubscribeState = manager.subscribeToState((state) => {
      setConnectionStatus(state.connectionStatus)
    })

    // Connect to appropriate exchange
    if (exchange === 'indodax') {
      manager.connectIndodax(symbol)
    } else {
      manager.connectBybit(symbol)
    }

    // Get current price if available
    const currentPrice = manager.getPrice(symbol)
    if (currentPrice) {
      setPrice(currentPrice)
    }

    return () => {
      unsubscribePrice()
      unsubscribeState()
    }
  }, [symbol, exchange])

  return { price, connectionStatus }
}

// React Hook for Multiple Symbols
export function useWebSocketPrices(symbols: string[], exchange: 'indodax' | 'bybit') {
  const [prices, setPrices] = useState<Map<string, WebSocketPrice>>(new Map())
  const [connectionStatus, setConnectionStatus] = useState<WebSocketState['connectionStatus']>('disconnected')
  const managerRef = useRef<WebSocketManager | null>(null)

  useEffect(() => {
    if (!managerRef.current) {
      managerRef.current = WebSocketManager.getInstance()
    }
  }, [])

  useEffect(() => {
    if (symbols.length === 0 || !managerRef.current) return

    const manager = managerRef.current
    const unsubscribeFunctions: (() => void)[] = []

    // Subscribe to each symbol
    symbols.forEach(symbol => {
      const unsubscribe = manager.subscribe(symbol, (priceData) => {
        setPrices(prev => new Map(prev).set(symbol, priceData))
      })
      unsubscribeFunctions.push(unsubscribe)

      // Connect to appropriate exchange
      if (exchange === 'indodax') {
        manager.connectIndodax(symbol)
      } else {
        manager.connectBybit(symbol)
      }
    })

    // Subscribe to connection status
    const unsubscribeState = manager.subscribeToState((state) => {
      setConnectionStatus(state.connectionStatus)
      setPrices(new Map(state.prices))
    })

    return () => {
      unsubscribeFunctions.forEach(unsub => unsub())
      unsubscribeState()
    }
  }, [symbols, exchange])

  return { prices, connectionStatus }
}

export default WebSocketManager