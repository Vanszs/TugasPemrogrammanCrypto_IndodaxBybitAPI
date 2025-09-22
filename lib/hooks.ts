import { useState, useEffect, useCallback, useRef } from 'react'
import { 
  Exchange, 
  CoinPair, 
  TickerData, 
  TradeData, 
  DepthData, 
  ConnectionStatus, 
  UseApiReturn, 
  UseWebSocketReturn, 
  WebSocketMessage,
  ApiError 
} from './types'
import { 
  indodaxApiService, 
  bybitApiService, 
  transformBybitInstrumentsToPairs,
  transformBybitTickerData,
  transformBybitTrades,
  transformBybitDepth
} from './api'

// Custom hook for managing cryptocurrency pairs
export const useCryptoPairs = (exchange: Exchange) => {
  const [pairs, setPairs] = useState<CoinPair[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<ApiError | null>(null)
  const [lastUpdate, setLastUpdate] = useState(0)

  const fetchPairs = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      if (exchange === 'indodax') {
        const response = await indodaxApiService.getPairs()
        if (response.success && response.data) {
          setPairs(Array.isArray(response.data) ? response.data.slice(0, 400) : [])
          setLastUpdate(Date.now())
        } else {
          throw new Error(response.error || 'Failed to fetch Indodax pairs')
        }
      } else {
        const response = await bybitApiService.getInstruments()
        if (response.success && response.data?.result?.list) {
          const transformedPairs = transformBybitInstrumentsToPairs(response.data.result.list)
          setPairs(transformedPairs)
          setLastUpdate(Date.now())
        } else {
          throw new Error(response.error || 'Failed to fetch Bybit instruments')
        }
      }
    } catch (err) {
      const apiError: ApiError = {
        message: err instanceof Error ? err.message : 'Unknown error',
        timestamp: Date.now(),
        retryCount: 0
      }
      setError(apiError)
      setPairs([])
    } finally {
      setLoading(false)
    }
  }, [exchange])

  useEffect(() => {
    fetchPairs()
  }, [fetchPairs])

  return {
    pairs,
    loading,
    error,
    lastUpdate,
    refetch: fetchPairs
  }
}

// Custom hook for ticker data
export const useTicker = (pair: CoinPair | null, exchange: Exchange): UseApiReturn<TickerData> => {
  const [data, setData] = useState<TickerData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<ApiError | null>(null)
  const [lastUpdate, setLastUpdate] = useState(0)

  const fetchTicker = useCallback(async () => {
    if (!pair) return

    try {
      setLoading(true)
      setError(null)

      if (exchange === 'indodax') {
        const response = await indodaxApiService.getTicker(pair.id)
        if (response.success && response.data) {
          const tickerData = response.data.ticker || response.data
          setData({
            ...tickerData,
            lastFetch: Date.now(),
            isLoading: false
          })
          setLastUpdate(Date.now())
        } else {
          throw new Error(response.error || 'Failed to fetch ticker')
        }
      } else {
        const response = await bybitApiService.getTicker(pair.symbol.toUpperCase())
        if (response.success && response.data?.result?.list?.[0]) {
          const transformedData = transformBybitTickerData(response.data.result.list[0])
          setData(transformedData)
          setLastUpdate(Date.now())
        } else {
          throw new Error(response.error || 'Failed to fetch Bybit ticker')
        }
      }
    } catch (err) {
      const apiError: ApiError = {
        message: err instanceof Error ? err.message : 'Unknown error',
        timestamp: Date.now(),
        retryCount: 0
      }
      setError(apiError)
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [pair, exchange])

  useEffect(() => {
    if (pair) {
      fetchTicker()
    } else {
      setData(null)
      setError(null)
    }
  }, [fetchTicker])

  return {
    data,
    loading,
    error,
    lastUpdate,
    refetch: fetchTicker
  }
}

// Custom hook for trades data
export const useTrades = (pair: CoinPair | null, exchange: Exchange): UseApiReturn<TradeData[]> & { newTradesIds: string[] } => {
  const [data, setData] = useState<TradeData[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<ApiError | null>(null)
  const [lastUpdate, setLastUpdate] = useState(0)
  const [newTradesIds, setNewTradesIds] = useState<string[]>([])
  const previousTradesRef = useRef<{ [key: string]: boolean }>({})

  const fetchTrades = useCallback(async () => {
    if (!pair) return

    try {
      setLoading(true)
      setError(null)

      if (exchange === 'indodax') {
        const response = await indodaxApiService.getTrades(pair.id)
        if (response.success && response.data) {
          const newTrades = Array.isArray(response.data) ? response.data.slice(0, 20) : []
          
          // Identify new trades
          const currentTradeIds: { [key: string]: boolean } = {}
          const newTradeIds: string[] = []
          
          newTrades.forEach(trade => {
            const tradeId = trade.tid || `${trade.date}-${trade.price}-${trade.amount}`
            currentTradeIds[tradeId] = true
            
            // If this trade wasn't in our previous set, mark it as new
            if (!previousTradesRef.current[tradeId]) {
              newTradeIds.push(tradeId)
            }
          })
          
          // Update previous trades ref for next comparison
          previousTradesRef.current = currentTradeIds
          
          // Update state
          setData(newTrades)
          setNewTradesIds(newTradeIds)
          setLastUpdate(Date.now())
        } else {
          throw new Error(response.error || 'Failed to fetch trades')
        }
      } else {
        const response = await bybitApiService.getRecentTrades(pair.symbol.toUpperCase())
        if (response.success && response.data?.result?.list) {
          const transformedTrades = transformBybitTrades(response.data.result.list)
          
          // Identify new trades
          const currentTradeIds: { [key: string]: boolean } = {}
          const newTradeIds: string[] = []
          
          transformedTrades.forEach(trade => {
            const tradeId = trade.tid || `${trade.date}-${trade.price}-${trade.amount}`
            currentTradeIds[tradeId] = true
            
            // If this trade wasn't in our previous set, mark it as new
            if (!previousTradesRef.current[tradeId]) {
              newTradeIds.push(tradeId)
            }
          })
          
          // Update previous trades ref for next comparison
          previousTradesRef.current = currentTradeIds
          
          // Update state
          setData(transformedTrades)
          setNewTradesIds(newTradeIds)
          setLastUpdate(Date.now())
        } else {
          throw new Error(response.error || 'Failed to fetch Bybit trades')
        }
      }
    } catch (err) {
      const apiError: ApiError = {
        message: err instanceof Error ? err.message : 'Unknown error',
        timestamp: Date.now(),
        retryCount: 0
      }
      setError(apiError)
      setData([])
    } finally {
      setLoading(false)
    }
  }, [pair, exchange])

  useEffect(() => {
    if (pair) {
      // Fetch trades initially
      fetchTrades()
      
      // Set up automatic refresh interval (every 5 seconds)
      const refreshInterval = setInterval(() => {
        if (pair) fetchTrades()
      }, 5000)
      
      // Clean up interval on unmount or when pair changes
      return () => clearInterval(refreshInterval)
    } else {
      setData([])
      setError(null)
    }
  }, [pair, exchange, fetchTrades])

  return {
    data,
    loading,
    error,
    lastUpdate,
    refetch: fetchTrades,
    newTradesIds
  }
}

// Custom hook for depth/orderbook data
export const useDepth = (pair: CoinPair | null, exchange: Exchange): UseApiReturn<DepthData> => {
  const [data, setData] = useState<DepthData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<ApiError | null>(null)
  const [lastUpdate, setLastUpdate] = useState(0)

  const fetchDepth = useCallback(async () => {
    if (!pair) return

    try {
      setLoading(true)
      setError(null)

      if (exchange === 'indodax') {
        const response = await indodaxApiService.getDepth(pair.id)
        if (response.success && response.data) {
          setData({
            ...response.data,
            lastUpdate: Date.now()
          })
          setLastUpdate(Date.now())
        } else {
          throw new Error(response.error || 'Failed to fetch depth')
        }
      } else {
        const response = await bybitApiService.getOrderbook(pair.symbol.toUpperCase())
        if (response.success && response.data?.result) {
          const transformedDepth = transformBybitDepth(response.data.result)
          setData(transformedDepth)
          setLastUpdate(Date.now())
        } else {
          throw new Error(response.error || 'Failed to fetch Bybit orderbook')
        }
      }
    } catch (err) {
      const apiError: ApiError = {
        message: err instanceof Error ? err.message : 'Unknown error',
        timestamp: Date.now(),
        retryCount: 0
      }
      setError(apiError)
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [pair, exchange])

  useEffect(() => {
    if (pair) {
      fetchDepth()
    } else {
      setData(null)
      setError(null)
    }
  }, [fetchDepth])

  return {
    data,
    loading,
    error,
    lastUpdate,
    refetch: fetchDepth
  }
}

// Enhanced WebSocket hook
export const useWebSocket = (
  url: string | null,
  pair: CoinPair | null,
  exchange: Exchange
): UseWebSocketReturn => {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected')
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [reconnectAttempts, setReconnectAttempts] = useState(0)
  const maxReconnectAttempts = 5

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    setConnectionStatus('disconnected')
    setReconnectAttempts(0)
  }, [])

  const sendMessage = useCallback((message: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message))
    }
  }, [])

  const connect = useCallback(() => {
    if (!url || !pair || reconnectAttempts >= maxReconnectAttempts) {
      return
    }

    disconnect()
    setConnectionStatus('connecting')

    try {
      const ws = new WebSocket(url)
      wsRef.current = ws

      ws.onopen = () => {
        console.log('[WebSocket] Connected to', exchange)
        setConnectionStatus('connected')
        setReconnectAttempts(0)

        // Exchange-specific authentication and subscription
        if (exchange === 'indodax') {
          // Indodax authentication
          ws.send(JSON.stringify({
            params: { 
              token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE5NDY2MTg0MTV9.UR1lBM6Eqh0yWz-PVirw1uPCxe60FdchR8eNVdsskeo" 
            },
            id: 1
          }))
        } else {
          // Bybit ping
          ws.send(JSON.stringify({
            req_id: "100001",
            op: "ping"
          }))
        }
      }

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data)
          setLastMessage(message)

          // Handle authentication and subscription
          if (exchange === 'indodax' && message.id === 1 && message.result) {
            // Subscribe to channels
            ws.send(JSON.stringify({
              method: 1,
              params: { channel: "market:summary-24h" },
              id: 2
            }))

            ws.send(JSON.stringify({
              method: 1,
              params: { channel: `market:trade-activity-${pair.ticker_id}` },
              id: 3
            }))

            ws.send(JSON.stringify({
              method: 1,
              params: { channel: `market:order-book-${pair.ticker_id}` },
              id: 4
            }))
          } else if (exchange === 'bybit' && message.success && message.ret_msg === 'pong') {
            // Subscribe to Bybit channels
            ws.send(JSON.stringify({
              req_id: "10001",
              op: "subscribe",
              args: [
                `tickers.${pair.symbol}`,
                `publicTrade.${pair.symbol}`,
                `orderbook.50.${pair.symbol}`
              ]
            }))
          }
        } catch (error) {
          console.error('[WebSocket] Message parsing error:', error)
        }
      }

      ws.onerror = (error) => {
        console.error('[WebSocket] Error:', error)
        setConnectionStatus('error')
      }

      ws.onclose = (event) => {
        console.log('[WebSocket] Disconnected:', event.code, event.reason)
        setConnectionStatus('disconnected')

        // Auto-reconnect with exponential backoff
        if (pair && reconnectAttempts < maxReconnectAttempts) {
          const delay = Math.pow(2, reconnectAttempts) * 2000
          console.log(`[WebSocket] Reconnecting in ${delay}ms... (attempt ${reconnectAttempts + 1})`)
          
          reconnectTimeoutRef.current = setTimeout(() => {
            setReconnectAttempts(prev => prev + 1)
            connect()
          }, delay)
        }
      }

    } catch (error) {
      console.error('[WebSocket] Connection failed:', error)
      setConnectionStatus('error')
    }
  }, [url, pair, exchange, reconnectAttempts, disconnect])

  const reconnect = useCallback(() => {
    setReconnectAttempts(0)
    connect()
  }, [connect])

  useEffect(() => {
    if (url && pair) {
      connect()
    } else {
      disconnect()
    }

    return () => {
      disconnect()
    }
  }, [url, pair, connect, disconnect])

  return {
    connectionStatus,
    lastMessage,
    sendMessage,
    reconnect,
    disconnect
  }
}

// Auto-refresh hook for polling data when WebSocket is not connected
export const useAutoRefresh = (
  callback: () => void,
  interval = 10000,
  enabled = false
) => {
  const callbackRef = useRef(callback)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  useEffect(() => {
    if (enabled) {
      intervalRef.current = setInterval(() => {
        callbackRef.current()
      }, interval)
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [enabled, interval])
}

// Debounced search hook
export const useDebouncedValue = <T>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}