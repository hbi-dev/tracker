from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import sqlite3
import requests

app = FastAPI()
API_URL = "https://query1.finance.yahoo.com/v7/finance/quote"
DB_FILE = "crypto.db"

# Configure CORS origins

origins = ["http://localhost:9000"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database setup
def init_db():
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS acquisitions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        coin_name TEXT NOT NULL,
        exchange TEXT NOT NULL,
        quantity REAL NOT NULL,
        purchase_price REAL NOT NULL
    )
    """)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS user_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        alert_threshold REAL DEFAULT 30.0
    )
    """)
    conn.commit()
    conn.close()

# Initialize DB
init_db()

# Fetch crypto price from API
@app.get("/price")
def get_price(symbol: str, exchange: str):
    query = f"{symbol}%3A{exchange}"
    response = requests.get(f"{API_URL}?symbols={query}")
    data = response.json()
    if "quoteResponse" in data:
        return data["quoteResponse"]["result"]
    return {"error": "Could not fetch data"}

# Add acquisition
@app.post("/add")
def add_acquisition(coin_name: str, exchange: str, quantity: float, purchase_price: float):
    conn = sqlite3.connect(DB_FILE)
    print("Hamid -->", coin_name)
    cursor = conn.cursor()
    cursor.execute("INSERT INTO acquisitions (coin_name, exchange, quantity, purchase_price) VALUES (?, ?, ?, ?)",
                   (coin_name, exchange, quantity, purchase_price))
    conn.commit()
    conn.close()
    return {"message": "Acquisition added successfully"}

# List acquisitions
@app.get("/acquisitions")
def list_acquisitions():
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM acquisitions")
    acquisitions = cursor.fetchall()
    conn.close()
    return acquisitions

# Check price drop and alert
@app.get("/alert")
def check_alert(symbol: str, exchange: str):
    query = f"{symbol}%3A{exchange}"
    response = requests.get(f"{API_URL}?symbols={query}")
    data = response.json()
    if "quoteResponse" in data and data["quoteResponse"]["result"]:
        current_price = data["quoteResponse"]["result"][0]["regularMarketPrice"]
        old_price = data["quoteResponse"]["result"][0]["regularMarketPreviousClose"]
        drop = ((old_price - current_price) / old_price) * 100
        return {"drop": drop, "alert": drop >= 30}
    return {"error": "Could not calculate alert"}



#pip install fastapi uvicorn requests
#run du back
# python3 -m uvicorn src.server:app --reload