// Exchange types
export type Exchange = "indodax" | "bybit"

// Connection status types
export type ConnectionStatus = "connected" | "disconnected" | "connecting" | "error"

// Base interfaces for crypto data
export interface CoinPair {
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

export interface BybitInstrument {
  symbol: string
  contractType: string
  status: string
  baseCoin: string
  quoteCoin: string
  settleCoin: string
  launchTime: string
  priceScale: string
  deliveryTime?: string
  deliveryFeeRate?: string
}

// Ticker data with comprehensive fields
export interface TickerData {
  // Common fields
  high: string
  low: string
  last: string
  buy: string
  sell: string
  server_time: number
  name?: string
  
  // Indodax specific
  vol_btc?: string
  vol_idr?: string
  
  // Bybit specific
  lastPrice?: string
  highPrice24h?: string
  lowPrice24h?: string
  volume24h?: string
  price24hPcnt?: string
  bid1Price?: string
  ask1Price?: string
  turnover24h?: string
  
  // Computed fields
  priceChange?: string
  priceChangePercent?: string
  isLoading?: boolean
  lastFetch?: number
}

export interface TradeData {
  date: string
  price: string
  amount: string
  tid: string
  type: "buy" | "sell"
  timestamp?: number
}

export interface DepthData {
  buy: Array<[string, string]>
  sell: Array<[string, string]>
  lastUpdate?: number
  sequence?: number
}

// API Response types
export interface ApiResponse<T> {
  data?: T
  error?: string
  success: boolean
  timestamp: number
  cached?: boolean
}

export interface IndodaxApiResponse<T> {
  ticker?: T
  trades?: T
  depth?: T
  success?: boolean
  error?: string
}

export interface BybitApiResponse<T> {
  retCode: number
  retMsg: string
  result: T
  time: number
  retExtInfo?: Record<string, any>
}

// WebSocket message types
export interface WebSocketMessage {
  id?: number
  method?: number | string
  params?: any
  result?: any
  error?: any
  
  // Bybit specific
  req_id?: string
  op?: string
  args?: string[]
  topic?: string
  data?: any
  ts?: number
  success?: boolean
  ret_msg?: string
}

// State management types
export interface AppState {
  currentExchange: Exchange
  selectedPair: CoinPair | null
  pairs: CoinPair[]
  filteredPairs: CoinPair[]
  tickerData: TickerData | null
  trades: TradeData[]
  depth: DepthData | null
  searchTerm: string
  loading: boolean
  connectionStatus: ConnectionStatus
  error: string | null
  lastUpdate: number
}

export interface ApiError {
  message: string
  code?: string | number
  details?: any
  timestamp: number
  retryCount?: number
}

// Component prop types
export interface CoinListProps {
  pairs: CoinPair[]
  selectedPair: CoinPair | null
  onSelectPair: (pair: CoinPair) => void
  loading: boolean
  searchTerm: string
  onSearchChange: (term: string) => void
  className?: string
}

export interface TickerDisplayProps {
  ticker: TickerData | null
  pair: CoinPair | null
  exchange: Exchange
  loading: boolean
  className?: string
}

export interface TradeListProps {
  trades: TradeData[]
  loading: boolean
  className?: string
}

export interface OrderBookProps {
  depth: DepthData | null
  loading: boolean
  className?: string
}

// Hook return types
export interface UseApiReturn<T> {
  data: T | null
  loading: boolean
  error: ApiError | null
  refetch: () => Promise<void>
  lastUpdate: number
}

export interface UseWebSocketReturn {
  connectionStatus: ConnectionStatus
  lastMessage: WebSocketMessage | null
  sendMessage: (message: any) => void
  reconnect: () => void
  disconnect: () => void
}

// Configuration types
export interface ApiConfig {
  baseUrl: string
  timeout: number
  retryAttempts: number
  retryDelay: number
  corsProxy?: string[]
}

export interface WebSocketConfig {
  url: string
  token?: string
  reconnectAttempts: number
  reconnectDelay: number
  pingInterval: number
}

export interface ExchangeConfig {
  api: ApiConfig
  websocket: WebSocketConfig
  name: string
  displayName: string
  features: string[]
}

// Utility types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}

export type LoadingState = "idle" | "loading" | "success" | "error"

export interface PaginationParams {
  page?: number
  limit?: number
  offset?: number
}

export interface SortParams {
  sortBy?: string
  sortOrder?: "asc" | "desc"
}

export interface FilterParams {
  search?: string
  category?: string
  minPrice?: number
  maxPrice?: number
  volume?: number
}

// Form validation types
export interface ValidationError {
  field: string
  message: string
}

export interface FormState {
  isValid: boolean
  errors: ValidationError[]
  isDirty: boolean
  isSubmitting: boolean
}