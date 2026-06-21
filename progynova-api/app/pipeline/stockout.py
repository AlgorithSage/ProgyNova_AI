import pandas as pd
from typing import List, Dict, Any

def detect_stockouts(
    features_df: pd.DataFrame, 
    predictions: List[float], 
    multiplier: float = 1.0, 
    buffer: float = 0.0
) -> List[Dict[str, Any]]:
    """Determine stockout risks where forecast (adjusted by safety parameters) exceeds stock on hand and assign threat level severity."""
    # Wire the predicted values
    features_df = features_df.copy()
    features_df["forecast"] = predictions
    
    # Find rows where adjusted forecasted demand is larger than current stock
    adjusted_forecast = features_df["forecast"] * multiplier + buffer
    at_risk = features_df[adjusted_forecast > features_df["stock_on_hand"]]
    
    alerts = []
    for idx, row in at_risk.iterrows():
        deficit = float(row["forecast"] - row["stock_on_hand"])
        
        # Severity tiers based on deficit unit scale
        if deficit > 100:
            severity = "CRITICAL"
        elif deficit > 50:
            severity = "HIGH"
        elif deficit > 10:
            severity = "MEDIUM"
        else:
            severity = "LOW"
            
        alerts.append({
            "original_index": int(idx),
            "entity_id": str(row["drug_id"]),
            "location_id": str(row["store_id"]),
            "time_index": int(row["week"]),
            "stock_on_hand": float(row["stock_on_hand"]),
            "forecast": float(row["forecast"]),
            "deficit": round(deficit, 2),
            "severity": severity,
            "recommended_reorder": int(row["recommended_order_qty"])
        })
        
    # Order by size of deficit descending to prioritize resolving larger shortages first
    alerts.sort(key=lambda x: x["deficit"], reverse=True)
    return alerts
