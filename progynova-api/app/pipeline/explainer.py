import shap
from typing import Dict, Any, List
import numpy as np

# Cache explainer instance to avoid rebuilding overhead on every call
_explainer = None

def explain_predictions(model, X: np.ndarray, feature_cols: List[str], item_index: int) -> Dict[str, Any]:
    """Calculate SHAP values for a single item index on-the-fly and return explanation payload."""
    global _explainer
    if _explainer is None:
        _explainer = shap.TreeExplainer(model)
        
    if item_index < 0 or item_index >= len(X):
        raise ValueError(f"Selected item_index {item_index} out of bounds for feature matrix of length {len(X)}")
        
    # Slice single row to calculate SHAP on-demand (highly optimized)
    row = X[item_index:item_index + 1]
    shap_vals = _explainer.shap_values(row)[0]
    
    # Calculate inference prediction
    prediction = float(model.predict(row)[0])
    
    # Resolve standard base expectation value
    base_val = _explainer.expected_value
    if isinstance(base_val, (list, np.ndarray)):
        base_val = float(base_val[0])
    else:
        base_val = float(base_val)
        
    # Construct key feature attribution mapping
    shap_dict = {}
    for name, val in zip(feature_cols, shap_vals):
        if abs(val) > 1e-4:  # Skip negligible weights to keep response payloads small
            shap_dict[name] = float(val)
            
    return {
        "item_index": item_index,
        "prediction": prediction,
        "base_value": base_val,
        "shap_values": shap_dict
    }
