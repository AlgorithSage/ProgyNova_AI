# ProgyNovaAI Project Specification

## System Architecture

```
┌─────────────────────────────────────────────┐
│                   FRONTEND                   │
│            React + TypeScript + Vite          │
│         Hosted on: Vercel (free tier)         │
│                                               │
│  Dashboard:                                   │
│    - Upload CSV                               │
│    - View stockout alerts                     │
│    - View SHAP explanations                   │
│    - View forecast charts                     │
│    - Download reorder recommendations         │
└──────────────────┬──────────────────────────┘
                   │ REST API calls (JSON)
                   ▼
┌─────────────────────────────────────────────┐
│                   BACKEND                    │
│              FastAPI (Python)                 │
│      Hosted on: Railway / Render (free)      │
│                                               │
│  Endpoints:                                   │
│    POST /upload     → accepts CSV             │
│    POST /train      → runs pipeline           │
│    GET  /forecast   → returns predictions     │
│    GET  /alerts     → returns stockout alerts  │
│    GET  /explain    → returns SHAP values      │
│    GET  /recommend  → returns reorder qtys     │
│                                               │
│  Loads: trained XGBoost model (.json)          │
│         scaler objects (.pkl)                  │
│         feature engineering pipeline           │
└──────────────────┬──────────────────────────┘
                   │ reads from disk
                   ▼
┌─────────────────────────────────────────────┐
│              MODEL ARTIFACTS                 │
│   xgboost_baseline.json (trained model)      │
│   scaler_X.pkl, scaler_y.pkl                 │
│   feature_pipeline.py (Cell 2 logic)         │
│   Stored on: same server as backend          │
└─────────────────────────────────────────────┘
```

## Directory Structure

```
progynova-api/
├── app/
│   ├── main.py              ← FastAPI app (entry point)
│   ├── pipeline/
│   │   ├── ingestion.py     ← Cell 1 logic (upload + merge)
│   │   ├── features.py      ← Cell 2 logic (feature engineering)
│   │   ├── models.py        ← Cell 3+4 logic (XGBoost + deep models)
│   │   ├── meta_learner.py  ← Cell 5 logic
│   │   ├── stockout.py      ← Cell 7 logic
│   │   └── explainer.py     ← Cell 8 logic (SHAP)
│   ├── schema.py            ← AutoSchemaEngine class
│   └── config.py            ← default CONFIG
├── models/
│   └── xgboost_baseline.json  ← pre-trained model
├── requirements.txt
├── Dockerfile
└── README.md
```

## Backend Code Reference (`app/main.py`)

```python
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import numpy as np
import xgboost as xgb
import shap
import pickle, io, json

from app.pipeline.ingestion import process_upload
from app.pipeline.features import engineer_features
from app.pipeline.stockout import detect_stockouts
from app.pipeline.explainer import explain_predictions

app = FastAPI(title="ProgyNovaAI API", version="1.0")

app.add_middleware(CORSMiddleware, allow_origins=["*"],
                   allow_methods=["*"], allow_headers=["*"])

# Load pre-trained model at startup
model = xgb.XGBRegressor()
model.load_model("models/xgboost_baseline.json")


@app.post("/upload")
async def upload_data(file: UploadFile = File(...)):
    """Upload a CSV file → returns dataset summary."""
    content = await file.read()
    df = pd.read_csv(io.BytesIO(content))
    summary = process_upload(df)
    return {"status": "ok", "rows": len(df), "columns": list(df.columns),
            "detected_schema": summary}


@app.post("/forecast")
async def forecast(file: UploadFile = File(...)):
    """Upload CSV → returns demand forecasts for all items."""
    content = await file.read()
    df = pd.read_csv(io.BytesIO(content))

    # Run pipeline
    features_df = engineer_features(df)
    feature_cols = [c for c in features_df.columns
                    if c not in {"target","entity_id","location_id",
                                 "time_index","stockout","stock_on_hand"}]
    X = features_df[feature_cols].values
    predictions = model.predict(X)

    features_df["forecast"] = predictions
    return features_df[["entity_id","location_id","time_index",
                         "target","forecast"]].to_dict(orient="records")


@app.post("/alerts")
async def alerts(file: UploadFile = File(...)):
    """Upload CSV → returns stockout alerts with recommendations."""
    content = await file.read()
    df = pd.read_csv(io.BytesIO(content))

    features_df = engineer_features(df)
    feature_cols = [c for c in features_df.columns
                    if c not in {"target","entity_id","location_id",
                                 "time_index","stockout","stock_on_hand"}]
    predictions = model.predict(features_df[feature_cols].values)

    alerts = detect_stockouts(features_df, predictions)
    return alerts


@app.post("/explain")
async def explain(file: UploadFile = File(...), item_index: int = 0):
    """Upload CSV → returns SHAP explanation for a specific item."""
    content = await file.read()
    df = pd.read_csv(io.BytesIO(content))

    features_df = engineer_features(df)
    feature_cols = [c for c in features_df.columns
                    if c not in {"target","entity_id","location_id",
                                 "time_index","stockout","stock_on_hand"}]
    X = features_df[feature_cols].values

    explanations = explain_predictions(model, X, feature_cols, item_index)
    return explanations


@app.get("/health")
def health():
    return {"status": "healthy", "model": "xgboost_baseline"}
```
