"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, TrendingUp, TrendingDown, Activity, Wifi, WifiOff, ToggleLeft, ToggleRight, AlertTriangle, RefreshCw, Zap, BarChart3, DollarSign, Bitcoin, Coins } from "lucide-react"
import { 
  SmoothPageTransition,
  SmoothCard,
  SmoothListItem,
  SmoothPriceCard,
  AnimatedNumber,
  LiveConnectionIndicator,
  SmoothSkeleton
} from "@/components/ui/smooth-components"
import { CoinIcon } from "@/components/ui/coin-icon"
import { useWebSocketPrice, useWebSocketPrices } from "@/lib/websocket-manager"
import { useCryptoPairs, useTicker, useTrades, useDepth, useDebouncedValue } from "@/lib/hooks"
import { getCryptoIcon } from "@/lib/utils"

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

// Enhanced Loading Components
const ModernLoader = ({ text = "Loading..." }: { text?: string }) => (
  <div className="flex flex-col items-center justify-center py-16 space-y-8">
    <div className="relative">
      {/* Outer ring */}
      <div className="w-20 h-20 border-3 border-primary/20 rounded-full"></div>
      {/* Spinning ring */}
      <div className="absolute inset-0 w-20 h-20 border-3 border-transparent border-t-primary border-r-primary/60 rounded-full animate-spin"></div>
      {/* Inner pulsing dot */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-3 h-3 bg-primary rounded-full animate-pulse"></div>
      </div>
    </div>
    
    <div className="text-center space-y-3">
      <h3 className="text-xl font-semibold text-foreground tracking-tight">{text}</h3>
      <p className="text-sm text-muted-foreground max-w-xs">
        Fetching real-time market data from exchange APIs
      </p>
      
      {/* Animated dots */}
      <div className="flex justify-center space-x-1.5 pt-2">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce"
            style={{ animationDelay: `${i * 0.15}s`, animationDuration: '1s' }}
          ></div>
        ))}
      </div>
    </div>
  </div>
)

const CryptoListSkeleton = () => (
  <div className="space-y-3">
    {Array.from({ length: 8 }).map((_, i) => (
      <SmoothListItem key={i} delay={i * 50} className="p-4 border border-border/30 rounded-xl">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-muted/40 rounded-full skeleton" />
          <div className="flex-1 space-y-3">
            <SmoothSkeleton lines={1} className="h-5 w-24" />
            <SmoothSkeleton lines={1} className="h-4 w-32" />
          </div>
          <div className="w-8 h-8 bg-muted/30 rounded-full skeleton" />
        </div>
      </SmoothListItem>
    ))}
  </div>
)

// Enhanced Connection Status
const ModernConnectionStatus = ({ 
  status, 
  exchange, 
  lastUpdate,
  serverTime 
}: { 
  status: 'connected' | 'connecting' | 'disconnected' | 'error'
  exchange: string
  lastUpdate?: number
  serverTime?: string
}) => {
  const statusConfig = {
    connected: {
      color: "emerald",
      icon: Wifi,
      text: "Live Data",
      animation: "" // Remove pulse animation for connected state
    },
    connecting: {
      color: "yellow", 
      icon: Activity,
      text: "Connecting",
      animation: "animate-spin"
    },
    error: {
      color: "red",
      icon: AlertTriangle,
      text: "Error",
      animation: ""
    },
    disconnected: {
      color: "gray",
      icon: WifiOff,
      text: "Offline", 
      animation: ""
    }
  }

  const config = statusConfig[status]
  const Icon = config.icon

  return (
    <div className="relative">
      <Badge 
        variant={status === 'connected' ? 'default' : status === 'error' ? 'destructive' : 'secondary'}
        className={`
          px-4 py-2.5 rounded-xl transition-all duration-500 relative shadow-lg backdrop-blur-sm
          ${status === 'connected' ? 'bg-emerald-500/90 hover:bg-emerald-600/90 shadow-emerald-500/25 border-emerald-400/50' : ''}
          ${status === 'error' ? 'bg-red-500/90 hover:bg-red-600/90 shadow-red-500/25 border-red-400/50' : ''}
          ${status === 'connecting' ? 'bg-yellow-500/90 hover:bg-yellow-600/90 shadow-yellow-500/25 border-yellow-400/50' : ''}
          ${status === 'disconnected' ? 'bg-gray-600/90 hover:bg-gray-700/90 shadow-gray-500/25 border-gray-400/50' : ''}
          border-2 text-white font-medium
        `}
      >
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 ${config.animation}`} />
          <span className="font-semibold text-sm">{config.text}</span>
          <span className="mx-1 opacity-70">•</span>
          <span className="text-xs font-medium opacity-90">{exchange.toUpperCase()}</span>
          {serverTime && status === 'connected' && (
            <>
              <span className="mx-1 opacity-70">•</span>
              <span className="text-xs opacity-80">{serverTime}</span>
            </>
          )}
        </div>
        
        {status === 'connected' && (
          <div className="absolute -top-2 -right-2 w-4 h-4 bg-emerald-300 rounded-full border-2 border-white shadow-lg">
            <div className="w-2 h-2 bg-emerald-500 rounded-full absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 animate-pulse"></div>
          </div>
        )}
      </Badge>
    </div>
  )
}

// Error Display Component
const ModernErrorDisplay = ({ error, onRetry }: { error: string; onRetry: () => void }) => (
  <SmoothCard className="text-center py-12">
    <CardContent className="space-y-6">
      <div className="w-20 h-20 mx-auto rounded-full bg-red-500/10 flex items-center justify-center">
        <AlertTriangle className="w-10 h-10 text-red-400" />
      </div>
      <div className="space-y-2">
        <h3 className="text-xl font-semibold text-red-400">Connection Error</h3>
        <p className="text-muted-foreground max-w-md mx-auto">{error}</p>
      </div>
      <Button onClick={onRetry} variant="outline" className="btn-modern">
        <RefreshCw className="w-4 h-4 mr-2" />
        Try Again
      </Button>
    </CardContent>
  </SmoothCard>
)

export default function ModernCryptoViewer() {
  const [currentExchange, setCurrentExchange] = useState<Exchange>("indodax")
  const [selectedPair, setSelectedPair] = useState<CoinPair | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [cachedPrice, setCachedPrice] = useState<any>(null)
  
  // Use debounced search for better performance
  const debouncedSearch = useDebouncedValue(searchTerm, 300)
  
  // Use custom hooks for data fetching
  const { pairs, loading: pairsLoading, error: pairsError, refetch: refetchPairs } = useCryptoPairs(currentExchange)
  const { data: tickerData, loading: tickerLoading } = useTicker(selectedPair, currentExchange)
  const { data: trades, loading: tradesLoading } = useTrades(selectedPair, currentExchange)
  const { data: depth, loading: depthLoading } = useDepth(selectedPair, currentExchange)
  
  // WebSocket integration for real-time updates with fallback
  const { price: livePrice, connectionStatus } = useWebSocketPrice(
    selectedPair?.id || null, 
    currentExchange
  )

  // Use WebSocket data if available, otherwise fallback to regular API data
  const displayPrice = useMemo(() => {
    // Priority: WebSocket data > API ticker data
    if (livePrice && connectionStatus === 'connected' && selectedPair) {
      return {
        ...livePrice,
        symbol: selectedPair.id
      }
    }
    
    // Fallback to ticker data if WebSocket is not available
    if (tickerData && selectedPair) {
      return {
        symbol: selectedPair.id,
        price: tickerData.last,
        change24h: '0',
        changePercent24h: '0',
        timestamp: Date.now(),
        volume24h: tickerData.vol_idr,
        high24h: tickerData.high,
        low24h: tickerData.low
      }
    }
    
    return null
  }, [livePrice, connectionStatus, tickerData, selectedPair])

  // Cache and stabilize price data to prevent jumping
  useEffect(() => {
    if (displayPrice && selectedPair) {
      const priceKey = `${currentExchange}_${selectedPair.id}`
      // Only update cache if price has changed significantly or is much newer
      if (!cachedPrice || 
          cachedPrice.symbol !== displayPrice.symbol ||
          Math.abs(parseFloat(displayPrice.price) - parseFloat(cachedPrice.price)) > parseFloat(displayPrice.price) * 0.001 ||
          displayPrice.timestamp - cachedPrice.timestamp > 10000) {
        setCachedPrice(displayPrice)
      }
    }
  }, [displayPrice, selectedPair, currentExchange, cachedPrice])

  // Use cached price for stability, fallback to displayPrice
  const stablePrice = cachedPrice && displayPrice && cachedPrice.symbol === displayPrice.symbol ? cachedPrice : displayPrice

  // Enhanced connection status that accounts for fallback
  const effectiveConnectionStatus = useMemo(() => {
    // If we have any data (WebSocket or API), consider it connected
    if (connectionStatus === 'connected') return 'connected'
    if (tickerData || pairs.length > 0) return 'connected' // Connected if we have any data
    if (pairsLoading || tickerLoading) return 'connecting'
    return connectionStatus
  }, [connectionStatus, tickerData, livePrice, pairs.length, pairsLoading, tickerLoading])

  // Check if we're using fallback data
  const isUsingFallback = useMemo(() => {
    return tickerData && !livePrice && connectionStatus !== 'connected'
  }, [tickerData, livePrice, connectionStatus])

  // Get server time for each exchange
  const getServerTime = () => {
    const now = new Date()
    if (currentExchange === 'bybit') {
      // Bybit uses UTC
      return now.toISOString().slice(11, 19) + ' UTC'
    } else {
      // Indodax uses WIB (UTC+7)
      const wibTime = new Date(now.getTime() + (7 * 60 * 60 * 1000))
      return wibTime.toISOString().slice(11, 19) + ' WIB'
    }
  }

  // Filter pairs with memoization for performance
  const filteredPairs = useMemo(() => {
    if (!debouncedSearch.trim()) return pairs
    
    const search = debouncedSearch.toLowerCase()
    return pairs.filter(pair =>
      pair.symbol.toLowerCase().includes(search) ||
      pair.description.toLowerCase().includes(search) ||
      pair.traded_currency_unit.toLowerCase().includes(search)
    )
  }, [pairs, debouncedSearch])

  // Handle exchange toggle
  const handleExchangeToggle = useCallback(() => {
    const newExchange = currentExchange === "indodax" ? "bybit" : "indodax"
    setCurrentExchange(newExchange)
    setSelectedPair(null)
    setSearchTerm("")
  }, [currentExchange])

  // Handle pair selection
  const handlePairSelect = useCallback((pair: CoinPair) => {
    setSelectedPair(pair)
  }, [])

  // Format currency with proper locale and thousand separators
  const formatCurrency = useCallback((value: string | number, currency = "IDR") => {
    const num = typeof value === 'string' ? parseFloat(value) || 0 : value
    if (isNaN(num)) return "..."

    // Helper function to add thousand separators with dots (Indonesian format)
    const addThousandSeparators = (numStr: string) => {
      const parts = numStr.split('.')
      const integerPart = parts[0]
      const decimalPart = parts[1]
      
      // Add dots as thousand separators
      const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
      
      return decimalPart ? `${formattedInteger},${decimalPart}` : formattedInteger
    }

    if (currentExchange === "indodax" && currency === "IDR") {
      // For IDR, typically no decimals for large amounts
      const formatted = num < 1000 ? num.toFixed(2) : Math.round(num).toString()
      return addThousandSeparators(formatted)
    }

    if (currentExchange === "bybit") {
      // For USD, use appropriate decimal places
      const formatted = num.toFixed(num < 1 ? 8 : num < 100 ? 6 : 2)
      return addThousandSeparators(formatted)
    }

    // Default formatting
    const formatted = num.toFixed(num < 1 ? 8 : num < 100 ? 6 : 2)
    return addThousandSeparators(formatted)
  }, [currentExchange])

  // Get trend based on price change
  const getTrend = (current: string, previous: string): 'up' | 'down' | 'neutral' => {
    const currentNum = parseFloat(current)
    const previousNum = parseFloat(previous) 
    if (currentNum > previousNum) return 'up'
    if (currentNum < previousNum) return 'down'
    return 'neutral'
  }

  // Initial loading state
  if (pairsLoading && pairs.length === 0) {
    return (
      <SmoothPageTransition>
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-slate-900/50 flex items-center justify-center p-4">
          <SmoothCard className="w-full max-w-md glass-card">
            <CardContent className="pt-6">
              <ModernLoader text="Loading Crypto Markets..." />
            </CardContent>
          </SmoothCard>
        </div>
      </SmoothPageTransition>
    )
  }

  return (
    <SmoothPageTransition>
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-slate-900/50 container-padding section-spacing">
        <div className="max-w-7xl mx-auto space-y-8">
          
          {/* Modern Minimalist Header */}
          <div className="relative">
            {/* Background Pattern */}
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 rounded-2xl"></div>
            
            <SmoothCard className="glass-card border-0 shadow-xl overflow-hidden relative" delay={100}>
              <CardContent className="p-8 lg:p-10">
                <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
                  
                  {/* Left Section - Branding */}
                  <div className="flex items-center gap-6 flex-1">
                    <div className="relative">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg">
                        <BarChart3 className="w-8 h-8 text-white" />
                      </div>
                      <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-primary/10 rounded-2xl blur opacity-75"></div>
                    </div>
                    
                    <div className="space-y-2">
                      <h1 className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-primary via-primary/80 to-primary bg-clip-text text-transparent">
                        {currentExchange === "indodax" ? "Indodax" : "Bybit"}
                      </h1>
                      <p className="text-muted-foreground text-lg font-medium">
                        Professional Trading Platform
                      </p>
                    </div>
                  </div>

                  {/* Right Section - Status & Controls */}
                  <div className="flex flex-col lg:flex-row items-center gap-6">
                    
                    {/* Connection Status */}
                    <div className="flex items-center gap-4">
                      <ModernConnectionStatus 
                        status={effectiveConnectionStatus} 
                        exchange={currentExchange}
                        lastUpdate={Date.now()}
                        serverTime={getServerTime()}
                      />
                      {pairs.length > 0 && (
                        <Badge variant="outline" className="px-4 py-2 bg-white/5 border-white/20 text-sm">
                          <Zap className="w-4 h-4 mr-2" />
                          {pairs.length} Markets
                        </Badge>
                      )}
                    </div>

                    {/* Exchange Toggle */}
                    <Button
                      onClick={handleExchangeToggle}
                      size="lg"
                      className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-white border-0 px-8 py-3 rounded-xl text-base font-semibold transition-all duration-300 hover:scale-105 hover:shadow-lg"
                      disabled={pairsLoading}
                    >
                      {currentExchange === "indodax" ? (
                        <>
                          <ToggleLeft className="w-5 h-5 mr-2" />
                          Switch to Bybit
                        </>
                      ) : (
                        <>
                          <ToggleRight className="w-5 h-5 mr-2" />
                          Switch to Indodax
                        </>
                      )}
                    </Button>
                  </div>
                  
                </div>
                
                {/* Status Indicators */}
                {isUsingFallback && (
                  <div className="mt-6 pt-6 border-t border-white/10">
                    <Badge variant="secondary" className="px-4 py-2 bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                      <Activity className="w-4 h-4 mr-2" />
                      Using API Mode - WebSocket Fallback Active
                    </Badge>
                  </div>
                )}
              </CardContent>
            </SmoothCard>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
            
            {/* Enhanced Sidebar */}
            <div className="xl:col-span-1">
              <SmoothCard className="glass-card border-0 shadow-xl" delay={200}>
                <CardHeader className="pb-4">
                  <CardTitle className="text-xl font-semibold flex items-center gap-3">
                    <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                    Crypto Markets
                    <Badge variant="secondary" className="ml-auto">
                      {filteredPairs.length}
                    </Badge>
                  </CardTitle>
                  
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                    <Input
                      placeholder="Search markets..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-12 h-12 bg-input/50 border-border/50 rounded-xl focus-ring"
                    />
                  </div>
                </CardHeader>
                
                <CardContent>
                  <div className="space-y-3 max-h-[600px] overflow-y-auto custom-scrollbar">
                    {pairsError ? (
                      <ModernErrorDisplay error={pairsError.message || 'An error occurred'} onRetry={refetchPairs} />
                    ) : pairsLoading ? (
                      <CryptoListSkeleton />
                    ) : filteredPairs.length === 0 ? (
                      <div className="text-center py-12">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted/20 flex items-center justify-center">
                          <Search className="w-8 h-8 text-muted-foreground/50" />
                        </div>
                        <p className="text-muted-foreground">No markets found</p>
                      </div>
                    ) : (
                      filteredPairs.map((pair, index) => (
                        <SmoothListItem
                          key={pair.id}
                          delay={index * 30}
                          isSelected={selectedPair?.id === pair.id}
                          onClick={() => handlePairSelect(pair)}
                          className="p-4 border border-border/30 rounded-xl cursor-pointer"
                        >
                          <div className="flex items-center gap-4">
                            <div className="relative">
                              <CoinIcon
                                symbol={pair.traded_currency_unit || pair.id}
                                exchange={currentExchange}
                                existingLogo={pair.url_logo_png}
                                className="w-10 h-10 rounded-full ring-2 ring-border/20"
                              />
                              
                              {selectedPair?.id === pair.id && (
                                <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-400 rounded-full border-2 border-background animate-pulse"></div>
                              )}
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-base truncate">
                                {pair.traded_currency_unit}
                              </div>
                              <div className="text-sm text-muted-foreground truncate">
                                {pair.description}
                              </div>
                            </div>

                            {selectedPair?.id === pair.id && (
                              <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                            )}
                          </div>
                        </SmoothListItem>
                      ))
                    )}
                  </div>
                </CardContent>
              </SmoothCard>
            </div>

            {/* Enhanced Main Content */}
            <div className="xl:col-span-3">
              {selectedPair ? (
                <div className="space-y-8">
                  
                  {/* Enhanced Ticker Section */}
                  <SmoothCard className="glass-card border-0 shadow-xl" delay={300}>
                    <CardHeader className="pb-6">
                      <CardTitle className="flex items-center gap-4 text-2xl">
                        <div className="relative">
                          <CoinIcon
                            symbol={selectedPair.traded_currency_unit || selectedPair.id}
                            exchange={currentExchange}
                            existingLogo={selectedPair.url_logo_png}
                            className="w-12 h-12 rounded-full ring-2 ring-primary/20"
                          />
                        </div>
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-3">
                            <div className="gradient-text font-bold">
                              {selectedPair.description}
                            </div>
                            <LiveConnectionIndicator 
                              status={effectiveConnectionStatus}
                              lastUpdate={stablePrice?.timestamp}
                            />
                          </div>
                          <div className="text-sm text-muted-foreground font-normal">
                            {selectedPair.symbol} • {currentExchange.toUpperCase()}
                          </div>
                        </div>
                      </CardTitle>
                    </CardHeader>
                    
                    <CardContent>
                      {tickerLoading ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 lg:gap-6">
                          {Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="space-y-3 p-4 lg:p-6 rounded-xl bg-muted/20">
                              <SmoothSkeleton lines={1} className="h-3 sm:h-4 w-16 sm:w-20" />
                              <SmoothSkeleton lines={1} className="h-6 sm:h-7 lg:h-8 w-24 sm:w-28 lg:w-32" />
                            </div>
                          ))}
                        </div>
                      ) : tickerData || stablePrice ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 lg:gap-6">
                          <SmoothPriceCard
                            title="Current Price"
                            value={stablePrice?.price || tickerData?.last || "0"}
                            prefix={currentExchange === "bybit" ? "$" : "Rp "}
                            icon={DollarSign}
                            trend="neutral"
                            className="col-span-1 sm:col-span-2"
                            symbol={selectedPair?.id || ""}
                          />
                          
                          <SmoothPriceCard
                            title="24h High"
                            value={stablePrice?.high24h || tickerData?.high || "0"}
                            prefix={currentExchange === "bybit" ? "$" : "Rp "}
                            icon={TrendingUp}
                            trend="up"
                            symbol={selectedPair?.id || ""}
                          />
                          
                          <SmoothPriceCard
                            title="24h Low"
                            value={stablePrice?.low24h || tickerData?.low || "0"}
                            prefix={currentExchange === "bybit" ? "$" : "Rp "}
                            icon={TrendingDown}
                            trend="down"
                            symbol={selectedPair?.id || ""}
                          />
                          
                          <SmoothPriceCard
                            title="24h Volume"
                            value={stablePrice?.volume24h || tickerData?.vol_idr || "0"}
                            prefix={currentExchange === "bybit" ? "$" : "Rp "}
                            icon={BarChart3}
                            trend="neutral"
                            className="col-span-1 sm:col-span-2"
                            symbol={selectedPair?.id || ""}
                          />
                          
                          <SmoothPriceCard
                            title="Bid Price"
                            value={tickerData?.buy || "0"}
                            prefix={currentExchange === "bybit" ? "$" : "Rp "}
                            trend="up"
                            symbol={selectedPair?.id || ""}
                          />
                          
                          <SmoothPriceCard
                            title="Ask Price"
                            value={tickerData?.sell || "0"}
                            prefix={currentExchange === "bybit" ? "$" : "Rp "}
                            trend="down"
                            symbol={selectedPair?.id || ""}
                          />
                        </div>
                      ) : (
                        <div className="text-center py-12">
                          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted/20 flex items-center justify-center">
                            <Activity className="w-8 h-8 text-muted-foreground/50" />
                          </div>
                          <p className="text-muted-foreground">No ticker data available</p>
                        </div>
                      )}
                    </CardContent>
                  </SmoothCard>

                  {/* Enhanced Tabs Section */}
                  <Tabs defaultValue="trades" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 bg-muted/30 p-1 rounded-xl h-12">
                      <TabsTrigger value="trades" className="rounded-lg text-sm font-medium">
                        Recent Trades
                      </TabsTrigger>
                      <TabsTrigger value="orderbook" className="rounded-lg text-sm font-medium">
                        Order Book
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="trades" className="mt-6">
                      <SmoothCard className="glass border-0 shadow-xl" delay={400}>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-3">
                            <Activity className="w-5 h-5 text-primary" />
                            Recent Trades
                            <LiveConnectionIndicator 
                              status={effectiveConnectionStatus}
                              lastUpdate={Date.now()}
                            />
                          </CardTitle>
                        </CardHeader>
                        
                        <CardContent>
                          <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar">
                            {tradesLoading ? (
                              <SmoothSkeleton lines={10} />
                            ) : trades && trades.length > 0 ? (
                              trades.map((trade: TradeData, index: number) => (
                                <SmoothListItem
                                  key={trade.tid || index}
                                  delay={index * 50}
                                  className="flex justify-between items-center p-4 rounded-xl bg-muted/10 hover:bg-muted/20 border border-border/20"
                                >
                                  <div className="flex items-center gap-4">
                                    <div className={`p-2 rounded-full ${
                                      trade.type === "buy" 
                                        ? "bg-emerald-500/20 text-emerald-400" 
                                        : "bg-red-500/20 text-red-400"
                                    }`}>
                                      {trade.type === "buy" ? (
                                        <TrendingUp className="w-4 h-4" />
                                      ) : (
                                        <TrendingDown className="w-4 h-4" />
                                      )}
                                    </div>
                                    <div>
                                      <div className="font-semibold">
                                        <AnimatedNumber 
                                          value={parseFloat(trade.price) * parseFloat(trade.amount)} 
                                          prefix={currentExchange === "bybit" ? "$" : "Rp "} 
                                          decimals={2}
                                          symbol={selectedPair?.id || ""}
                                        />
                                      </div>
                                      <div className="text-sm text-muted-foreground">
                                        {parseFloat(trade.amount).toFixed(8)} {selectedPair.traded_currency_unit} @ {currentExchange === "bybit" ? "$" : "Rp "}{parseFloat(trade.price).toLocaleString()}
                                      </div>
                                    </div>
                                  </div>
                                  
                                  <div className="text-right">
                                    <div className="text-xs text-muted-foreground">
                                      {new Date(parseInt(trade.date) * 1000).toLocaleTimeString()}
                                    </div>
                                  </div>
                                </SmoothListItem>
                              ))
                            ) : (
                              <div className="text-center py-12">
                                <Activity className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                                <p className="text-muted-foreground">No trades available</p>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </SmoothCard>
                    </TabsContent>

                    <TabsContent value="orderbook" className="mt-6">
                      <SmoothCard className="glass border-0 shadow-xl" delay={500}>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-3">
                            <BarChart3 className="w-5 h-5 text-primary" />
                            Order Book
                            <LiveConnectionIndicator 
                              status={effectiveConnectionStatus}
                              lastUpdate={depth?.lastUpdate}
                            />
                          </CardTitle>
                        </CardHeader>
                        
                        <CardContent>
                          {depthLoading ? (
                            <SmoothSkeleton lines={15} />
                          ) : depth ? (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                              {/* Buy Orders */}
                              <div className="space-y-4">
                                <h4 className="font-semibold text-emerald-400 flex items-center gap-2 text-lg">
                                  <TrendingUp className="w-5 h-5" />
                                  Buy Orders
                                </h4>
                                <div className="space-y-2 max-h-72 overflow-y-auto custom-scrollbar">
                                  {depth.buy.slice(0, 15).map(([price, amount]: [string, string], index: number) => (
                                    <SmoothListItem
                                      key={index}
                                      delay={index * 20}
                                      className="flex justify-between text-sm p-3 rounded-lg bg-emerald-500/5 hover:bg-emerald-500/10 border border-emerald-500/10"
                                    >
                                      <span className="text-emerald-400 font-medium font-mono">
                                        <AnimatedNumber value={price} prefix={currentExchange === "bybit" ? "$" : "Rp "} symbol={selectedPair?.id || ""} />
                                      </span>
                                      <span className="text-muted-foreground font-mono">
                                        {parseFloat(amount).toFixed(8)}
                                      </span>
                                    </SmoothListItem>
                                  ))}
                                </div>
                              </div>

                              {/* Sell Orders */}
                              <div className="space-y-4">
                                <h4 className="font-semibold text-red-400 flex items-center gap-2 text-lg">
                                  <TrendingDown className="w-5 h-5" />
                                  Sell Orders
                                </h4>
                                <div className="space-y-2 max-h-72 overflow-y-auto custom-scrollbar">
                                  {depth.sell.slice(0, 15).map(([price, amount]: [string, string], index: number) => (
                                    <SmoothListItem
                                      key={index}
                                      delay={index * 20}
                                      className="flex justify-between text-sm p-3 rounded-lg bg-red-500/5 hover:bg-red-500/10 border border-red-500/10"
                                    >
                                      <span className="text-red-400 font-medium font-mono">
                                        <AnimatedNumber value={price} prefix={currentExchange === "bybit" ? "$" : "Rp "} symbol={selectedPair?.id || ""} />
                                      </span>
                                      <span className="text-muted-foreground font-mono">
                                        {parseFloat(amount).toFixed(8)}
                                      </span>
                                    </SmoothListItem>
                                  ))}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="text-center py-12">
                              <BarChart3 className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                              <p className="text-muted-foreground">No order book data available</p>
                            </div>
                          )}
                        </CardContent>
                      </SmoothCard>
                    </TabsContent>
                  </Tabs>
                </div>
              ) : (
                <SmoothCard className="glass-card border-0 shadow-xl" delay={300}>
                  <CardContent className="flex items-center justify-center min-h-[600px]">
                    <div className="text-center space-y-6 max-w-md">
                      <div className="w-32 h-32 mx-auto rounded-full bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 flex items-center justify-center float">
                        <BarChart3 className="w-16 h-16 text-primary" />
                      </div>
                      <div className="space-y-3">
                        <h3 className="text-3xl font-bold gradient-text">Choose a Market</h3>
                        <p className="text-muted-foreground text-lg leading-relaxed">
                          Select a cryptocurrency from the sidebar to view real-time trading data, 
                          recent trades, and order book information.
                        </p>
                      </div>
                      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                        <Zap className="w-4 h-4" />
                        <span>Live data • Real-time updates • Professional grade</span>
                      </div>
                    </div>
                  </CardContent>
                </SmoothCard>
              )}
            </div>
          </div>
        </div>
      </div>
    </SmoothPageTransition>
  )
}