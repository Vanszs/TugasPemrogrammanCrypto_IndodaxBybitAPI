"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, TrendingUp, TrendingDown, Activity, Wifi, WifiOff, ToggleLeft, ToggleRight, AlertTriangle, RefreshCw } from "lucide-react"

type Exchange = "indodax" | "bybit"
type ConnectionStatus = "connected" | "disconnected" | "connecting" | "error"

interface CoinPair {
  id: string
  symbol: string
  base_currency: string
  traded_currency: string
  traded_currency_unit: string
  description: string
  ticker_id: string
  url_logo: string
  url_logo_png: string
  isActive?: boolean
  lastUpdate?: number
}

interface TickerData {
  high: string
  low: string
  vol_btc?: string
  vol_idr?: string
  last: string
  buy: string
  sell: string
  server_time: number
  name?: string
  lastPrice?: string
  highPrice24h?: string
  lowPrice24h?: string
  volume24h?: string
  price24hPcnt?: string
  bid1Price?: string
  ask1Price?: string
  turnover24h?: string
  lastFetch?: number
}

interface TradeData {
  date: string
  price: string
  amount: string
  tid: string
  type: "buy" | "sell"
  timestamp?: number
}

interface DepthData {
  buy: Array<[string, string]>
  sell: Array<[string, string]>
  lastUpdate?: number
}

// Improved API client with better error handling
class ApiClient {
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
    console.log('[API] Fetching:', url)

    try {
      const response = await this.fetchWithTimeout(url)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      return await response.json()
    } catch (error) {
      console.log('[API] Direct fetch failed, trying proxies...')
      
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
          console.log('[API] Proxy failed:', proxyError)
          continue
        }
      }

      throw new Error('All API endpoints failed')
    }
  }

  async get(url: string): Promise<{ data?: any; error?: string; success: boolean }> {
    try {
      const data = await this.fetchWithProxy(url)
      return { data, success: true }
    } catch (error) {
      return { 
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false 
      }
    }
  }
}

const apiClient = new ApiClient()

// Connection Status Component
const ConnectionStatusBadge = ({ status, exchange }: { status: ConnectionStatus; exchange: string }) => {
  const config = {
    connected: {
      variant: "default" as const,
      icon: Wifi,
      text: "Live Data",
      className: "bg-emerald-500 hover:bg-emerald-600 animate-pulse"
    },
    connecting: {
      variant: "secondary" as const,
      icon: Activity,
      text: "Connecting...",
      className: "animate-pulse"
    },
    error: {
      variant: "destructive" as const,
      icon: AlertTriangle,
      text: "Error",
      className: ""
    },
    disconnected: {
      variant: "secondary" as const,
      icon: WifiOff,
      text: "Offline",
      className: ""
    }
  }

  const { variant, icon: Icon, text, className } = config[status]

  return (
    <Badge variant={variant} className={className}>
      <Icon className={`w-4 h-4 mr-2 ${status === "connecting" ? "animate-spin" : ""}`} />
      {text} - {exchange}
    </Badge>
  )
}

// Loading components
const LoadingSkeleton = ({ lines = 3 }: { lines?: number }) => (
  <div className="space-y-3">
    {Array.from({ length: lines }).map((_, i) => (
      <div key={i} className="h-4 bg-muted/40 rounded animate-pulse" style={{ width: `${80 + Math.random() * 20}%` }} />
    ))}
  </div>
)

const CryptoListSkeleton = () => (
  <div className="space-y-2">
    {Array.from({ length: 8 }).map((_, i) => (
      <div key={i} className="p-4 border border-border/30 rounded-xl animate-pulse">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 bg-muted/40 rounded-full" />
          <div className="flex-1 space-y-2">
            <div className="h-5 bg-muted/40 rounded w-20" />
            <div className="h-4 bg-muted/30 rounded w-32" />
          </div>
        </div>
      </div>
    ))}
  </div>
)

const TickerSkeleton = () => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
    {Array.from({ length: 4 }).map((_, i) => (
      <div key={i} className="space-y-2 p-4 rounded-xl bg-muted/20 animate-pulse">
        <div className="h-5 bg-muted/30 rounded w-20" />
        <div className="h-7 bg-muted/40 rounded w-28" />
      </div>
    ))}
  </div>
)

// Error component
const ErrorDisplay = ({ error, onRetry }: { error: string; onRetry: () => void }) => (
  <div className="text-center py-8">
    <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-destructive/10 flex items-center justify-center">
      <AlertTriangle className="w-6 h-6 text-destructive" />
    </div>
    <p className="text-destructive font-medium mb-2">Error</p>
    <p className="text-sm text-muted-foreground mb-4">{error}</p>
    <Button onClick={onRetry} variant="outline" size="sm">
      <RefreshCw className="w-4 h-4 mr-2" />
      Retry
    </Button>
  </div>
)

export default function CryptoViewer() {
  const [currentExchange, setCurrentExchange] = useState<Exchange>("indodax")
  const [pairs, setPairs] = useState<CoinPair[]>([])
  const [filteredPairs, setFilteredPairs] = useState<CoinPair[]>([])
  const [selectedPair, setSelectedPair] = useState<CoinPair | null>(null)
  const [tickerData, setTickerData] = useState<TickerData | null>(null)
  const [trades, setTrades] = useState<TradeData[]>([])
  const [depth, setDepth] = useState<DepthData | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(true)
  const [tickerLoading, setTickerLoading] = useState(false)
  const [tradesLoading, setTradesLoading] = useState(false)
  const [depthLoading, setDepthLoading] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("disconnected")
  const [error, setError] = useState<string | null>(null)

  // Fetch pairs for current exchange
  const fetchPairs = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      setConnectionStatus("connecting")

      console.log(`[API] Fetching ${currentExchange} pairs...`)

      let response
      if (currentExchange === "indodax") {
        response = await apiClient.get("https://indodax.com/api/pairs")
        if (response.success && Array.isArray(response.data)) {
          const limitedPairs = response.data.slice(0, 400)
          setPairs(limitedPairs)
          setFilteredPairs(limitedPairs)
        } else {
          throw new Error(response.error || "Failed to fetch Indodax pairs")
        }
      } else {
        response = await apiClient.get("https://api.bybit.com/v5/market/instruments-info?category=linear&limit=400")
        if (response.success && response.data?.result?.list) {
          const instruments = response.data.result.list
          const convertedPairs: CoinPair[] = instruments.map((instrument: any) => ({
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
          setPairs(convertedPairs)
          setFilteredPairs(convertedPairs)
        } else {
          throw new Error(response.error || "Failed to fetch Bybit instruments")
        }
      }

      setConnectionStatus("connected")
      console.log(`[API] Successfully loaded ${pairs.length} pairs`)
    } catch (err) {
      console.error("[API] Error fetching pairs:", err)
      setError(err instanceof Error ? err.message : "Failed to load data")
      setConnectionStatus("error")
      setPairs([])
      setFilteredPairs([])
    } finally {
      setLoading(false)
    }
  }, [currentExchange])

  // Fetch ticker data
  const fetchTicker = useCallback(async (pair: CoinPair) => {
    try {
      setTickerLoading(true)
      console.log(`[API] Fetching ticker for ${pair.id} on ${currentExchange}`)

      let response
      if (currentExchange === "indodax") {
        response = await apiClient.get(`https://indodax.com/api/ticker/${pair.id}`)
        if (response.success && response.data) {
          const ticker = response.data.ticker || response.data
          setTickerData({ ...ticker, lastFetch: Date.now() })
        }
      } else {
        response = await apiClient.get(`https://api.bybit.com/v5/market/tickers?category=linear&symbol=${pair.symbol.toUpperCase()}`)
        if (response.success && response.data?.result?.list?.[0]) {
          const ticker = response.data.result.list[0]
          setTickerData({
            last: ticker.lastPrice,
            high: ticker.highPrice24h,
            low: ticker.lowPrice24h,
            vol_idr: ticker.turnover24h,
            buy: ticker.bid1Price,
            sell: ticker.ask1Price,
            server_time: Date.now() / 1000,
            lastFetch: Date.now()
          })
        }
      }

      if (!response?.success) {
        throw new Error(response?.error || "Failed to fetch ticker")
      }
    } catch (err) {
      console.error("[API] Error fetching ticker:", err)
      setTickerData(null)
    } finally {
      setTickerLoading(false)
    }
  }, [currentExchange])

  // Fetch trades data
  const fetchTrades = useCallback(async (pair: CoinPair) => {
    try {
      setTradesLoading(true)
      console.log(`[API] Fetching trades for ${pair.id} on ${currentExchange}`)

      let response
      if (currentExchange === "indodax") {
        response = await apiClient.get(`https://indodax.com/api/trades/${pair.id}`)
        if (response.success && Array.isArray(response.data)) {
          setTrades(response.data.slice(0, 20))
        }
      } else {
        response = await apiClient.get(`https://api.bybit.com/v5/market/recent-trade?category=linear&symbol=${pair.symbol.toUpperCase()}&limit=20`)
        if (response.success && response.data?.result?.list) {
          const convertedTrades = response.data.result.list.map((trade: any) => ({
            date: (trade.time / 1000).toString(),
            price: trade.price,
            amount: trade.size,
            tid: trade.execId,
            type: trade.side.toLowerCase() as "buy" | "sell",
            timestamp: trade.time
          }))
          setTrades(convertedTrades)
        }
      }

      if (!response?.success) {
        throw new Error(response?.error || "Failed to fetch trades")
      }
    } catch (err) {
      console.error("[API] Error fetching trades:", err)
      setTrades([])
    } finally {
      setTradesLoading(false)
    }
  }, [currentExchange])

  // Fetch depth data
  const fetchDepth = useCallback(async (pair: CoinPair) => {
    try {
      setDepthLoading(true)
      console.log(`[API] Fetching depth for ${pair.id} on ${currentExchange}`)

      let response
      if (currentExchange === "indodax") {
        response = await apiClient.get(`https://indodax.com/api/depth/${pair.id}`)
        if (response.success && response.data) {
          setDepth({ ...response.data, lastUpdate: Date.now() })
        }
      } else {
        response = await apiClient.get(`https://api.bybit.com/v5/market/orderbook?category=linear&symbol=${pair.symbol.toUpperCase()}&limit=50`)
        if (response.success && response.data?.result) {
          setDepth({
            buy: response.data.result.b || [],
            sell: response.data.result.a || [],
            lastUpdate: Date.now()
          })
        }
      }

      if (!response?.success) {
        throw new Error(response?.error || "Failed to fetch depth")
      }
    } catch (err) {
      console.error("[API] Error fetching depth:", err)
      setDepth(null)
    } finally {
      setDepthLoading(false)
    }
  }, [currentExchange])

  // Handle exchange toggle
  const handleExchangeToggle = useCallback(() => {
    const newExchange = currentExchange === "indodax" ? "bybit" : "indodax"
    setCurrentExchange(newExchange)
    setSelectedPair(null)
    setTickerData(null)
    setTrades([])
    setDepth(null)
    setSearchTerm("")
    setError(null)
    console.log(`[UI] Switched to ${newExchange}`)
  }, [currentExchange])

  // Handle pair selection
  const handlePairSelect = useCallback((pair: CoinPair) => {
    setSelectedPair(pair)
    setTickerData(null)
    setTrades([])
    setDepth(null)

    // Fetch data for selected pair
    fetchTicker(pair)
    fetchTrades(pair)
    fetchDepth(pair)
  }, [fetchTicker, fetchTrades, fetchDepth])

  // Filter pairs based on search
  useEffect(() => {
    if (searchTerm.trim()) {
      const sanitized = searchTerm.trim().toLowerCase()
      const filtered = pairs.filter(pair =>
        pair.symbol.toLowerCase().includes(sanitized) ||
        pair.description.toLowerCase().includes(sanitized) ||
        pair.traded_currency_unit.toLowerCase().includes(sanitized)
      )
      setFilteredPairs(filtered)
    } else {
      setFilteredPairs(pairs)
    }
  }, [searchTerm, pairs])

  // Auto-refresh data
  useEffect(() => {
    if (selectedPair && connectionStatus === "connected") {
      const interval = setInterval(() => {
        console.log("[UI] Auto-refreshing data...")
        fetchTicker(selectedPair)
        fetchTrades(selectedPair)
        fetchDepth(selectedPair)
      }, 10000)

      return () => clearInterval(interval)
    }
  }, [selectedPair, connectionStatus, fetchTicker, fetchTrades, fetchDepth])

  // Load pairs on exchange change
  useEffect(() => {
    fetchPairs()
  }, [fetchPairs])

  // Format currency
  const formatCurrency = useCallback((value: string, currency = "IDR") => {
    const num = parseFloat(value)
    if (isNaN(num)) return "..."

    if (currentExchange === "indodax" && currency === "IDR") {
      return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(num)
    }

    if (currentExchange === "bybit") {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
        maximumFractionDigits: 8,
      }).format(num)
    }

    return num.toLocaleString("id-ID", {
      minimumFractionDigits: 8,
      maximumFractionDigits: 8,
    })
  }, [currentExchange])

  if (loading && pairs.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-slate-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center space-y-6">
            <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
              <Activity className="w-8 h-8 text-primary animate-spin" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-semibold">Loading Crypto Data</h2>
              <p className="text-muted-foreground">Fetching latest market information...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-slate-900 p-4">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <Card className="glass border-0 shadow-2xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-bold gradient-text mb-2">
                  {currentExchange === "indodax" ? "Indodax" : "Bybit"} Crypto Viewer
                </h1>
                <p className="text-muted-foreground text-lg">Real-time cryptocurrency data with modern interface</p>
              </div>
              <div className="flex items-center gap-4">
                <Button
                  onClick={handleExchangeToggle}
                  variant="outline"
                  size="lg"
                  className="flex items-center gap-3 px-6 py-3 rounded-xl hover:scale-105 hover:shadow-lg"
                >
                  {currentExchange === "indodax" ? (
                    <>
                      <ToggleLeft className="w-5 h-5 text-primary" />
                      <span className="font-semibold">Indodax</span>
                      <span className="text-muted-foreground">→ Bybit</span>
                    </>
                  ) : (
                    <>
                      <ToggleRight className="w-5 h-5 text-primary" />
                      <span className="font-semibold">Bybit</span>
                      <span className="text-muted-foreground">→ Indodax</span>
                    </>
                  )}
                </Button>

                <ConnectionStatusBadge status={connectionStatus} exchange={currentExchange} />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Pair List */}
          <div className="lg:col-span-1">
            <Card className="glass border-0 shadow-2xl">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl font-semibold flex items-center gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                  Cryptocurrency Pairs ({pairs.length}/400)
                </CardTitle>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                  <Input
                    placeholder="Search coins..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-12 h-12 bg-input/50 border-border/50 rounded-xl"
                  />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {error ? (
                    <ErrorDisplay error={error} onRetry={fetchPairs} />
                  ) : loading ? (
                    <CryptoListSkeleton />
                  ) : filteredPairs.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      No coins found
                    </div>
                  ) : (
                    filteredPairs.map((pair, index) => (
                      <Button
                        key={pair.id}
                        variant={selectedPair?.id === pair.id ? "default" : "ghost"}
                        className={`w-full justify-start p-4 h-auto rounded-xl transition-all duration-200 hover:scale-[1.02] hover:shadow-lg ${
                          selectedPair?.id === pair.id
                            ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                            : "hover:bg-accent/50"
                        }`}
                        onClick={() => handlePairSelect(pair)}
                      >
                        <div className="flex items-center gap-4 w-full">
                          <div className="relative">
                            <img
                              src={pair.url_logo_png || "/placeholder.svg?height=32&width=32"}
                              alt={pair.traded_currency_unit}
                              className="w-8 h-8 rounded-full ring-2 ring-border/20"
                              onError={(e) => {
                                e.currentTarget.src = "/crypto-digital-landscape.png"
                              }}
                            />
                            {selectedPair?.id === pair.id && (
                              <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full animate-pulse"></div>
                            )}
                          </div>
                          <div className="text-left flex-1">
                            <div className="font-semibold text-base">{pair.traded_currency_unit}</div>
                            <div className="text-sm text-muted-foreground truncate">{pair.description}</div>
                          </div>
                        </div>
                      </Button>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2">
            {selectedPair ? (
              <div className="space-y-8">
                {/* Ticker Data */}
                <Card className="glass border-0 shadow-2xl">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-4 text-2xl">
                      <div className="relative">
                        <img
                          src={selectedPair.url_logo_png || "/placeholder.svg?height=40&width=40"}
                          alt={selectedPair.traded_currency_unit}
                          className="w-10 h-10 rounded-full ring-2 ring-primary/20"
                          onError={(e) => {
                            e.currentTarget.src = "/crypto-digital-landscape.png"
                          }}
                        />
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-400 rounded-full border-2 border-background"></div>
                      </div>
                      <div>
                        <div className="gradient-text">{selectedPair.description}</div>
                        <div className="text-sm text-muted-foreground font-normal">{selectedPair.symbol}</div>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {tickerLoading ? (
                      <TickerSkeleton />
                    ) : tickerData ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="space-y-2 p-4 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
                          <p className="text-sm text-muted-foreground font-medium">Last Price</p>
                          <p className="text-2xl font-bold text-primary break-words">
                            {formatCurrency(tickerData.last)}
                          </p>
                        </div>
                        <div className="space-y-2 p-4 rounded-xl bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20">
                          <p className="text-sm text-muted-foreground font-medium">24h High</p>
                          <p className="text-xl font-bold text-emerald-400 break-words">
                            {formatCurrency(tickerData.high)}
                          </p>
                        </div>
                        <div className="space-y-2 p-4 rounded-xl bg-gradient-to-br from-red-500/10 to-red-500/5 border border-red-500/20">
                          <p className="text-sm text-muted-foreground font-medium">24h Low</p>
                          <p className="text-xl font-bold text-red-400 break-words">
                            {formatCurrency(tickerData.low)}
                          </p>
                        </div>
                        <div className="space-y-2 p-4 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20">
                          <p className="text-sm text-muted-foreground font-medium">Volume</p>
                          <p className="text-xl font-bold text-blue-400 break-words">
                            {tickerData.vol_idr ? formatCurrency(tickerData.vol_idr) : "..."}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        No ticker data available
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Trades and Order Book */}
                <Tabs defaultValue="trades" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 bg-muted/30 p-1 rounded-xl">
                    <TabsTrigger value="trades" className="rounded-lg">
                      Recent Trades
                    </TabsTrigger>
                    <TabsTrigger value="orderbook" className="rounded-lg">
                      Order Book
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="trades" className="mt-6">
                    <Card className="glass border-0 shadow-xl">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Activity className="w-5 h-5 text-primary" />
                          Recent Trades
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2 max-h-80 overflow-y-auto">
                          {tradesLoading ? (
                            <LoadingSkeleton lines={10} />
                          ) : trades.length > 0 ? (
                            trades.map((trade, index) => (
                              <div
                                key={trade.tid || index}
                                className="flex justify-between items-center p-4 rounded-xl bg-muted/20 hover:bg-muted/30 transition-colors border border-border/30"
                              >
                                <div className="flex items-center gap-3">
                                  {trade.type === "buy" ? (
                                    <div className="p-2 rounded-full bg-emerald-500/20">
                                      <TrendingUp className="w-4 h-4 text-emerald-400" />
                                    </div>
                                  ) : (
                                    <div className="p-2 rounded-full bg-red-500/20">
                                      <TrendingDown className="w-4 h-4 text-red-400" />
                                    </div>
                                  )}
                                  <span className="font-semibold">{formatCurrency(trade.price)}</span>
                                </div>
                                <div className="text-right">
                                  <div className="font-medium">{parseFloat(trade.amount).toFixed(8)}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {new Date(parseInt(trade.date) * 1000).toLocaleTimeString()}
                                  </div>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="text-center py-12 text-muted-foreground">
                              <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
                              No trades available
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="orderbook" className="mt-6">
                    <Card className="glass border-0 shadow-xl">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Activity className="w-5 h-5 text-primary" />
                          Order Book
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {depthLoading ? (
                          <LoadingSkeleton lines={15} />
                        ) : depth ? (
                          <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-3">
                              <h4 className="font-semibold text-emerald-400 flex items-center gap-2">
                                <TrendingUp className="w-4 h-4" />
                                Buy Orders
                              </h4>
                              <div className="space-y-2 max-h-64 overflow-y-auto">
                                {depth.buy.slice(0, 15).map(([price, amount], index) => (
                                  <div
                                    key={index}
                                    className="flex justify-between text-sm p-2 rounded-lg bg-emerald-500/5 hover:bg-emerald-500/10 transition-colors"
                                  >
                                    <span className="text-emerald-400 font-medium">{formatCurrency(price)}</span>
                                    <span className="text-muted-foreground">{parseFloat(amount).toFixed(8)}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                            <div className="space-y-3">
                              <h4 className="font-semibold text-red-400 flex items-center gap-2">
                                <TrendingDown className="w-4 h-4" />
                                Sell Orders
                              </h4>
                              <div className="space-y-2 max-h-64 overflow-y-auto">
                                {depth.sell.slice(0, 15).map(([price, amount], index) => (
                                  <div
                                    key={index}
                                    className="flex justify-between text-sm p-2 rounded-lg bg-red-500/5 hover:bg-red-500/10 transition-colors"
                                  >
                                    <span className="text-red-400 font-medium">{formatCurrency(price)}</span>
                                    <span className="text-muted-foreground">{parseFloat(amount).toFixed(8)}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-12 text-muted-foreground">
                            <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            No order book data available
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </div>
            ) : (
              <Card className="glass border-0 shadow-2xl">
                <CardContent className="flex items-center justify-center h-96">
                  <div className="text-center">
                    <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                      <Activity className="w-12 h-12 text-primary animate-pulse" />
                    </div>
                    <h3 className="text-2xl font-bold mb-3 gradient-text">Select a Cryptocurrency</h3>
                    <p className="text-muted-foreground text-lg">
                      Choose a coin from the list to view its real-time trading data
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}