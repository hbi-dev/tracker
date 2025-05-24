const express = require("express");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();
const axios = require("axios");

const app = express();
const DB_FILE = "crypto.db";

const API_URLs = [
  "https://api.coingecko.com/api/v3/simple/price?vs_currencies=usd",
  "https://api.coinpaprika.com/v1/tickers",
];

// Configure CORS origins
const origins = ["http://localhost:3000"];
app.use(
  cors({
    origin: origins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Middleware to parse JSON bodies
app.use(express.json());

// Database setup
const initDb = () => {
  const db = new sqlite3.Database(DB_FILE);

  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS acquisitions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            coin_name TEXT NOT NULL,
            exchange TEXT NOT NULL,
            quantity REAL NOT NULL,
            purchase_price REAL NOT NULL
        )`);

    db.run(`CREATE TABLE IF NOT EXISTS user_settings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            alert_threshold REAL DEFAULT 30.0
        )`);
  });

  db.close();
};

// Initialize the database
initDb();

// Fetch crypto prices from a randomly selected API
app.get("/price", async (req, res) => {
  console.log("query -->", req.query);
  console.log("body -->", req.body);

  try {
    const randomApiUrlIndex = Math.floor(Math.random() * API_URLs.length);
    let id;
    let url;

    if (randomApiUrlIndex === 0) {
      id = req.query.id;
      url = `${API_URLs[randomApiUrlIndex]}&ids=${id}`;
    } else if (randomApiUrlIndex === 1) {
      id = req.query.id;
      url = `${API_URLs[randomApiUrlIndex]}/${id}`;
    }
    console.log(url);

    const response = await axios.get(url);
    const data = response.data;
    res.json(data);
  } catch (error) {
    console.error("Error in /price:", error);
    res.status(500).json({ error: "Failed to fetch data from the API" });
  }
});

// Fetch all coins
app.get("/all-coins", async (req, res) => {
  try {
    const response = await axios.get("https://api.coinpaprika.com/v1/tickers");
    const allCoins = response.data;
    const top100Coins = allCoins.slice(0, 100);
    res.json(top100Coins);
  } catch (error) {
    console.error("Error fetching all coins:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Add acquisition
app.post("/add", (req, res) => {
  const { coin_name, exchange, quantity, purchase_price } = req.body;
  const db = new sqlite3.Database(DB_FILE);

  db.run(
    "INSERT INTO acquisitions (coin_name, exchange, quantity, purchase_price) VALUES (?, ?, ?, ?)",
    [coin_name, exchange, quantity, purchase_price],
    function (err) {
      db.close();

      if (err) {
        return res.status(500).json({ error: "Failed to add acquisition" });
      }

      res.json({ message: "Acquisition added successfully" });
    }
  );
});

// List acquisitions
app.get("/acquisitions", (req, res) => {
  const db = new sqlite3.Database(DB_FILE);

  db.all("SELECT * FROM acquisitions", [], (err, rows) => {
    db.close();

    if (err) {
      return res.status(500).json({ error: "Failed to fetch acquisitions" });
    }

    res.json(rows);
  });
});

// NEW /refresh endpoint logic
app.get("/refresh", async (req, res) => {
  const { coinName } = req.query; // Expecting coinName from frontend
  const db = new sqlite3.Database(DB_FILE);

  try {
    // 1. Get current price from CoinPaprika
    const tickersResponse = await axios.get("https://api.coinpaprika.com/v1/tickers");
    const allTickers = tickersResponse.data;

    // Debugging: Log the type and a sample of allTickers to understand its structure
    console.log(`[DEBUG] allTickers type: ${typeof allTickers}, length: ${allTickers.length}`);
    if (allTickers.length > 0) {
      console.log(`[DEBUG] First ticker example:`, allTickers[0]);
    }
    // Debugging: Log the incoming coinName
    console.log(`[DEBUG] Incoming coinName: "${coinName}", type: ${typeof coinName}`);


    // FIX: Add a safe check for ticker.name being a string AND coinName being a string
    const targetCoinTicker = allTickers.find((ticker) => {
      const isTickerValid = ticker && typeof ticker.name === 'string';
      const isCoinNameValid = typeof coinName === 'string';

      // More granular logging inside the find callback
      if (!isTickerValid) {
        console.warn(`[DEBUG] Invalid ticker found in allTickers array:`, ticker);
      }
      if (!isCoinNameValid) {
        console.warn(`[DEBUG] coinName is not a string: "${coinName}", type: ${typeof coinName}`);
      }

      return isTickerValid && isCoinNameValid && ticker.name.toLowerCase() === coinName.toLowerCase();
    });

    if (!targetCoinTicker || !targetCoinTicker.quotes || !targetCoinTicker.quotes.USD || !targetCoinTicker.quotes.USD.price) {
      db.close();
      console.error(`Current price not found for ${coinName} from external API.`);
      return res.status(404).json({ error: `Current price not found for ${coinName} from external API.` });
    }

    const currentPrice = targetCoinTicker.quotes.USD.price;

    // 2. Get purchase price from database for the specific acquisition
    const acquisitionRow = await new Promise((resolve, reject) => {
      db.get("SELECT purchase_price FROM acquisitions WHERE coin_name = ?", [coinName], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    db.close(); // Close DB connection after query

    if (!acquisitionRow || acquisitionRow.purchase_price === undefined) {
      console.error(`Purchase price not found for ${coinName} in your acquisitions.`);
      return res.status(404).json({ error: `Purchase price not found for ${coinName} in your acquisitions.` });
    }

    const purchasePrice = acquisitionRow.purchase_price;

    // 3. Calculate drop
    let drop = 0;
    if (purchasePrice > 0) {
        drop = ((purchasePrice - currentPrice) / purchasePrice) * 100;
    }

    const alertThreshold = 30; // You can make this configurable from user_settings later
    const alertTriggered = drop >= alertThreshold;

    return res.json({
      coin_name: coinName,
      current_price: currentPrice,
      purchase_price: purchasePrice,
      drop: drop.toFixed(2),
      alert: alertTriggered,
    });

  } catch (error) {
    console.error("Error in /refresh (new logic):", error);
    db.close(); // Ensure DB connection is closed on error
    res.status(500).json({ error: "Internal Server Error during price check." });
  }
});

// Start the server
const PORT = 9000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
