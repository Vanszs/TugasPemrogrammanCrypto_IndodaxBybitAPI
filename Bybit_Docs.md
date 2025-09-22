# Dokumentasi Lengkap API Bybit V5 - Endpoint Publik dan WebSocket untuk Real-time Data

## REST API Endpoints Publik

### Base URL
```plaintext
# Mainnet
https://api.bybit.com

# Testnet  
https://api-testnet.bybit.com

# Alternative Mainnet
https://api.bytick.com
```

### 1. Get Kline/Candlestick Data
```plaintext
GET /v5/market/kline

Request Parameters:
- category (optional): string - Product type: spot, linear, inverse. Default: linear
- symbol (required): string - Symbol name, e.g., BTCUSDT (uppercase)
- interval (required): string - Kline interval: 1, 3, 5, 15, 30, 60, 120, 240, 360, 720, D, W, M
- start (optional): integer - Start timestamp (ms)
- end (optional): integer - End timestamp (ms)
- limit (optional): integer - Limit per page [1, 1000]. Default: 200

Response:
{
  "retCode": 0,
  "retMsg": "OK",
  "result": {
    "symbol": "BTCUSDT",
    "category": "linear",
    "list": [
      [
        "1670608800000",  // Start time (ms)
        "17071",          // Open price
        "17073",          // High price
        "17027",          // Low price
        "17055.5",        // Close price
        "268611",         // Volume
        "15.74462667"     // Turnover
      ]
    ]
  }
}

Example Request:
GET /v5/market/kline?category=linear&symbol=BTCUSDT&interval=1&limit=100
```

### 2. Get Orderbook Data
```plaintext
GET /v5/market/orderbook

Request Parameters:
- category (required): string - Product type: spot, linear, inverse, option
- symbol (required): string - Symbol name, e.g., BTCUSDT (uppercase)
- limit (optional): integer - Limit size for each bid and ask

Response:
{
  "retCode": 0,
  "retMsg": "OK", 
  "result": {
    "s": "BTCUSDT",
    "b": [                // Bids (descending by price)
      ["65485.47", "47.081829"]  // [price, size]
    ],
    "a": [                // Asks (ascending by price)
      ["65557.7", "16.606555"]   // [price, size]
    ],
    "ts": 1716863719031,  // System timestamp
    "u": 230704,          // Update ID
    "seq": 1432604333,    // Cross sequence
    "cts": 1716863718905  // Matching engine timestamp
  }
}

Example Request:
GET /v5/market/orderbook?category=spot&symbol=BTCUSDT&limit=50
```

### 3. Get Ticker Data
```plaintext
GET /v5/market/tickers

Request Parameters:
- category (required): string - Product type: spot, linear, inverse, option
- symbol (optional): string - Symbol name (uppercase)
- baseCoin (optional): string - Base coin (for options)
- expDate (optional): string - Expiry date for options (e.g., 25DEC22)

Response (Linear/Inverse):
{
  "retCode": 0,
  "retMsg": "OK",
  "result": {
    "category": "linear",
    "list": [{
      "symbol": "BTCUSDT",
      "lastPrice": "16597.00",
      "indexPrice": "16598.54", 
      "markPrice": "16596.00",
      "prevPrice24h": "16464.50",
      "price24hPcnt": "0.008047",
      "highPrice24h": "30912.50",
      "lowPrice24h": "15700.00",
      "volume24h": "49337318",
      "turnover24h": "2352.94950046",
      "openInterest": "373504107",
      "fundingRate": "-0.001034",
      "nextFundingTime": "1672387200000",
      "bid1Price": "16596.00",
      "bid1Size": "1",
      "ask1Price": "16597.50", 
      "ask1Size": "1"
    }]
  }
}

Example Request:
GET /v5/market/tickers?category=linear&symbol=BTCUSDT
```

### 4. Get Recent Public Trades
```plaintext
GET /v5/market/recent-trade

Request Parameters:
- category (required): string - Product type: spot, linear, inverse, option
- symbol (optional): string - Symbol name (uppercase)
- baseCoin (optional): string - Base coin (for options)
- optionType (optional): string - Call or Put (for options)
- limit (optional): integer - Limit per page

Response:
{
  "retCode": 0,
  "retMsg": "OK",
  "result": {
    "category": "spot",
    "list": [{
      "execId": "2100000000007764263",
      "symbol": "BTCUSDT", 
      "price": "16618.49",
      "size": "0.00012",
      "side": "Buy",
      "time": "1672052955758",
      "isBlockTrade": false,
      "isRPITrade": true,
      "seq": "123456"
    }]
  }
}

Example Request:
GET /v5/market/recent-trade?category=spot&symbol=BTCUSDT&limit=100
```

### 5. Get Instruments Info
```plaintext
GET /v5/market/instruments-info

Request Parameters:
- category (required): string - Product type: spot, linear, inverse, option
- symbol (optional): string - Symbol name (uppercase)
- status (optional): string - Symbol status filter
- baseCoin (optional): string - Base coin (uppercase)
- limit (optional): integer - [1, 1000]. Default: 500
- cursor (optional): string - Pagination cursor

Response:
{
  "retCode": 0,
  "retMsg": "OK",
  "result": {
    "category": "linear",
    "nextPageCursor": "",
    "list": [{
      "symbol": "BTCUSDT",
      "contractType": "LinearPerpetual",
      "status": "Trading",
      "baseCoin": "BTC",
      "quoteCoin": "USDT",
      "settleCoin": "USDT",
      "launchTime": "1585526400000",
      "priceScale": "2",
      "leverageFilter": {
        "minLeverage": "1",
        "maxLeverage": "100.00",
        "leverageStep": "0.01"
      },
      "priceFilter": {
        "minPrice": "0.10",
        "maxPrice": "1999999.80", 
        "tickSize": "0.10"
      },
      "lotSizeFilter": {
        "maxOrderQty": "1190.000",
        "minOrderQty": "0.001",
        "qtyStep": "0.001"
      },
      "fundingInterval": 480,
      "copyTrading": "both"
    }]
  }
}

Example Request:
GET /v5/market/instruments-info?category=linear&limit=1000
```

### 6. Get Funding Rate History[1]
```plaintext
GET /v5/market/funding/history

Request Parameters:
- category (required): string - Product type: linear, inverse
- symbol (required): string - Symbol name (uppercase)
- startTime (optional): integer - Start timestamp (ms)
- endTime (optional): integer - End timestamp (ms)
- limit (optional): integer - [1, 200]. Default: 200

Response:
{
  "retCode": 0,
  "retMsg": "OK", 
  "result": {
    "category": "linear",
    "list": [{
      "symbol": "ETHPERP",
      "fundingRate": "0.0001",
      "fundingRateTimestamp": "1672041600000"
    }]
  }
}

Example Request:
GET /v5/market/funding/history?category=linear&symbol=BTCUSDT&limit=100
```

### 7. Get Open Interest[2]
```plaintext
GET /v5/market/open-interest

Request Parameters:
- category (required): string - Product type: linear, inverse
- symbol (required): string - Symbol name (uppercase)
- intervalTime (required): string - Interval: 5min, 15min, 30min, 1h, 4h, 1d
- startTime (optional): integer - Start timestamp (ms)
- endTime (optional): integer - End timestamp (ms)
- limit (optional): integer - [1, 200]. Default: 50
- cursor (optional): string - Pagination cursor

Response:
{
  "retCode": 0,
  "retMsg": "OK",
  "result": {
    "symbol": "BTCUSD",
    "category": "inverse", 
    "list": [{
      "openInterest": "461134384.00000000",
      "timestamp": "1669571400000"
    }],
    "nextPageCursor": ""
  }
}

Example Request:
GET /v5/market/open-interest?category=linear&symbol=BTCUSDT&intervalTime=1h&limit=200
```

## WebSocket API untuk Real-time Data[3][4][5][6]

### Connection URLs

#### Mainnet
```plaintext
# Spot
wss://stream.bybit.com/v5/public/spot

# USDT, USDC Perpetual & USDT Futures  
wss://stream.bybit.com/v5/public/linear

# Inverse Contracts
wss://stream.bybit.com/v5/public/inverse

# Options
wss://stream.bybit.com/v5/public/option

# Spread Trading
wss://stream.bybit.com/v5/public/spread
```

#### Testnet
```plaintext
# Spot
wss://stream-testnet.bybit.com/v5/public/spot

# USDT, USDC Perpetual & USDT Futures
wss://stream-testnet.bybit.com/v5/public/linear

# Inverse Contracts
wss://stream-testnet.bybit.com/v5/public/inverse

# Options
wss://stream-testnet.bybit.com/v5/public/option

# Spread Trading
wss://stream-testnet.bybit.com/v5/public/spread
```

### Connection Limits dan Rate Limits[7]
```plaintext
- Maksimum 500 koneksi dalam 5 menit per WebSocket domain
- Public channels: maksimum 21,000 karakter dalam array "args"
- Spot: maksimum 10 args per subscription request
- Options: maksimum 2000 args per connection
- Futures dan Spread: tidak ada limit args
```

### Ping/Pong Heartbeat[7]
```plaintext
# Send Ping (setiap 20 detik direkomendasikan)
{
  "req_id": "100001",
  "op": "ping"
}

# Pong Response - Spot
{
  "success": true,
  "ret_msg": "pong", 
  "conn_id": "0970e817-426e-429a-a679-ff7f55e0b16a",
  "op": "ping"
}

# Pong Response - Linear/Inverse
{
  "success": true,
  "ret_msg": "pong",
  "conn_id": "465772b1-7630-4fdc-a492-e003e6f0f260",
  "req_id": "",
  "op": "ping"
}
```

### Subscription Format[7]
```plaintext
# Subscribe ke topic
{
  "req_id": "test",
  "op": "subscribe",
  "args": [
    "orderbook.1.BTCUSDT",
    "publicTrade.BTCUSDT", 
    "tickers.BTCUSDT"
  ]
}

# Unsubscribe dari topic
{
  "op": "unsubscribe",
  "args": [
    "publicTrade.BTCUSDT"
  ],
  "req_id": "customised_id"
}

# Subscribe Response
{
  "success": true,
  "ret_msg": "subscribe",
  "conn_id": "2324d924-aa4d-45b0-a858-7b8be29ab52b",
  "req_id": "10001", 
  "op": "subscribe"
}
```

### 1. Kline WebSocket[3]
```plaintext
Topic: kline.{interval}.{symbol}
Example: kline.5.BTCUSDT

Available Intervals: 1, 3, 5, 15, 30, 60, 120, 240, 360, 720, D, W, M
Push Frequency: 1-60 seconds

Response:
{
  "topic": "kline.5.BTCUSDT",
  "data": [{
    "start": 1672324800000,      // Start timestamp (ms)
    "end": 1672325099999,        // End timestamp (ms) 
    "interval": "5",             // Kline interval
    "open": "16649.5",           // Open price
    "close": "16677",            // Close price
    "high": "16677",             // High price
    "low": "16608",              // Low price
    "volume": "2.081",           // Trade volume
    "turnover": "34666.4005",    // Turnover
    "confirm": false,            // Whether tick is ended
    "timestamp": 1672324988882   // Last matched order timestamp
  }],
  "ts": 1672324988882,
  "type": "snapshot"
}
```

### 2. Orderbook WebSocket[4]
```plaintext
Topic: orderbook.{depth}.{symbol}
Example: orderbook.50.BTCUSDT

Available Depths:
- Linear/Inverse: 1 (10ms), 50 (20ms), 200 (100ms), 1000 (300ms)
- Spot: 1 (10ms), 50 (20ms), 200 (200ms), 1000 (300ms) 
- Option: 25 (20ms), 100 (100ms)

Snapshot Response:
{
  "topic": "orderbook.50.BTCUSDT",
  "type": "snapshot",
  "ts": 1672304484978,
  "data": {
    "s": "BTCUSDT",
    "b": [                         // Bids (descending)
      ["16493.50", "0.006"]       // [price, size]
    ],
    "a": [                         // Asks (ascending)  
      ["16611.00", "0.029"]       // [price, size]
    ],
    "u": 18521288,                 // Update ID
    "seq": 7961638724              // Cross sequence
  },
  "cts": 1672304484976
}

Delta Response:
{
  "topic": "orderbook.50.BTCUSDT", 
  "type": "delta",
  "ts": 1687940967466,
  "data": {
    "s": "BTCUSDT",
    "b": [
      ["30240.00", "0"]            // Size 0 = delete entry
    ],
    "a": [
      ["30248.70", "0"]            // Size 0 = delete entry  
    ],
    "u": 177400507,
    "seq": 66544703342
  }
}
```

### 3. Ticker WebSocket[5]
```plaintext
Topic: tickers.{symbol}
Example: tickers.BTCUSDT

Push Frequency: 
- Derivatives & Options: 100ms
- Spot: real-time

Response (Linear):
{
  "topic": "tickers.BTCUSDT",
  "type": "snapshot",
  "data": {
    "symbol": "BTCUSDT",
    "tickDirection": "PlusTick",
    "price24hPcnt": "0.017103",
    "lastPrice": "17216.00",
    "prevPrice24h": "16926.50", 
    "highPrice24h": "17281.50",
    "lowPrice24h": "16915.00",
    "markPrice": "17217.33",
    "indexPrice": "17227.36",
    "openInterest": "68744.761",
    "volume24h": "91705.276",
    "turnover24h": "1570383121.943499",
    "nextFundingTime": "1673280000000",
    "fundingRate": "-0.000212",
    "bid1Price": "17215.50",
    "bid1Size": "84.489",
    "ask1Price": "17216.00", 
    "ask1Size": "83.020"
  },
  "cs": 24987956059,
  "ts": 1673272861686
}

Response (Spot):
{
  "topic": "tickers.BTCUSDT",
  "ts": 1673853746003,
  "type": "snapshot",
  "cs": 2588407389,
  "data": {
    "symbol": "BTCUSDT",
    "lastPrice": "21109.77",
    "highPrice24h": "21426.99", 
    "lowPrice24h": "20575",
    "prevPrice24h": "20704.93",
    "volume24h": "6780.866843",
    "turnover24h": "141946527.22907118",
    "price24hPcnt": "0.0196"
  }
}
```

### 4. Public Trade WebSocket[6]
```plaintext
Topic: publicTrade.{symbol}
Example: publicTrade.BTCUSDT
Note: Options use baseCoin, e.g., publicTrade.BTC

Push Frequency: real-time

Response:
{
  "topic": "publicTrade.BTCUSDT",
  "type": "snapshot", 
  "ts": 1672304486868,
  "data": [{
    "T": 1672304486865,           // Trade timestamp
    "s": "BTCUSDT",               // Symbol
    "S": "Buy",                   // Taker side
    "v": "0.001",                 // Trade size
    "p": "16578.50",              // Trade price
    "L": "PlusTick",              // Price direction
    "i": "20f43950-d8dd-5b31-9112-a178eb6023af", // Trade ID
    "BT": false,                  // Block trade
    "seq": 1783284617            // Cross sequence
  }]
}
```

### Authentication untuk Private Topics (Tidak untuk Public)[7]
```plaintext
# Auth Message
{
  "req_id": "10001",
  "op": "auth",
  "args": [
    "api_key",
    1662350400000,    // Expires timestamp  
    "signature"       // HMAC SHA256 signature
  ]
}

# Auth Response
{
  "success": true,
  "ret_msg": "",
  "op": "auth", 
  "conn_id": "cejreaspqfh3sjdnldmg-p"
}
```

### Error Handling
```plaintext
Common Response Codes:
- retCode: 0 = Success
- retCode: 10001 = Parameter error
- retCode: 10006 = Invalid signature  
- retCode: 10016 = Rate limit exceeded

HTTP Status Codes:
- 200: OK
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 429: Rate limit exceeded
- 500: Internal Server Error
```

Dokumentasi ini mencakup endpoint API publik utama dan WebSocket streams untuk mendapatkan data real-time dari Bybit V5 API. Semua endpoint publik tidak memerlukan autentikasi dan dapat digunakan langsung untuk mengakses data pasar.

[1](https://bybit-exchange.github.io/docs/v5/intro)
[2](https://bybit-exchange.github.io/docs/v5/ws/connect)
[3](https://www.bybit.com/future-activity/en/developer)
[4](https://bybit-exchange.github.io/docs/v5/websocket/trade/guideline)
[5](https://github.com/JKorf/Bybit.Net)
[6](https://pkg.go.dev/github.com/bybit-exchange/bybit.go.api)
[7](https://github.com/yufuquant/rust-bybit)
[8](https://github.com/bmoscon/cryptofeed/issues/1075)
[9](https://bybit-exchange.github.io/docs/changelog/v5)
[10](https://gealber.com/bybit-websocket-tickers)
[11](https://www.esegece.com/help/sgcWebSockets/Components/APIs/API/API_Bybit.htm)
[12](https://github.com/bybit-exchange/pybit/issues/164)
[13](https://github.com/tiagosiebler/bybit-api/issues/368)
[14](https://github.com/bybit-exchange/bybit.go.api/)
[15](https://bybit-exchange.github.io/docs/v5/websocket/public/orderbook)
[16](https://bybit-exchange.github.io/docs/)
[17](https://wundertrading.com/journal/en/learn/article/bybit-api)
[18](https://bybit-exchange.github.io/docs/v5/websocket/private/order)
[19](https://packagist.org/packages/carpenstar/bybitapi-sdk-websockets-v5)
[20](https://github.com/bybit-exchange/docs)
[21](https://bybit-exchange.github.io/docs/v5/market/history-fund-rate)
[22](https://github.com/Enclave-Markets/bybit)
[23](https://www.bybit.com/en/announcement-info/fund-rate/)
[24](https://hexdocs.pm/crypto_exchange_apis/0.1.6/CryptoExchangeAPIs.Bybit.V5.html)
[25](https://bybit-exchange.github.io/docs/api-explorer/v5/market/market)
[26](https://vezgo.com/blog/bybit-api-cheat-sheet-for-developers/)
[27](https://www.postman.com/telecoms-observer-4191831/bybit/documentation/9fjolpj/open-api-v5-english?entity=folder-25479129-1bea065b-4316-4f98-ba6c-8b5a1d1d12dd)
[28](https://www.meshconnect.com/blog/does-bybit-have-an-api)
[29](https://bybit-exchange.github.io/docs/api-explorer/v5/market/history-fund-rate)
[30](https://www.bybit.com/derivatives/en/history-data)
[31](https://github.com/hirokisan/bybit)
[32](https://www.postman.com/telecoms-observer-4191831/bybit/collection/9fjolpj/open-api-v5-english)
[33](https://www.bybit.com/en/help-center/article/Introduction-to-Bybit-Unified-Trading-Account)