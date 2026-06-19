import requests
import json
from pathlib import Path

BASE_URL = "http://127.0.0.1:8000"
DATA_DIR = Path("data")
CSV_PATH = DATA_DIR / "dispensing.csv"

def verify_system():
    print("=" * 60)
    print("PROGYNOVA-AI API SYSTEM VERIFICATION")
    print("=" * 60)
    
    # 1. Verify Health check
    try:
        r = requests.get(f"{BASE_URL}/health")
        r.raise_for_status()
        print(f"[OK] Health Check Passed: {r.json()}")
    except Exception as e:
        print(f"[ERROR] Health Check Failed: {e}")
        return
        
    # Check if sample CSV data exists
    if not CSV_PATH.exists():
        print(f"[ERROR] Missing sample CSV at {CSV_PATH}. Please run generate_data.py first.")
        return
        
    print(f"Reading file: {CSV_PATH}...")
    files = {"file": ("dispensing.csv", open(CSV_PATH, "rb"), "text/csv")}
    
    # 2. Verify Upload Schema
    try:
        r = requests.post(f"{BASE_URL}/upload", files=files)
        r.raise_for_status()
        data = r.json()
        print(f"[OK] Upload Schema Passed: Status={data['status']} | Rows={data['rows']} | Schema keys={list(data['detected_schema'].keys())}")
    except Exception as e:
        print(f"[ERROR] Upload Schema Failed: {e}")
        
    # Re-open file handle
    files = {"file": ("dispensing.csv", open(CSV_PATH, "rb"), "text/csv")}
    
    # 3. Verify Forecasts Endpoint
    try:
        r = requests.post(f"{BASE_URL}/forecast", files=files)
        r.raise_for_status()
        forecasts = r.json()
        print(f"[OK] Forecast Endpoint Passed: Return Count={len(forecasts)} | Sample={forecasts[0]}")
    except Exception as e:
        print(f"[ERROR] Forecast Endpoint Failed: {e}")
        
    # Re-open file handle
    files = {"file": ("dispensing.csv", open(CSV_PATH, "rb"), "text/csv")}
    
    # 4. Verify Alerts Endpoint
    try:
        r = requests.post(f"{BASE_URL}/alerts", files=files)
        r.raise_for_status()
        alerts = r.json()
        print(f"[OK] Alerts Endpoint Passed: Active Alerts Count={len(alerts)} | Top Alert={alerts[0] if alerts else 'None'}")
    except Exception as e:
        print(f"[ERROR] Alerts Endpoint Failed: {e}")
        
    # Re-open file handle
    files = {"file": ("dispensing.csv", open(CSV_PATH, "rb"), "text/csv")}
    
    # 5. Verify SHAP Explain Endpoint
    try:
        item_index = 5
        r = requests.post(f"{BASE_URL}/explain?item_index={item_index}", files=files)
        r.raise_for_status()
        expl = r.json()
        print(f"[OK] SHAP Explain Passed: Index={expl['item_index']} | Prediction={expl['prediction']:.2f} | Base={expl['base_value']:.2f} | SHAP count={len(expl['shap_values'])}")
    except Exception as e:
        print(f"[ERROR] SHAP Explain Failed: {e}")
        
    print("\n" + "=" * 60)
    print("VERIFICATION COMPLETE.")
    print("=" * 60)

if __name__ == "__main__":
    verify_system()
