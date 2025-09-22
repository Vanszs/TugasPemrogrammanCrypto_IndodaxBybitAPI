"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, TrendingUp, TrendingDown, Activity, Wifi, WifiOff, ToggleLeft, ToggleRight } from "lucide-react"

type Exchange = "indodax" | "bybit"

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
}

interface BybitInstrument {
  symbol: string
  contractType: string
  status: string
  baseCoin: string
  quoteCoin: string
  settleCoin: string
  launchTime: string
  priceScale: string
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
  // Bybit specific fields
  lastPrice?: string
  highPrice24h?: string
  lowPrice24h?: string
  volume24h?: string
  price24hPcnt?: string
  bid1Price?: string
  ask1Price?: string
}

interface TradeData {
  date: string
  price: string
  amount: string
  tid: string
  type: string
}

interface DepthData {
  buy: Array<[string, string]>
  sell: Array<[string, string]>
}

const INDODAX_BASE_URL = "https://indodax.com/api"
const INDODAX_WS_URL = "wss://ws3.indodax.com/ws/"
const INDODAX_WS_TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE5NDY2MTg0MTV9.UR1lBM6Eqh0yWz-PVirw1uPCxe60FdchR8eNVdsskeo"

const BYBIT_BASE_URL = "https://api.bybit.com"
const BYBIT_WS_URLS = {
  linear: "wss://stream.bybit.com/v5/public/linear",
  spot: "wss://stream.bybit.com/v5/public/spot",
  inverse: "wss://stream.bybit.com/v5/public/inverse",
}

export default function CryptoViewer() {
  const [currentExchange, setCurrentExchange] = useState<Exchange>("indodax")
  const [pairs, setPairs] = useState<CoinPair[]>([])
  const [bybitInstruments, setBybitInstruments] = useState<BybitInstrument[]>([])
  const [filteredPairs, setFilteredPairs] = useState<CoinPair[]>([])
  const [selectedPair, setSelectedPair] = useState<CoinPair | null>(null)
  const [tickerData, setTickerData] = useState<TickerData | null>(null)
  const [trades, setTrades] = useState<TradeData[]>([])
  const [depth, setDepth] = useState<DepthData | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(true)
  const [connectionStatus, setConnectionStatus] = useState<"connected" | "disconnected" | "connecting">("connecting")
  const [ws, setWs] = useState<WebSocket | null>(null)
  const [wsReconnectAttempts, setWsReconnectAttempts] = useState(0)

  const fetchWithProxy = async (url: string) => {
    console.log("[v0] Attempting to fetch:", url)

    try {
      // Try direct fetch first
      const response = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
        mode: "cors",
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      console.log("[v0] Direct fetch successful")
      return data
    } catch (error) {
      console.log("[v0] Direct fetch failed, trying with proxy...")

      // Try multiple CORS proxies with better error handling
      const proxies = [
        `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
        `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
        `https://thingproxy.freeboard.io/fetch/${url}`,
        `https://cors-proxy.htmldriven.com/?url=${encodeURIComponent(url)}`,
        `https://yacdn.org/proxy/${url}`,
      ]

      let lastError = null

      for (const proxyUrl of proxies) {
        try {
          console.log("[v0] Trying proxy:", proxyUrl)

          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), 10000)

          const response = await fetch(proxyUrl, {
            signal: controller.signal,
            headers: {
              Accept: "application/json",
            },
          })

          clearTimeout(timeoutId)

          if (!response.ok) {
            throw new Error(`Proxy error! status: ${response.status}`)
          }

          const data = await response.json()

          // Handle different proxy response formats
          if (data.contents) {
            try {
              return JSON.parse(data.contents)
            } catch {
              return data.contents
            }
          } else if (data.data) {
            return data.data
          } else if (typeof data === "object" && data !== null) {
            return data
          } else if (typeof data === "string") {
            try {
              return JSON.parse(data)
            } catch {
              return data
            }
          }

          return data
        } catch (proxyError) {
          console.log("[v0] Proxy failed:", proxyError)
          lastError = proxyError
          continue
        }
      }

      console.log("[v0] All proxies failed, returning null instead of throwing")
      return null
    }
  }

  const fetchBybitInstruments = useCallback(async () => {
    try {
      setLoading(true)
      setConnectionStatus("connecting")
      console.log("[v0] Fetching Bybit instruments...")

      const data = await fetchWithProxy(`${BYBIT_BASE_URL}/v5/market/instruments-info?category=linear&limit=400`)

      if (!data || !data.result) {
        console.log("[v0] No Bybit data received")
        throw new Error("Unable to fetch Bybit data")
      }

      console.log("[v0] Bybit instruments data received:", data)

      const instruments = data.result.list || []
      setBybitInstruments(instruments)

      // Convert Bybit instruments to CoinPair format for consistency
      const convertedPairs: CoinPair[] = instruments.map((instrument: BybitInstrument) => ({
        id: instrument.symbol.toLowerCase(),
        symbol: instrument.symbol,
        base_currency: instrument.baseCoin,
        traded_currency: instrument.quoteCoin,
        traded_currency_unit: instrument.baseCoin,
        description: `${instrument.baseCoin}/${instrument.quoteCoin}`,
        ticker_id: instrument.symbol.toLowerCase(),
        url_logo: `/placeholder.svg?height=32&width=32&query=${instrument.baseCoin}`,
        url_logo_png: `/placeholder.svg?height=32&width=32&query=${instrument.baseCoin}`,
      }))

      setPairs(convertedPairs)
      setFilteredPairs(convertedPairs)
      setConnectionStatus("connected")
      console.log("[v0] Successfully loaded", convertedPairs.length, "Bybit pairs")
    } catch (error) {
      console.error("[v0] Error fetching Bybit instruments:", error)
      setConnectionStatus("disconnected")
      setPairs([])
      setFilteredPairs([])
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchIndodaxPairs = useCallback(async () => {
    try {
      setLoading(true)
      setConnectionStatus("connecting")
      console.log("[v0] Fetching Indodax pairs...")

      const data = await fetchWithProxy(`${INDODAX_BASE_URL}/pairs`)

      if (!data) {
        console.log("[v0] No data received from proxies")
        throw new Error("Unable to fetch data from any source")
      }

      console.log("[v0] Indodax pairs data received:", data)

      if (Array.isArray(data)) {
        const limitedPairs = data.slice(0, 400)
        setPairs(limitedPairs)
        setFilteredPairs(limitedPairs)
        setConnectionStatus("connected")
        console.log("[v0] Successfully loaded", limitedPairs.length, "Indodax pairs")
      } else {
        console.log("[v0] Unexpected data format:", data)
        throw new Error("Invalid data format received")
      }
    } catch (error) {
      console.error("[v0] Error fetching Indodax pairs:", error)
      setConnectionStatus("disconnected")
      setPairs([])
      setFilteredPairs([])
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchTickerData = useCallback(
    async (pairId: string) => {
      try {
        console.log("[v0] Fetching ticker for:", pairId, "on", currentExchange)

        let data
        if (currentExchange === "indodax") {
          data = await fetchWithProxy(`${INDODAX_BASE_URL}/ticker/${pairId}`)
          if (data) {
            setTickerData(data.ticker || data)
          }
        } else {
          // Bybit ticker
          const symbol = pairId.toUpperCase()
          data = await fetchWithProxy(`${BYBIT_BASE_URL}/v5/market/tickers?category=linear&symbol=${symbol}`)
          if (data && data.result && data.result.list && data.result.list[0]) {
            const ticker = data.result.list[0]
            setTickerData({
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
            })
          }
        }

        if (!data) {
          console.log("[v0] No ticker data received")
          setTickerData(null)
        }
      } catch (error) {
        console.error("[v0] Error fetching ticker:", error)
        setTickerData(null)
      }
    },
    [currentExchange],
  )

  const fetchTrades = useCallback(
    async (pairId: string) => {
      try {
        console.log("[v0] Fetching trades for:", pairId, "on", currentExchange)

        let data
        if (currentExchange === "indodax") {
          data = await fetchWithProxy(`${INDODAX_BASE_URL}/trades/${pairId}`)
          if (data && Array.isArray(data)) {
            setTrades(data.slice(0, 20))
          }
        } else {
          // Bybit recent trades
          const symbol = pairId.toUpperCase()
          data = await fetchWithProxy(
            `${BYBIT_BASE_URL}/v5/market/recent-trade?category=linear&symbol=${symbol}&limit=20`,
          )
          if (data && data.result && data.result.list) {
            const convertedTrades = data.result.list.map((trade: any) => ({
              date: (trade.time / 1000).toString(),
              price: trade.price,
              amount: trade.size,
              tid: trade.execId,
              type: trade.side.toLowerCase(),
            }))
            setTrades(convertedTrades)
          }
        }

        if (!data) {
          console.log("[v0] No trades data received")
          setTrades([])
        }
      } catch (error) {
        console.error("[v0] Error fetching trades:", error)
        setTrades([])
      }
    },
    [currentExchange],
  )

  const fetchDepth = useCallback(
    async (pairId: string) => {
      try {
        console.log("[v0] Fetching depth for:", pairId, "on", currentExchange)

        let data
        if (currentExchange === "indodax") {
          data = await fetchWithProxy(`${INDODAX_BASE_URL}/depth/${pairId}`)
          if (data) {
            setDepth(data)
          }
        } else {
          // Bybit orderbook
          const symbol = pairId.toUpperCase()
          data = await fetchWithProxy(`${BYBIT_BASE_URL}/v5/market/orderbook?category=linear&symbol=${symbol}&limit=50`)
          if (data && data.result) {
            setDepth({
              buy: data.result.b || [],
              sell: data.result.a || [],
            })
          }
        }

        if (!data) {
          console.log("[v0] No depth data received")
          setDepth(null)
        }
      } catch (error) {
        console.error("[v0] Error fetching depth:", error)
        setDepth(null)
      }
    },
    [currentExchange],
  )

  const connectWebSocket = useCallback(() => {
    if (selectedPair && wsReconnectAttempts < 3) {
      try {
        console.log("[v0] Connecting to WebSocket for", currentExchange)

        let websocketUrl: string
        if (currentExchange === "indodax") {
          websocketUrl = INDODAX_WS_URL
        } else {
          websocketUrl = BYBIT_WS_URLS.linear // Default to linear for USDT perpetuals
        }

        const websocket = new WebSocket(websocketUrl)

        websocket.onopen = () => {
          console.log("[v0] WebSocket connected to", currentExchange)
          setWsReconnectAttempts(0)

          if (currentExchange === "indodax") {
            // Indodax authentication
            websocket.send(
              JSON.stringify({
                params: { token: INDODAX_WS_TOKEN },
                id: 1,
              }),
            )
          } else {
            // Bybit ping to establish connection
            websocket.send(
              JSON.stringify({
                req_id: "100001",
                op: "ping",
              }),
            )
          }
        }

        websocket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            console.log("[v0] WebSocket message received:", data)

            if (currentExchange === "indodax") {
              // Handle Indodax WebSocket messages
              if (data.id === 1 && data.result) {
                console.log("[v0] Indodax WebSocket authenticated, subscribing...")

                // Subscribe to channels
                websocket.send(
                  JSON.stringify({
                    method: 1,
                    params: { channel: "market:summary-24h" },
                    id: 2,
                  }),
                )

                websocket.send(
                  JSON.stringify({
                    method: 1,
                    params: { channel: `market:trade-activity-${selectedPair.ticker_id}` },
                    id: 3,
                  }),
                )

                websocket.send(
                  JSON.stringify({
                    method: 1,
                    params: { channel: `market:order-book-${selectedPair.ticker_id}` },
                    id: 4,
                  }),
                )
              }

              // Handle real-time data updates
              if (data.result && data.result.channel) {
                const channel = data.result.channel
                const channelData = data.result.data

                if (channel === "market:summary-24h" && channelData.data) {
                  const pairData = channelData.data.find((item: any[]) => item[0] === selectedPair.ticker_id)
                  if (pairData) {
                    setTickerData({
                      last: pairData[2].toString(),
                      low: pairData[3].toString(),
                      high: pairData[4].toString(),
                      vol_idr: pairData[6],
                      buy: pairData[2].toString(),
                      sell: pairData[2].toString(),
                      server_time: pairData[1],
                    })
                  }
                }

                if (channel.startsWith("market:trade-activity-") && channelData.data) {
                  const newTrades = channelData.data.map((trade: any[]) => ({
                    date: trade[1].toString(),
                    price: trade[4].toString(),
                    amount: trade[6],
                    tid: trade[2].toString(),
                    type: trade[3],
                  }))
                  setTrades((prev) => [...newTrades, ...prev].slice(0, 20))
                }

                if (channel.startsWith("market:order-book-") && channelData.data) {
                  const orderBookData = channelData.data
                  if (orderBookData.ask && orderBookData.bid) {
                    setDepth({
                      buy: orderBookData.bid.map((item: any) => [item.price, item.btc_volume || item.idr_volume]),
                      sell: orderBookData.ask.map((item: any) => [item.price, item.btc_volume || item.idr_volume]),
                    })
                  }
                }
              }
            } else {
              // Handle Bybit WebSocket messages
              if (data.success && data.ret_msg === "pong") {
                console.log("[v0] Bybit WebSocket ping successful, subscribing...")

                // Subscribe to Bybit channels
                const symbol = selectedPair.symbol
                websocket.send(
                  JSON.stringify({
                    req_id: "10001",
                    op: "subscribe",
                    args: [`tickers.${symbol}`, `publicTrade.${symbol}`, `orderbook.50.${symbol}`],
                  }),
                )
              }

              // Handle Bybit real-time data
              if (data.topic) {
                if (data.topic.startsWith("tickers.") && data.data) {
                  setTickerData({
                    last: data.data.lastPrice,
                    high: data.data.highPrice24h,
                    low: data.data.lowPrice24h,
                    vol_idr: data.data.turnover24h,
                    buy: data.data.bid1Price,
                    sell: data.data.ask1Price,
                    server_time: data.ts / 1000,
                    lastPrice: data.data.lastPrice,
                    highPrice24h: data.data.highPrice24h,
                    lowPrice24h: data.data.lowPrice24h,
                    volume24h: data.data.volume24h,
                    price24hPcnt: data.data.price24hPcnt,
                  })
                }

                if (data.topic.startsWith("publicTrade.") && data.data) {
                  const newTrades = data.data.map((trade: any) => ({
                    date: (trade.T / 1000).toString(),
                    price: trade.p,
                    amount: trade.v,
                    tid: trade.i,
                    type: trade.S.toLowerCase(),
                  }))
                  setTrades((prev) => [...newTrades, ...prev].slice(0, 20))
                }

                if (data.topic.startsWith("orderbook.") && data.data) {
                  setDepth({
                    buy: data.data.b || [],
                    sell: data.data.a || [],
                  })
                }
              }
            }
          } catch (error) {
            console.error("[v0] WebSocket message parsing error:", error)
          }
        }

        websocket.onerror = (error) => {
          console.error("[v0] WebSocket error:", error)
          setConnectionStatus("disconnected")
        }

        websocket.onclose = (event) => {
          console.log("[v0] WebSocket disconnected:", event.code, event.reason)
          setConnectionStatus("disconnected")

          // Auto-reconnect with exponential backoff
          if (selectedPair && wsReconnectAttempts < 3) {
            const delay = Math.pow(2, wsReconnectAttempts) * 2000 // 2s, 4s, 8s
            setTimeout(() => {
              console.log("[v0] Attempting to reconnect WebSocket...")
              setWsReconnectAttempts((prev) => prev + 1)
              connectWebSocket()
            }, delay)
          }
        }

        setWs(websocket)
        setConnectionStatus("connected")
      } catch (error) {
        console.error("[v0] WebSocket connection failed:", error)
        setConnectionStatus("disconnected")
        setWsReconnectAttempts((prev) => prev + 1)
      }
    }
  }, [selectedPair, currentExchange, wsReconnectAttempts])

  const handleExchangeToggle = () => {
    const newExchange = currentExchange === "indodax" ? "bybit" : "indodax"
    setCurrentExchange(newExchange)
    setSelectedPair(null)
    setTickerData(null)
    setTrades([])
    setDepth(null)
    setSearchTerm("")
    setWsReconnectAttempts(0)

    // Close existing WebSocket
    if (ws) {
      ws.close()
    }

    console.log("[v0] Switched to", newExchange)
  }

  // Handle pair selection
  const handlePairSelect = (pair: CoinPair) => {
    setSelectedPair(pair)
    setTickerData(null)
    setTrades([])
    setDepth(null)
    setWsReconnectAttempts(0)

    // Close existing WebSocket
    if (ws) {
      ws.close()
    }

    // Fetch data for selected pair
    fetchTickerData(pair.id)
    fetchTrades(pair.id)
    fetchDepth(pair.id)

    // Try to connect WebSocket
    connectWebSocket()
  }

  // Filter pairs based on search
  useEffect(() => {
    if (searchTerm) {
      const filtered = pairs.filter(
        (pair) =>
          pair.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
          pair.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          pair.traded_currency_unit.toLowerCase().includes(searchTerm.toLowerCase()),
      )
      setFilteredPairs(filtered)
    } else {
      setFilteredPairs(pairs)
    }
  }, [searchTerm, pairs])

  // Auto-refresh data every 10 seconds if WebSocket is not connected
  useEffect(() => {
    if (selectedPair && connectionStatus !== "connected") {
      const interval = setInterval(() => {
        console.log("[v0] Auto-refreshing data...")
        fetchTickerData(selectedPair.id)
        fetchTrades(selectedPair.id)
        fetchDepth(selectedPair.id)
      }, 10000)

      return () => clearInterval(interval)
    }
  }, [selectedPair, connectionStatus, fetchTickerData, fetchTrades, fetchDepth])

  useEffect(() => {
    if (currentExchange === "indodax") {
      fetchIndodaxPairs()
    } else {
      fetchBybitInstruments()
    }
  }, [currentExchange, fetchIndodaxPairs, fetchBybitInstruments])

  // Format currency
  const formatCurrency = (value: string, currency = "IDR") => {
    const num = Number.parseFloat(value)
    if (isNaN(num)) return "..."

    if (currentExchange === "indodax" && currency === "IDR") {
      return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(num)
    }

    // For Bybit or other currencies, use USD formatting
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
  }

  // Format percentage change
  const formatPercentage = (current: string, previous: string) => {
    const curr = Number.parseFloat(current)
    const prev = Number.parseFloat(previous)
    if (isNaN(curr) || isNaN(prev) || prev === 0) return "0.00%"

    const change = ((curr - prev) / prev) * 100
    return `${change >= 0 ? "+" : ""}${change.toFixed(2)}%`
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-slate-900 p-4">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="glass rounded-2xl p-6 slide-up">
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
                className="flex items-center gap-3 px-6 py-3 rounded-xl smooth-transition hover:scale-105 hover:shadow-lg bg-transparent"
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

              {connectionStatus === "connected" ? (
                <Badge variant="default" className="bg-emerald-500 hover:bg-emerald-600 smooth-transition pulse-glow">
                  <Wifi className="w-4 h-4 mr-2" />
                  Live Connected
                </Badge>
              ) : connectionStatus === "connecting" ? (
                <Badge variant="secondary" className="smooth-transition">
                  <Activity className="w-4 h-4 mr-2 animate-spin" />
                  Connecting...
                </Badge>
              ) : (
                <Badge variant="destructive" className="smooth-transition">
                  <WifiOff className="w-4 h-4 mr-2" />
                  Offline Mode
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <Card className="glass border-0 shadow-2xl smooth-transition hover:shadow-purple-500/10">
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
                    className="pl-12 h-12 bg-input/50 border-border/50 rounded-xl smooth-transition focus:bg-input focus:border-primary/50"
                  />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-[500px] overflow-y-auto scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent">
                  {loading ? (
                    <div className="space-y-3">
                      {[...Array(8)].map((_, i) => (
                        <div key={i} className="p-4 border border-border/30 rounded-xl shimmer smooth-transition">
                          <div className="h-5 bg-muted/30 rounded-lg w-3/4 mb-2"></div>
                          <div className="h-4 bg-muted/20 rounded-lg w-1/2"></div>
                        </div>
                      ))}
                    </div>
                  ) : filteredPairs.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      {connectionStatus === "disconnected" ? "Connection failed. Loading..." : "No coins found"}
                    </div>
                  ) : (
                    filteredPairs.map((pair, index) => (
                      <Button
                        key={pair.id}
                        variant={selectedPair?.id === pair.id ? "default" : "ghost"}
                        className={`w-full justify-start p-4 h-auto rounded-xl smooth-transition hover:scale-[1.02] hover:shadow-lg ${
                          selectedPair?.id === pair.id
                            ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                            : "hover:bg-accent/50"
                        }`}
                        onClick={() => handlePairSelect(pair)}
                        style={{ animationDelay: `${index * 0.05}s` }}
                      >
                        <div className="flex items-center gap-4 w-full">
                          <div className="relative">
                            <img
                              src={pair.url_logo_png || "/placeholder.svg?height=32&width=32&query=crypto"}
                              alt={pair.traded_currency_unit}
                              className="w-8 h-8 rounded-full ring-2 ring-border/20 smooth-transition"
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

          <div className="lg:col-span-2">
            {selectedPair ? (
              <div className="space-y-8 slide-up">
                <Card className="glass border-0 shadow-2xl smooth-transition hover:shadow-purple-500/10">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-4 text-2xl">
                      <div className="relative">
                        <img
                          src={selectedPair.url_logo_png || "/placeholder.svg?height=40&width=40&query=crypto"}
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
                    {tickerData ? (
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
                          <p className="text-xl font-bold text-red-400 break-words">{formatCurrency(tickerData.low)}</p>
                        </div>
                        <div className="space-y-2 p-4 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20">
                          <p className="text-sm text-muted-foreground font-medium">Volume</p>
                          <p className="text-xl font-bold text-blue-400 break-words">
                            {tickerData.vol_idr ? formatCurrency(tickerData.vol_idr) : "..."}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {[...Array(4)].map((_, i) => (
                          <div key={i} className="space-y-2 p-4 rounded-xl bg-muted/20 shimmer">
                            <div className="h-5 bg-muted/30 rounded-lg w-20"></div>
                            <div className="h-7 bg-muted/40 rounded-lg w-28"></div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Tabs defaultValue="trades" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 bg-muted/30 p-1 rounded-xl">
                    <TabsTrigger
                      value="trades"
                      className="rounded-lg smooth-transition data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                    >
                      Recent Trades
                    </TabsTrigger>
                    <TabsTrigger
                      value="orderbook"
                      className="rounded-lg smooth-transition data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                    >
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
                        <div className="space-y-2 max-h-80 overflow-y-auto scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent">
                          {trades.length > 0 ? (
                            trades.map((trade, index) => (
                              <div
                                key={trade.tid || index}
                                className="flex justify-between items-center p-4 rounded-xl bg-muted/20 hover:bg-muted/30 smooth-transition border border-border/30"
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
                                  <div className="font-medium">{Number.parseFloat(trade.amount).toFixed(8)}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {new Date(Number.parseInt(trade.date) * 1000).toLocaleTimeString()}
                                  </div>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="text-center py-12 text-muted-foreground">
                              <Activity className="w-12 h-12 mx-auto mb-4 opacity-50 animate-pulse" />
                              Loading trades...
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
                        {depth ? (
                          <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-3">
                              <h4 className="font-semibold text-emerald-400 flex items-center gap-2">
                                <TrendingUp className="w-4 h-4" />
                                Buy Orders
                              </h4>
                              <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-emerald-500/20 scrollbar-track-transparent">
                                {depth.buy.slice(0, 15).map(([price, amount], index) => (
                                  <div
                                    key={index}
                                    className="flex justify-between text-sm p-2 rounded-lg bg-emerald-500/5 hover:bg-emerald-500/10 smooth-transition"
                                  >
                                    <span className="text-emerald-400 font-medium">{formatCurrency(price)}</span>
                                    <span className="text-muted-foreground">
                                      {Number.parseFloat(amount).toFixed(8)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                            <div className="space-y-3">
                              <h4 className="font-semibold text-red-400 flex items-center gap-2">
                                <TrendingDown className="w-4 h-4" />
                                Sell Orders
                              </h4>
                              <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-red-500/20 scrollbar-track-transparent">
                                {depth.sell.slice(0, 15).map(([price, amount], index) => (
                                  <div
                                    key={index}
                                    className="flex justify-between text-sm p-2 rounded-lg bg-red-500/5 hover:bg-red-500/10 smooth-transition"
                                  >
                                    <span className="text-red-400 font-medium">{formatCurrency(price)}</span>
                                    <span className="text-muted-foreground">
                                      {Number.parseFloat(amount).toFixed(8)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-12 text-muted-foreground">
                            <Activity className="w-12 h-12 mx-auto mb-4 opacity-50 animate-pulse" />
                            Loading order book...
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
