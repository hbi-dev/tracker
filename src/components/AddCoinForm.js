import React, { useState, useEffect, useRef } from "react";
import axios from "axios";

function AddCoinForm({ onCoinAdded }) {
  const [newAcquisition, setNewAcquisition] = useState({
    coin: {}, // Store the entire coin object here
    coinName: "", // This is the input field value for coin name
    exchange: "",
    quantity: "",
    purchasePrice: "",
  });

  const [allCoins, setAllCoins] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const inputRef = useRef(null);

  useEffect(() => {
    axios
      .get("http://localhost:9000/all-coins")
      .then((response) => {
        setAllCoins(response.data);
      })
      .catch((error) => console.error("Error fetching all coins for form:", error));
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    const selectedCoin = allCoins.find(
      (coin) => coin.name.toLowerCase() === value.toLowerCase()
    );

    if (name === "coinName") {
      setNewAcquisition({
        ...newAcquisition,
        [name]: value,
        coin: selectedCoin || {},
      });

      if (value.trim() === "") {
        setSuggestions([]);
        return;
      }

      const userInput = value.toLowerCase();
      const filteredCoins = allCoins.filter((coin) =>
        coin.name.toLowerCase().startsWith(userInput)
      );
      setSuggestions(filteredCoins);
    } else {
      setNewAcquisition({ ...newAcquisition, [name]: value });
    }
  };

  const handleAddAcquisition = (e) => {
    e.preventDefault();
    const { coin, exchange, quantity, purchasePrice } = newAcquisition;

    axios
      .post("http://localhost:9000/add", {
        coin_name: coin.name,
        exchange,
        quantity: parseFloat(quantity),
        purchase_price: parseFloat(purchasePrice),
      })
      .then(() => {
        onCoinAdded();
        setNewAcquisition({
          coin: {},
          coinName: "",
          exchange: "",
          quantity: "",
          purchasePrice: "",
        });
        setSuggestions([]);
      })
      .catch((error) => console.error("Error adding acquisition:", error));
  };

  const handleSuggestionClick = (selectedCoin) => {
    setNewAcquisition({
      ...newAcquisition,
      coin: selectedCoin,
      coinName: selectedCoin.name,
    });
    setSuggestions([]);
    inputRef.current.focus();
  };

  return (
    <form onSubmit={handleAddAcquisition} className="add-coin-form"> {/* Optionnel: ajouter une classe au formulaire */}
      <div>
        <label htmlFor="coinName">Coin Name:</label>
        <input
          type="text"
          id="coinName"
          name="coinName"
          placeholder="Coin Name"
          value={newAcquisition.coinName}
          onChange={handleInputChange}
          required
          ref={inputRef}
          autoComplete="off" // Désactiver l'autocomplétion du navigateur si elle interfère
        />
        {/* Envelopper la liste de suggestions pour un meilleur style */}
        {suggestions.length > 0 && (
          <div className="suggestions-container">
            {/* Laisser la datalist pour l'accessibilité, mais elle pourrait être cachée si la liste ul est préférée visuellement */}
            <datalist id="coin-suggestions">
              {suggestions.map((coin) => (
                <option key={`${coin.id}-datalist`} value={coin.name}>
                  {coin.name} - ({coin.symbol.toUpperCase()})
                </option>
              ))}
            </datalist>
            {/* Liste cliquable stylée via App.css */}
            <ul> {/* Styles en ligne enlevés, gérés par App.css via .suggestions-container ul et li */}
              {suggestions.map((coin) => (
                <li
                  key={coin.id}
                  onClick={() => handleSuggestionClick(coin)}
                >
                  {coin.name} - ({coin.symbol.toUpperCase()}) - {coin.id}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <div>
        <label htmlFor="exchange">Exchange:</label>
        <input
          type="text"
          id="exchange"
          name="exchange"
          placeholder="Exchange"
          value={newAcquisition.exchange}
          onChange={handleInputChange}
          required
        />
      </div>
      <div>
        <label htmlFor="quantity">Quantity:</label>
        <input
          type="number"
          id="quantity"
          name="quantity"
          placeholder="Quantity"
          value={newAcquisition.quantity}
          onChange={handleInputChange}
          step="any"
          required
        />
      </div>
      <div>
        <label htmlFor="purchasePrice">Purchase Price:</label>
        <input
          type="number"
          id="purchasePrice"
          name="purchasePrice"
          placeholder="Purchase Price"
          value={newAcquisition.purchasePrice}
          onChange={handleInputChange}
          step="any"
          required
        />
      </div>
      <button type="submit">Add Acquisition</button>
    </form>
  );
}

export default AddCoinForm;