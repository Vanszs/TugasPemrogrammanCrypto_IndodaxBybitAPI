// Trade WebSocket Manager
import { useCallback, useEffect, useRef, useState } from 'react'
import { CoinPair } from './types'

export interface TradeData {
  tid: string
  date: string
  price: string
  amount: string
  type: 'buy' | 'sell'
}

export interface TradeWebSocketState {
  trades: TradeData[]
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error'
  lastUpdate: number
  retryCount: number
  newTradesIds: string[]
  initialDataLoaded?: boolean
}

class TradeWebSocketManager {
  private static instance: TradeWebSocketManager
  private websockets: Map<string, WebSocket> = new Map()
  private subscribers: Map<string, Set<(data: TradeData[]) => void>> = new Map()
  private reconnectTimers: Map<string, NodeJS.Timeout> = new Map()
  private state: Map<string, TradeWebSocketState> = new Map()
  private stateListeners: Map<string, Set<(state: TradeWebSocketState) => void>> = new Map()
  private previousTradesRef: Map<string, { [key: string]: boolean }> = new Map()
  
  // Debug method to log active connections
  getActiveConnections(): string[] {
    return [...this.websockets.keys()]
  }

  static getInstance(): TradeWebSocketManager {
    if (!TradeWebSocketManager.instance) {
      TradeWebSocketManager.instance = new TradeWebSocketManager()
    }
    return TradeWebSocketManager.instance
  }

  private getDefaultState(): TradeWebSocketState {
    return {
      trades: [],
      connectionStatus: 'disconnected',
      lastUpdate: 0,
      retryCount: 0,
      newTradesIds: []
    }
  }

  private getOrCreateState(key: string): TradeWebSocketState {
    if (!this.state.has(key)) {
      this.state.set(key, this.getDefaultState())
    }
    return this.state.get(key)!
  }

  private updateState(key: string, updates: Partial<TradeWebSocketState>): void {
    const currentState = this.getOrCreateState(key)
    const newState = { ...currentState, ...updates }
    this.state.set(key, newState)
    
    // Notify subscribers
    const listeners = this.stateListeners.get(key)
    if (listeners) {
      listeners.forEach(listener => listener(newState))
    }
  }

  subscribe(pair: string, exchange: string, callback: (data: TradeData[]) => void): () => void {
    const key = `${exchange}_${pair}`
    
    if (!this.subscribers.has(key)) {
      this.subscribers.set(key, new Set())
    }
    this.subscribers.get(key)!.add(callback)

    // Connect to appropriate exchange
    if (exchange === 'indodax') {
      this.connectIndodaxTrades(pair)
    } else if (exchange === 'bybit') {
      this.connectBybitTrades(pair)
    }

    // Return unsubscribe function
    return () => {
      const symbolSubscribers = this.subscribers.get(key)
      if (symbolSubscribers) {
        symbolSubscribers.delete(callback)
        if (symbolSubscribers.size === 0) {
          this.subscribers.delete(key)
          this.disconnect(key)
        }
      }
    }
  }

  subscribeToState(pair: string, exchange: string, callback: (state: TradeWebSocketState) => void): () => void {
    const key = `${exchange}_${pair}`
    
    if (!this.stateListeners.has(key)) {
      this.stateListeners.set(key, new Set())
    }
    
    this.stateListeners.get(key)!.add(callback)
    
    // Immediate callback with current state
    const currentState = this.getOrCreateState(key)
    callback(currentState)
    
    return () => {
      const listeners = this.stateListeners.get(key)
      if (listeners) {
        listeners.delete(callback)
        if (listeners.size === 0) {
          this.stateListeners.delete(key)
        }
      }
    }
  }

  connectIndodaxTrades(symbol: string): void {
    const key = `indodax_${symbol}`
    
    if (this.websockets.has(key)) {
      return // Already connected
    }

    this.updateState(key, { connectionStatus: 'connecting' })
    
    try {
      // Indodax WebSocket for trades
      const ws = new WebSocket('wss://ws3.indodax.com/ws/')
      
      ws.onopen = () => {
        console.log(`[TradeWebSocket] Connected to Indodax for ${symbol} trades`)
        
        // Auth with token
        ws.send(JSON.stringify({
          params: {
            token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE5NDY2MTg0MTV9.UR1lBM6Eqh0yWz-PVirw1uPCxe60FdchR8eNVdsskeo"
          },
          id: 1
        }))
      }
      
      ws.onmessage = (event) => {
        try {
          const response = JSON.parse(event.data)
          
          // Handle authentication success
          if (response.id === 1 && response.result) {
            console.log(`[TradeWebSocket] Authenticated with Indodax`)
            
            // Subscribe to trade activity channel
            ws.send(JSON.stringify({
              method: 1,
              params: {
                channel: `market:trade-activity-${symbol}`
              },
              id: 2
            }))
            
            this.updateState(key, { 
              connectionStatus: 'connected',
              retryCount: 0
            })
          }
          
          // Handle subscription success
          else if (response.id === 2 && response.result) {
            console.log(`[TradeWebSocket] Subscribed to Indodax trades for ${symbol}`)
          }
          
          // Handle trade data
          else if (response.result && response.result.channel === `market:trade-activity-${symbol}`) {
            const tradeData = response.result.data.data
            if (Array.isArray(tradeData) && tradeData.length > 0) {
              const trades = tradeData.map(trade => ({
                tid: `${trade[2]}`, // sequence number as ID
                date: `${trade[1]}`, // timestamp
                price: `${trade[4]}`, // price
                amount: `${trade[6]}`, // amount
                type: trade[3].toLowerCase() === 'buy' ? 'buy' : 'sell' as 'buy' | 'sell'
              }))
              
              // Process new trades
              const currentState = this.getOrCreateState(key)
              const allTrades = [...trades, ...currentState.trades].slice(0, 20) // Keep most recent 20
              
              // Identify new trades
              const currentTradeIds: { [key: string]: boolean } = {}
              const newTradeIds: string[] = []
              
              const previousTrades = this.previousTradesRef.get(key) || {}
              
              trades.forEach(trade => {
                const tradeId = trade.tid
                currentTradeIds[tradeId] = true
                
                // If this trade wasn't in our previous set, mark it as new
                if (!previousTrades[tradeId]) {
                  newTradeIds.push(tradeId)
                }
              })
              
              // Update previous trades ref for next comparison
              this.previousTradesRef.set(key, {...previousTrades, ...currentTradeIds})
              
              // Update state
              this.updateState(key, {
                trades: allTrades,
                lastUpdate: Date.now(),
                newTradesIds: newTradeIds
              })
              
              // Notify subscribers
              const subscribers = this.subscribers.get(key)
              if (subscribers) {
                subscribers.forEach(callback => callback(allTrades))
              }
            }
          }
        } catch (error) {
          console.error('[TradeWebSocket] Error parsing WebSocket message:', error)
        }
      }
      
      ws.onclose = () => {
        console.log(`[TradeWebSocket] Disconnected from Indodax for ${symbol} trades`)
        this.websockets.delete(key)
        this.updateState(key, { connectionStatus: 'disconnected' })
        this.scheduleReconnect(key)
      }
      
      ws.onerror = (error) => {
        console.error(`[TradeWebSocket] Error for ${symbol} trades:`, error)
        this.updateState(key, { connectionStatus: 'error' })
        // We'll let onclose handle reconnection
      }
      
      this.websockets.set(key, ws)
    } catch (error) {
      console.error('[TradeWebSocket] Failed to connect to Indodax WebSocket:', error)
      this.updateState(key, { connectionStatus: 'error' })
      this.scheduleReconnect(key)
    }
  }

  connectBybitTrades(symbol: string): void {
    const key = `bybit_${symbol}`
    
    if (this.websockets.has(key)) {
      return // Already connected
    }

    this.updateState(key, { connectionStatus: 'connecting' })

    try {
      const ws = new WebSocket('wss://stream.bybit.com/v5/public/linear')
      
      ws.onopen = () => {
        console.log(`[TradeWebSocket] Connected to Bybit for ${symbol} trades`)
        this.updateState(key, { 
          connectionStatus: 'connected', 
          retryCount: 0 
        })

        // Subscribe to trades
        ws.send(JSON.stringify({
          op: 'subscribe',
          args: [`publicTrade.${symbol.toUpperCase()}`]
        }))
      }

      ws.onmessage = (event) => {
        try {
          const response = JSON.parse(event.data)
          
          // Handle pong message
          if (response.op === 'pong') {
            return
          }
          
          // Handle subscription success
          if (response.success && response.op === 'subscribe') {
            console.log(`[TradeWebSocket] Subscribed to Bybit trades for ${symbol}`)
            return
          }
          
          // Handle trade data
          if (response.topic && response.topic === `publicTrade.${symbol.toUpperCase()}` && response.data) {
            const tradeData = response.data
            if (Array.isArray(tradeData) && tradeData.length > 0) {
              const bybitTrades = tradeData.map(trade => ({
                tid: trade.i || trade.execId || `${trade.T}`, // trade ID
                date: Math.floor(trade.T / 1000).toString(), // convert ms to seconds
                price: trade.p,
                amount: trade.v,
                type: trade.S?.toLowerCase() === 'buy' ? 'buy' as const : 'sell' as const
              }))
              
              // Process new trades
              const currentState = this.getOrCreateState(key)
              const allTrades = [...bybitTrades, ...currentState.trades].slice(0, 20) // Keep most recent 20
              
              // Identify new trades
              const currentTradeIds: { [key: string]: boolean } = {}
              const newTradeIds: string[] = []
              
              const previousTrades = this.previousTradesRef.get(key) || {}
              
              bybitTrades.forEach(trade => {
                const tradeId = trade.tid
                currentTradeIds[tradeId] = true
                
                // If this trade wasn't in our previous set, mark it as new
                if (!previousTrades[tradeId]) {
                  newTradeIds.push(tradeId)
                }
              })
              
              // Update previous trades ref for next comparison
              this.previousTradesRef.set(key, {...previousTrades, ...currentTradeIds})
              
              // Update state
              this.updateState(key, {
                trades: allTrades,
                lastUpdate: Date.now(),
                newTradesIds: newTradeIds
              })
              
              // Notify subscribers
              const subscribers = this.subscribers.get(key)
              if (subscribers) {
                subscribers.forEach(callback => callback(allTrades))
              }
            }
          }
        } catch (error) {
          console.error('[TradeWebSocket] Error parsing WebSocket message:', error)
        }
      }

      // Set up ping interval to keep connection alive
      const pingInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ op: 'ping' }))
        }
      }, 20000) // Ping every 20 seconds

      ws.onclose = () => {
        console.log(`[TradeWebSocket] Disconnected from Bybit for ${symbol} trades`)
        clearInterval(pingInterval)
        this.websockets.delete(key)
        this.updateState(key, { connectionStatus: 'disconnected' })
        this.scheduleReconnect(key)
      }

      ws.onerror = (error) => {
        console.error(`[TradeWebSocket] Error for ${symbol} trades:`, error)
        this.updateState(key, { connectionStatus: 'error' })
        // We'll let onclose handle reconnection
      }

      this.websockets.set(key, ws)
    } catch (error) {
      console.error('[TradeWebSocket] Failed to connect to Bybit WebSocket:', error)
      this.updateState(key, { connectionStatus: 'error' })
      this.scheduleReconnect(key)
    }
  }

  private scheduleReconnect(key: string): void {
    const existingTimer = this.reconnectTimers.get(key)
    if (existingTimer) {
      clearTimeout(existingTimer)
    }

    const currentState = this.getOrCreateState(key)
    const retryDelay = Math.min(1000 * Math.pow(2, currentState.retryCount), 30000) // Max 30 seconds
    
    const timer = setTimeout(() => {
      console.log(`[TradeWebSocket] Attempting reconnect for ${key}`)
      this.updateState(key, { retryCount: currentState.retryCount + 1 })
      
      const [exchange, symbol] = key.split('_')
      if (exchange === 'indodax') {
        this.connectIndodaxTrades(symbol)
      } else if (exchange === 'bybit') {
        this.connectBybitTrades(symbol)
      }
    }, retryDelay)

    this.reconnectTimers.set(key, timer)
  }

  disconnect(key: string): void {
    console.log(`[TradeWebSocket] Disconnecting ${key}`)
    
    const ws = this.websockets.get(key)
    if (ws) {
      try {
        ws.close()
      } catch (err) {
        console.error(`[TradeWebSocket] Error closing WebSocket for ${key}:`, err)
      }
      this.websockets.delete(key)
    }

    const timer = this.reconnectTimers.get(key)
    if (timer) {
      clearTimeout(timer)
      this.reconnectTimers.delete(key)
    }

    // Reset state for this key
    this.state.set(key, this.getDefaultState())
    
    // Clear previous trades references
    this.previousTradesRef.delete(key)
    
    // Notify all subscribers about the reset state
    const stateListeners = this.stateListeners.get(key)
    if (stateListeners) {
      const resetState = this.getDefaultState()
      stateListeners.forEach(listener => listener(resetState))
    }
    
    console.log(`[TradeWebSocket] State reset for ${key}. Active connections: ${[...this.websockets.keys()].join(', ') || 'none'}`)
  }
}

// Import API services for initial data loading
import { indodaxApiService, bybitApiService, transformBybitTrades } from './api'

// React Hook for trades via WebSocket with API initialization
export function useTradesWebSocket(pair: CoinPair | null, exchange: 'indodax' | 'bybit') {
  const [trades, setTrades] = useState<TradeData[]>([])
  const [connectionStatus, setConnectionStatus] = useState<TradeWebSocketState['connectionStatus']>('disconnected')
  const [lastUpdate, setLastUpdate] = useState(0)
  const [newTradesIds, setNewTradesIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<any>(null)
  const [initialDataLoaded, setInitialDataLoaded] = useState(false)
  const managerRef = useRef<TradeWebSocketManager | null>(null)
  const previousPairIdRef = useRef<string | null>(null)
  const previousExchangeRef = useRef<string | null>(null)
  const unsubscribeRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    if (!managerRef.current) {
      managerRef.current = TradeWebSocketManager.getInstance()
    }
  }, [])

  // Reset state when pair changes
  useEffect(() => {
    const currentPairId = pair?.id || null;
    const currentExchange = exchange || null;
    
    // Check if pair or exchange has changed
    if (previousPairIdRef.current !== currentPairId || 
        previousExchangeRef.current !== currentExchange) {
      console.log(`[useTradesWebSocket] Pair/Exchange changed from ${previousPairIdRef.current}/${previousExchangeRef.current} to ${currentPairId}/${currentExchange}`)
      
      // Clean up previous connection if exists
      if (previousPairIdRef.current && previousExchangeRef.current && managerRef.current) {
        const prevKey = `${previousExchangeRef.current}_${previousPairIdRef.current}`;
        console.log(`[useTradesWebSocket] Disconnecting previous connection: ${prevKey}`);
        managerRef.current.disconnect(prevKey);
      }
      
      // Reset state on pair change
      setTrades([])
      setNewTradesIds([])
      setLoading(true)
      setError(null)
      setInitialDataLoaded(false)
      
      // Update references
      previousPairIdRef.current = currentPairId;
      previousExchangeRef.current = currentExchange;
    }
  }, [pair, exchange])

  // First load data from API to initialize
  useEffect(() => {
    if (!pair || initialDataLoaded) return;
    
    async function loadInitialData() {
      const pairId = pair?.id;
      console.log(`[useTradesWebSocket] Loading initial data for ${pairId} via API`)
      try {
        setLoading(true);
        
        // Safety check - verify we're still on the same pair
        if (pairId !== previousPairIdRef.current) {
          console.log(`[useTradesWebSocket] Pair changed during API fetch, aborting`);
          return;
        }
        
        let apiData: TradeData[] = [];
        
        if (exchange === 'indodax' && pair) {
          const response = await indodaxApiService.getTrades(pair.id);
          if (response.success && response.data) {
            apiData = Array.isArray(response.data) ? response.data.slice(0, 20) : [];
          }
        } else if (pair) {
          const response = await bybitApiService.getRecentTrades(pair.symbol.toUpperCase());
          if (response.success && response.data?.result?.list) {
            apiData = transformBybitTrades(response.data.result.list);
          }
        }
        
        // Double check that pair hasn't changed while API call was in progress
        if (pairId !== previousPairIdRef.current) {
          console.log(`[useTradesWebSocket] Pair changed during API fetch, discarding results`);
          return;
        }
        
        console.log(`[useTradesWebSocket] Loaded ${apiData.length} initial trades via API for ${pairId}`);
        
        if (apiData.length > 0) {
          setTrades(apiData);
          setLastUpdate(Date.now());
          setInitialDataLoaded(true);
          
          // Mark all initial trades as new for UI highlight
          const newIds = apiData.map(trade => trade.tid || `${trade.date}-${trade.price}-${trade.amount}`);
          setNewTradesIds(newIds);
          
          // After 3 seconds, clear the "new" highlights
          setTimeout(() => {
            // Safety check - make sure we're still on the same pair
            if (pairId === previousPairIdRef.current) {
              setNewTradesIds([]);
            }
          }, 3000);
        }
      } catch (err) {
        console.error('[useTradesWebSocket] Error loading initial data:', err);
        // Only set error if we're still on the same pair
        if (pairId === previousPairIdRef.current) {
          setError({ message: 'Failed to load initial trade data' });
        }
      } finally {
        // Only update loading state if we're still on the same pair
        if (pairId === previousPairIdRef.current) {
          setLoading(false);
        }
      }
    }
    
    if (pair) {
      loadInitialData();
    }
  }, [pair, exchange, initialDataLoaded]);

  // Then connect to WebSocket for real-time updates
  useEffect(() => {
    if (!pair || !managerRef.current) {
      return () => {}
    }

    const manager = managerRef.current
    const currentKey = `${exchange}_${pair.id}`;
    
    // Clean up existing connections for this key to ensure fresh state
    manager.disconnect(currentKey);
    
    console.log(`[useTradesWebSocket] Subscribing to ${currentKey}`);
    
    // Subscribe to trades
    const unsubscribeTrades = manager.subscribe(
      pair.id, 
      exchange, 
      (data) => {
        if (data.length > 0) {
          // Safety check - make sure we're still on the same pair
          if (pair.id === previousPairIdRef.current) {
            setTrades(data)
            setLoading(false)
          }
        }
      }
    )

    // Subscribe to state updates
    const unsubscribeState = manager.subscribeToState(
      pair.id, 
      exchange,
      (state) => {
        // Safety check - make sure we're still on the same pair
        if (pair.id !== previousPairIdRef.current) {
          return;
        }
        
        setConnectionStatus(state.connectionStatus)
        setLastUpdate(state.lastUpdate)
        
        // Only update newTradesIds if we already have initial data
        if (initialDataLoaded && state.newTradesIds.length > 0) {
          setNewTradesIds(state.newTradesIds)
        }
        
        // Only show loading if we have no data yet and no initial data
        if (!initialDataLoaded && state.trades.length === 0 && state.connectionStatus === 'connecting') {
          setLoading(true)
        }
        
        if (state.connectionStatus === 'error') {
          setError({ message: 'WebSocket connection error' })
        } else {
          setError(null)
        }
      }
    )
    
    // Store combined unsubscribe function
    const combinedUnsubscribe = () => {
      console.log(`[useTradesWebSocket] Unsubscribing from ${currentKey}`);
      unsubscribeTrades();
      unsubscribeState();
    };
    
    // Store for cleanup when pair changes
    unsubscribeRef.current = combinedUnsubscribe;

    return combinedUnsubscribe;
  }, [pair, exchange, initialDataLoaded])

  return {
    data: trades,
    loading,
    error,
    lastUpdate,
    newTradesIds,
    connectionStatus,
    initialDataLoaded
  }
}

export default TradeWebSocketManager