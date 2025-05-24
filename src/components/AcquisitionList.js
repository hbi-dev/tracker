// AcquisitionList.js
import React from "react";
import Alerts from "./Alerts";
import "./Alerts.css";

function AcquisitionList({ acquisitions, onCheckAlert, alerts, checkTimes }) {
  return (
    <table>
      <thead>
        <tr>
          <th>Id</th>
          <th>Coin</th>
          <th>Exchange</th>
          <th>Quantity</th>
          <th>Purchase Price</th>
          <th>Alerts</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {acquisitions.map((acq, index) => {
          const coinName = acq.coin_name;
          const alert = alerts[coinName];
          const lastChecked = checkTimes[coinName];

          return (
            <tr key={index}>
              <td>{acq.id}</td>
              <td>{coinName}</td>
              <td>{acq.exchange}</td>
              <td>{acq.quantity}</td>
              <td>{acq.purchase_price}</td>
              <td><Alerts alert={alert} /></td>
              <td>
                <button onClick={() => onCheckAlert(acq)}>Refresh</button>
                {lastChecked && (
                  <div style={{ fontSize: "0.75rem", marginTop: "4px" }}>
                    <em>Last checked: {lastChecked.toLocaleTimeString()}</em>
                  </div>
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export default AcquisitionList;
