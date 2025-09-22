# Tugas Pemrogramman Crypto

Real-time cryptocurrency trading dashboard yang menampilkan data dari Indodax dan Bybit exchanges dengan UI/UX modern dan performa yang optimal.

## 😇 Anggota Tim

- **Bevantyo Satria Pinandhita**
- **Naufal Tafindya Putra**  
- **Maulana Aditya Furqon Aryanda**
- **Avin**
- **Deva**

## 🚀 Fitur Utama

### 1. **Dual Exchange Support**
- **Indodax**: Cryptocurrency pairs dalam Rupiah (IDR)
- **Bybit**: USDT perpetual contracts dalam USD
- Toggle mudah antara kedua exchange

### 2. **Real-time Data Display**
- **Live Price Updates**: Harga cryptocurrency real-time
- **Recent Trades**: Transaksi terbaru dengan perhitungan total value
- **Order Book**: Data buy/sell orders 
- **WebSocket Integration**: Update data tanpa refresh halaman

### 3. **Modern UI/UX**
- **Glass Morphism Design**: Efek kaca modern dengan backdrop blur
- **Smooth Animations**: Transisi halus dan micro-interactions
- **Responsive Design**: Kompatibel mobile dan desktop
- **Dark Theme**: Tema gelap yang elegan
- **Loading States**: Skeleton loaders untuk pengalaman yang smooth

### 4. **Advanced Features**
- **Search Functionality**: Pencarian cryptocurrency dengan debouncing
- **Connection Status**: Indikator status koneksi real-time
- **Error Handling**: Penanganan error yang robust dengan fallback
- **Auto-refresh**: Refresh data otomatis dengan feedback visual
- **Coin Icons**: Logo cryptocurrency dari API atau fallback ke inisial

## 🛠 Teknologi yang Digunakan

### Frontend Framework
- **Next.js 15.5.3**: React framework dengan App Router
- **TypeScript**: Type-safe JavaScript
- **React 19**: Library UI terbaru
- **Tailwind CSS**: Utility-first CSS framework

### UI Components
- **Lucide React**: Icon library modern
- **Custom Components**: Komponen UI yang dibuat khusus
- **Framer Motion**: Library animasi (via CSS)

### Data Management
- **Custom Hooks**: React hooks untuk API management
- **WebSocket Manager**: Singleton pattern untuk WebSocket connections
- **State Management**: React state dengan optimized re-renders

## 📊 Data Sources

### Indodax API
```
Base URL: https://indodax.com/api
- /pairs: List cryptocurrency pairs
- /ticker/{pair}: Real-time ticker data
- /trades/{pair}: Recent trades
- /depth/{pair}: Order book data
```

### Bybit API
```
Base URL: https://api.bybit.com
- /v5/market/instruments-info: Trading pairs
- /v5/market/tickers: Real-time ticker data
- /v5/market/recent-trade: Recent trades
- /v5/market/orderbook: Order book data
```

### WebSocket Integration
- **Indodax WebSocket**: Live price updates
- **Bybit WebSocket**: Live market data
- **Fallback Polling**: API polling jika WebSocket gagal

## 🎨 UI/UX Improvements

### Visual Enhancements
- **Gradient Text**: Animated gradient text effects
- **Status Indicators**: Visual indicators untuk connection status
- **Hover Effects**: Smooth hover animations
- **Card Layouts**: Modern card design dengan shadow effects

### Interactive Features
- **Live Data Updates**: Update harga real-time tanpa blink
- **Smooth Transitions**: Transisi halus antar halaman
- **Exchange Toggle**: Switch mudah antara Indodax dan Bybit
- **Responsive Grid**: Layout yang menyesuaikan ukuran layar

## � Recent Trades Display

### Format Baru
```
Top Line: Total Value (Price × Amount)
Bottom Line: Amount + Individual Price

Contoh:
$289.70          ← Total value dari trade
746.00000000 CARV @ $0.388  ← Jumlah coin + harga per coin
```

### Perhitungan
- **Total Value**: `price × amount` dalam currency yang sesuai (USD/IDR)
- **Trade Details**: Menampilkan jumlah coin yang dibeli/dijual dan harga per coin

## � Getting Started

### Prerequisites
- Node.js 18+ 
- npm atau pnpm
- Git

### Installation
```bash
# Clone repository
git clone <repository-url>
cd TugasPemrogrammanCrypto_IndodaxBybitAPI

# Install dependencies
npm install
# atau
pnpm install

# Start development server
npm run dev
# atau  
pnpm dev

# Open browser
http://localhost:3000
```

### Build for Production
```bash
npm run build
npm run start
```

## 🔧 Konfigurasi

### Environment Variables
```env
# Optional - untuk konfigurasi tambahan
NEXT_PUBLIC_API_TIMEOUT=10000
NEXT_PUBLIC_ENABLE_WEBSOCKET=true
```

### API Endpoints
- **Indodax**: `https://indodax.com/api`
- **Bybit**: `https://api.bybit.com`

### CORS Handling
Aplikasi menggunakan multiple proxy fallbacks untuk mengatasi CORS issues:
1. Direct API call
2. AllOrigins proxy
3. CodeTabs proxy  
4. Thingproxy

## 📊 Features Detail

### 1. Price Display
- **Decimal Precision**: Hingga 10 angka di belakang koma
- **Currency Format**: IDR untuk Indodax, USD untuk Bybit
- **Smooth Animation**: Animasi smooth saat perubahan harga
- **No Initial Animation**: Langsung menampilkan harga tanpa animasi count-up

### 2. Connection Status
- **Live Indicator**: Menunjukkan status "Live Data" saat terhubung
- **Exchange Info**: Menampilkan nama exchange (INDODAX/BYBIT)
- **Server Time**: Menampilkan waktu server masing-masing exchange
- **Status Colors**: Hijau (connected), Kuning (connecting), Merah (error)

### 3. Coin Icons
- **Indodax**: Menggunakan logo dari API Indodax
- **Bybit**: Fallback ke inisial cryptocurrency (e.g., BTC → "BT")
- **Smart Extraction**: Menangani format seperti "1000PEPE" → "PE"
- **Gradient Background**: Background gradient untuk inisial

## 🛡 Error Handling

### Network Issues
- **Automatic Retry**: Retry otomatis dengan exponential backoff
- **Multiple Fallbacks**: Beberapa proxy CORS sebagai fallback
- **Timeout Management**: Timeout handling untuk request yang lama
- **Connection Indicators**: Visual feedback untuk status koneksi

### User Experience
- **Graceful Errors**: Pesan error yang user-friendly
- **Loading States**: Loading indicators yang informatif
- **Fallback UI**: UI fallback saat data tidak tersedia
- **Recovery Actions**: Tombol untuk retry manual

## 🎯 Performance Optimizations

### Loading Performance
- **Component Lazy Loading**: Load komponen sesuai kebutuhan
- **API Caching**: Cache response untuk mengurangi API calls
- **Debounced Search**: Search dengan debouncing untuk efisiensi
- **Optimized Re-renders**: Minimalisir re-render yang tidak perlu

### Memory Management
- **Cleanup Functions**: Proper cleanup untuk timers dan listeners
- **Memory Leaks Prevention**: Mencegah memory leaks
- **Efficient State Updates**: State updates yang optimal

## 📸 Screenshots

### Dashboard Utama
- Header dengan connection status dan exchange toggle
- Grid cryptocurrency pairs dengan search functionality
- Real-time price updates dengan animasi smooth

### Trading Data
- Ticker information dengan price, volume, dan changes
- Recent trades dengan format value calculation yang baru
- Order book dengan buy/sell orders

### Responsive Design
- Layout mobile-friendly
- Touch-optimized interactions
- Adaptive grid layouts

## 🔮 Future Enhancements

### Planned Features
- [ ] Charts dan technical indicators
- [ ] Portfolio tracking
- [ ] Price alerts dan notifications
- [ ] Historical data visualization
- [ ] Multi-language support (ID/EN)
- [ ] Theme customization
- [ ] Advanced filtering options
- [ ] Data export functionality

### Technical Improvements
- [ ] PWA capabilities
- [ ] Offline mode support
- [ ] Advanced caching strategies
- [ ] Performance monitoring
- [ ] Automated testing
- [ ] CI/CD pipeline

## 📄 License

This project is created for educational purposes as part of programming assignment.

---

**Tugas Pemrogramman Crypto** - Built with ❤️ using Next.js, TypeScript, and Tailwind CSS