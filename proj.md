# ProgyNovaAI: Technical Specifications and Code Reference Documentation

This document compiles the formal system layout, API routing architecture, directory structure, and backend code reference for the ProgyNovaAI forecasting and stockout prevention platform.

---

## 1. System Architecture

```
┌─────────────────────────────────────────────┐
│                  FRONTEND                   │
│            React + TypeScript + Vite          │
│                                               │
│  User Interfaces:                             │
│    - Transaction CSV Data Uploader            │
│    - Forecast Line Chart (Time-Series)        │
│    - Active Stockout Alerts Table             │
│    - TreeSHAP Local Explainability Panel      │
│    - ML Metrics & Operational Auditor         │
└──────────────────┬──────────────────────────┘
                   │ REST API requests (JSON)
                   ▼
┌─────────────────────────────────────────────┐
│                   BACKEND                    │
│              FastAPI (Python)                 │
│                                               │
│  Endpoints:                                   │
│    POST /upload     → Validate & parse CSV    │
│    POST /forecast   → Generate weekly demand  │
│    POST /alerts     → Parameterized alerts    │
│    POST /explain    → Exact TreeSHAP values   │
│    POST /metrics    → Continuous/Binary metrics
│    GET  /health     → Service health status   │
│                                               │
│  Loads: Pre-trained XGBoost weights (.json)   │
│         Feature engineering parameters        │
└──────────────────┬──────────────────────────┘
                   │ read/write operations
                   ▼
┌─────────────────────────────────────────────┐
│              MODEL ARTIFACTS                 │
│   xgboost_baseline.json (model weights)      │
│   dispensing.csv, drugs.csv, stores.csv      │
│   Stored on: Local Server/Disk Storage       │
└─────────────────────────────────────────────┘
```

---

## 2. Directory Structure

```
ProgyNovaAI/
├── progynova-api/              # Python FastAPI Backend
│   ├── app/
│   │   ├── main.py             # FastAPI entry point
│   │   ├── config.py           # Host, Port, and CORS settings
│   │   ├── schema.py           # AutoSchemaEngine mapping logic
│   │   └── pipeline/
│   │       ├── ingestion.py    # Merging and staging upload handler
│   │       ├── features.py     # Schema-agnostic feature engineering
│   │       ├── stockout.py     # Days of cover and reorder logic
│   │       └── explainer.py    # SHAP interpretation service
│   ├── models/
│   │   └── xgboost_baseline.json # Pre-trained model weights
│   ├── data/                   # Output folder for simulations and caches
│   ├── scripts/
│   │   ├── generate_data.py    # Synthetic Indian pharmacy dataset simulator
│   │   └── verify_api.py       # Comprehensive API suite test script
│   └── requirements.txt        # Python dependency list
│
├── progynova-dashboard/        # React Frontend Web Application
│   ├── src/
│   │   ├── components/         # Reusable UI elements (Layout, Charts, Tables)
│   │   ├── services/           # Fetch clients for backend routes
│   │   ├── types/              # TypeScript interface contracts
│   │   └── App.tsx             # Main dashboard controller
│   ├── package.json            # Node scripts and dependencies
│   └── vite.config.ts          # Vite build manager
```

---

## 3. Backend Reference Implementation (`app/main.py`)

Below is the production implementation of the FastAPI entry point, demonstrating auto-schema merging, predictive caching, forecasting, stockout detection, SHAP explainability, and evaluation metrics:

```python
import io
import hashlib
from typing import List
from fastapi import FastAPI, UploadFile, File, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import xgboost as xgb
import numpy as np

from app.config import MODEL_PATH, CORS_ORIGINS
from app.schema import AutoSchemaEngine
from app.pipeline.ingestion import process_upload
from app.pipeline.features import engineer_features
from app.pipeline.stockout import detect_stockouts
from app.pipeline.explainer import explain_predictions

app = FastAPI(title="ProgyNovaAI API", version="1.0")

# Configure CORS origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global model instance
model = xgb.XGBRegressor()

def load_global_model():
    global model
    if MODEL_PATH.exists():
        try:
            model.load_model(str(MODEL_PATH))
            print(f"[API] XGBoost model weights loaded successfully from {MODEL_PATH}")
        except Exception as e:
            print(f"[API] Failed to parse model weights: {e}")

# Run load on startup
load_global_model()

# Global drug name map loaded from data/drugs.csv
_drug_name_map = {}

def load_drug_names():
    global _drug_name_map
    drugs_csv_path = MODEL_PATH.parent.parent / "data" / "drugs.csv"
    if drugs_csv_path.exists():
        try:
            df_drugs = pd.read_csv(drugs_csv_path)
            _drug_name_map = dict(zip(df_drugs["drug_id"].astype(str), df_drugs["name"].astype(str)))
        except Exception as e:
            print(f"[API] Failed to parse drug name map: {e}")

load_drug_names()

# In-memory cache for processed dataframes and predictions to prevent redundant feature engineering
_processed_data_cache = {}

async def get_files_hash(files: List[UploadFile]) -> str:
    hasher = hashlib.sha256()
    for f in files:
        await f.seek(0)
        content = await f.read()
        hasher.update(content)
        await f.seek(0)
    return hasher.hexdigest()

async def get_cached_or_process(files: List[UploadFile] = None) -> dict:
    is_empty = not files or len(files) == 0 or (len(files) == 1 and files[0].filename == '')
    
    if is_empty:
        file_hash = "preloaded_baseline_dataset"
    else:
        file_hash = await get_files_hash(files)
        
    if file_hash in _processed_data_cache:
        return _processed_data_cache[file_hash]
        
    dfs = []
    if is_empty:
        data_dir = MODEL_PATH.parent.parent / "data"
        disp_csv = data_dir / "dispensing.csv"
        drugs_csv = data_dir / "drugs.csv"
        stores_csv = data_dir / "stores.csv"
        context_csv = data_dir / "context.csv"
        
        if not disp_csv.exists():
            raise HTTPException(status_code=404, detail="Preloaded dispensing.csv not found on server.")
            
        dfs.append(pd.read_csv(disp_csv))
        if drugs_csv.exists(): dfs.append(pd.read_csv(drugs_csv))
        if stores_csv.exists(): dfs.append(pd.read_csv(stores_csv))
        if context_csv.exists(): dfs.append(pd.read_csv(context_csv))
    else:
        for f in files:
            await f.seek(0)
            content = await f.read()
            await f.seek(0)
            dfs.append(pd.read_csv(io.BytesIO(content)))
        
    merged_df = process_upload(dfs)
    features_df = engineer_features(merged_df)
    
    exclude = {"drug_id", "store_id", "week", "demand", "stock_on_hand", "recommended_order_qty"}
    feature_cols = [c for c in features_df.columns if c not in exclude]
    
    X = features_df[feature_cols].values
    predictions = model.predict(X)
    
    cache_entry = {
        "features_df": features_df,
        "X": X,
        "predictions": predictions,
        "feature_cols": feature_cols
    }
    _processed_data_cache[file_hash] = cache_entry
    return cache_entry

@app.get("/health")
def health():
    model_loaded = MODEL_PATH.exists()
    return {
        "status": "healthy",
        "model": "xgboost_baseline",
        "model_status": "loaded" if model_loaded else "missing"
    }

@app.post("/upload")
async def upload_data(file: List[UploadFile] = File(None)):
    is_empty = not file or len(file) == 0 or (len(file) == 1 and file[0].filename == '')
    
    if is_empty:
        data_dir = MODEL_PATH.parent.parent / "data"
        disp_csv = data_dir / "dispensing.csv"
        main_df = pd.read_csv(disp_csv)
    else:
        dfs = []
        for f in file:
            await f.seek(0)
            content = await f.read()
            await f.seek(0)
            dfs.append(pd.read_csv(io.BytesIO(content)))
        main_df = pd.concat(dfs, ignore_index=True) if len(dfs) > 1 else dfs[0]
            
    try:
        detected_schema = AutoSchemaEngine.validate_and_parse(main_df)
        return {
            "status": "ok",
            "rows": len(main_df),
            "columns": list(main_df.columns),
            "detected_schema": detected_schema
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/forecast")
async def forecast(file: List[UploadFile] = File(None)):
    try:
        cache_entry = await get_cached_or_process(file)
        features_df = cache_entry["features_df"].copy()
        predictions = cache_entry["predictions"]
        
        features_df["forecast"] = predictions
        features_df["entity_id"] = features_df["drug_id"].astype(str)
        if _drug_name_map:
            features_df["entity_id"] = features_df["entity_id"].apply(
                lambda x: f"{x} - {_drug_name_map[x]}" if x in _drug_name_map else x
            )
            
        features_df["location_id"] = features_df["store_id"]
        features_df["time_index"] = features_df["week"]
        features_df["target"] = features_df["demand"]
        features_df["original_index"] = features_df.index
        
        return features_df[["original_index", "entity_id", "location_id", "time_index", "target", "forecast"]].to_dict(orient="records")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/alerts")
async def alerts(
    file: List[UploadFile] = File(None),
    multiplier: float = Query(1.0),
    buffer: float = Query(0.0)
):
    try:
        cache_entry = await get_cached_or_process(file)
        features_df = cache_entry["features_df"]
        predictions = cache_entry["predictions"]
        
        alerts_list = detect_stockouts(features_df, predictions, multiplier=multiplier, buffer=buffer)
        if _drug_name_map:
            for a in alerts_list:
                d_id = str(a["entity_id"])
                if d_id in _drug_name_map:
                    a["entity_id"] = f"{d_id} - {_drug_name_map[d_id]}"
                    
        return alerts_list
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/explain")
async def explain(file: List[UploadFile] = File(None), item_index: int = Query(0)):
    try:
        cache_entry = await get_cached_or_process(file)
        X = cache_entry["X"]
        feature_cols = cache_entry["feature_cols"]
        
        explanation = explain_predictions(model, X, feature_cols, item_index)
        return explanation
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/metrics")
async def get_metrics(
    file: List[UploadFile] = File(None),
    multiplier: float = Query(1.0),
    buffer: float = Query(0.0)
):
    try:
        cache_entry = await get_cached_or_process(file)
        features_df = cache_entry["features_df"]
        predictions = cache_entry["predictions"]
        
        y_true = features_df["demand"].values
        y_pred = predictions
        stock_on_hand = features_df["stock_on_hand"].values
        
        from sklearn.metrics import mean_absolute_error, mean_squared_error, accuracy_score, precision_score, recall_score, f1_score
        
        mae = mean_absolute_error(y_true, y_pred)
        rmse = np.sqrt(mean_squared_error(y_true, y_pred))
        
        y_true_stockout = (y_true > stock_on_hand).astype(int)
        y_pred_stockout = ((y_pred * multiplier + buffer) > stock_on_hand).astype(int)
        
        accuracy = accuracy_score(y_true_stockout, y_pred_stockout)
        precision = precision_score(y_true_stockout, y_pred_stockout, zero_division=0)
        recall = recall_score(y_true_stockout, y_pred_stockout, zero_division=0)
        f1 = f1_score(y_true_stockout, y_pred_stockout, zero_division=0)
        
        tp = int(((y_pred_stockout == 1) & (y_true_stockout == 1)).sum())
        fp = int(((y_pred_stockout == 1) & (y_true_stockout == 0)).sum())
        fn = int(((y_pred_stockout == 0) & (y_true_stockout == 1)).sum())
        tn = int(((y_pred_stockout == 0) & (y_true_stockout == 0)).sum())
        
        return {
            "summary": {
                "total_samples": len(y_true),
                "actual_stockouts": int(y_true_stockout.sum()),
                "predicted_alerts": int(y_pred_stockout.sum())
            },
            "regression": {"mae": round(float(mae), 4), "rmse": round(float(rmse), 4)},
            "classification": {
                "accuracy": round(float(accuracy), 4),
                "precision": round(float(precision), 4),
                "recall": round(float(recall), 4),
                "f1_score": round(float(f1), 4)
            },
            "confusion_matrix": {"tp": tp, "fp": fp, "fn": fn, "tn": tn}
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```
