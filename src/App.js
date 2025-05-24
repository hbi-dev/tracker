// App.js
import React, { useState, useEffect } from "react";
import axios from "axios";
import "./App.css";
import AcquisitionList from "./components/AcquisitionList";
import AddCoinForm from "./components/AddCoinForm";

function App() {
  const [acquisitions, setAcquisitions] = useState([]);
  const [alerts, setAlerts] = useState({});        // 🔔 par coin_name
  const [checkTimes, setCheckTimes] = useState({}); // ⏰ par coin_name
  const [nextRefreshTime, setNextRefreshTime] = useState(null);
  const [countdown, setCountdown] = useState(""); // chaîne formatée type "1h 59m 43s"
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(() => {
    const saved = localStorage.getItem("autoRefreshEnabled");
    return saved === null ? true : saved === "true";
  });
  const [alertThreshold, setAlertThreshold] = useState(() => {
    const saved = localStorage.getItem("alertThreshold");
    return saved ? parseFloat(saved) : 30;
  });


  const fetchAcquisitions = () => {
    axios
      .get("http://localhost:9000/acquisitions")
      .then((response) => setAcquisitions(response.data))
      .catch((error) => console.error("Error fetching acquisitions:", error));
  };

  useEffect(() => {
    if (!autoRefreshEnabled || acquisitions.length === 0) return;

    // 🔄 Lancer une vérification immédiate
    acquisitions.forEach((acq) => checkAlert(acq));

    // 🕒 Définir prochaine exécution
    const next = new Date(Date.now() + 2 * 60 * 60 * 1000);
    setNextRefreshTime(next);

    const intervalId = setInterval(() => {
      acquisitions.forEach((acq) => checkAlert(acq));
      const next = new Date(Date.now() + 2 * 60 * 60 * 1000);
      setNextRefreshTime(next);
    }, 2 * 60 * 60 * 1000);

    return () => clearInterval(intervalId);
  }, [acquisitions, autoRefreshEnabled]);

  useEffect(() => {
    if (!nextRefreshTime) return;

    const timerId = setInterval(() => {
      const now = new Date();
      const diff = nextRefreshTime - now;

      if (diff <= 0) {
        setCountdown("Refreshing...");
      } else {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setCountdown(`${hours}h ${minutes}m ${seconds}s`);
      }
    }, 1000);

    return () => clearInterval(timerId);
  }, [nextRefreshTime]);

  useEffect(() => {
    localStorage.setItem("autoRefreshEnabled", autoRefreshEnabled);
  }, [autoRefreshEnabled]);

  useEffect(() => {
    localStorage.setItem("alertThreshold", alertThreshold);
  }, [alertThreshold]);


  const checkAlert = (acquisition, customThreshold = alertThreshold) => {
    const coinName = acquisition?.coin_name;
    if (!coinName || typeof coinName !== "string") {
      console.error("[checkAlert] Invalid coin name:", acquisition);
      return;
    }

    axios
      .get(`http://localhost:9000/refresh?coinName=${coinName}`)
      .then((response) => {
        const alertData = {
          ...response.data,
          threshold: customThreshold
        };

        setAlerts((prev) => ({
          ...prev,
          [coinName]: alertData,
        }));

        setCheckTimes((prev) => ({
          ...prev,
          [coinName]: new Date(),
        }));
      })
      .catch((error) => {
        console.error("[checkAlert] Error:", error);
        setAlerts((prev) => ({
          ...prev,
          [coinName]: { error: "Erreur lors de la vérification." },
        }));
      });
  };

  return (
    <div className="App">
      <h1>Crypto Tracker</h1>
      <AddCoinForm onCoinAdded={fetchAcquisitions} />

      <h2>Vos Acquisitions</h2>
      <div style={{ marginBottom: "10px" }}>
        <label>
          <input
            type="checkbox"
            checked={autoRefreshEnabled}
            onChange={() => setAutoRefreshEnabled((prev) => !prev)}
          />
          🔁 Auto-rafraîchissement toutes les 2h
        </label>
        <div style={{ marginTop: "10px" }}>
          <label>
            🚨 Seuil d'alerte :{" "}
            <input
              type="number"
              value={alertThreshold}
              onChange={(e) => setAlertThreshold(Number(e.target.value))}
              min="0"
              max="100"
              step="1"
            />
            %
          </label>
        </div>
      </div>
      {countdown && (
        <div style={{ marginTop: "10px", fontStyle: "italic", color: "#666" }}>
          ⏳ Prochain rafraîchissement automatique dans : {countdown}
        </div>
      )}
      <AcquisitionList
        acquisitions={acquisitions}
        onCheckAlert={checkAlert}
        alerts={alerts}
        checkTimes={checkTimes}
      />
    </div>
  );
}

export default App;
