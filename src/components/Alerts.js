import React, { useState } from 'react';
// Importez vos styles. Si vous avez un Alerts.css spécifique, sinon App.css.
// import './Alerts.css'; // Si vous créez un fichier CSS dédié pour ce composant

function Alerts({ alert }) {
  const [isHovered, setIsHovered] = useState(false);

  // Si aucune donnée d'alerte n'est présente (avant un clic sur Refresh, ou si l'alerte est vide)
  if (!alert || Object.keys(alert).length === 0) {
    // Vous pouvez retourner null pour ne rien afficher, ou un indicateur neutre/placeholder
    return <span className="alert-indicator placeholder" title="Refresh to check alert"></span>;
    // ou return null; si vous préférez ne rien afficher
  }

  let indicatorClassName = "alert-indicator";
  let detailsContent = null;
  let statusTitle = "Alert Status";

  if (alert.error) {
    indicatorClassName += " error-indicator"; // Classe spécifique pour l'indicateur d'erreur
    statusTitle = "Error";
    detailsContent = (
      <p className="alert-detail-text">Error: {alert.error}</p>
    );
  } else {
    if (alert.alert) { // Alerte active (drop >= 30%)
      indicatorClassName += " triggered-indicator";
      statusTitle = "Alert Triggered!";
    } else { // Pas d'alerte (drop < 30%)
      indicatorClassName += " safe-indicator";
      statusTitle = "No Alert";
    }
    detailsContent = (
      <>
        {alert.coin_name && <p className="alert-detail-text"><strong>Coin:</strong> {alert.coin_name}</p>}
        {alert.current_price !== undefined && <p className="alert-detail-text"><strong>Current Price:</strong> ${alert.current_price.toFixed(2)}</p>}
        {alert.purchase_price !== undefined && <p className="alert-detail-text"><strong>Purchase Price:</strong> ${alert.purchase_price.toFixed(2)}</p>}
        {alert.drop !== undefined && <p className="alert-detail-text"><strong>Price Drop:</strong> {alert.drop}%</p>}
        {alert.alert ? (
          <p className="alert-detail-text alert-summary triggered">Drop {alert.threshold && (
            <p>Seuil d'alerte : {alert.threshold}%</p>
          )}
          </p>
        ) : (
          <p className="alert-detail-text alert-summary safe">Drop {alert.threshold && (
            <p>Seuil d'alerte : {alert.threshold}%</p>
          )}
          </p>
        )}
      </>
    );
  }

  return (
    <div
      className="alert-hover-area" // Nouveau conteneur pour la zone de survol et le positionnement du tooltip
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <span className={indicatorClassName}></span> {/* Ceci est l'indicateur visuel (point) */}

      {isHovered && detailsContent && (
        <div className="alert-details-tooltip">
          <h4 className="tooltip-title">{statusTitle}</h4>
          {detailsContent}
        </div>
      )}
    </div>
  );
}

export default Alerts;