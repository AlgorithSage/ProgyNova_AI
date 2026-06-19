import io
from typing import List
from fastapi import FastAPI, UploadFile, File, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import xgboost as xgb

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
    """Load model weights dynamically from disk."""
    global model
    if MODEL_PATH.exists():
        try:
            model.load_model(str(MODEL_PATH))
            print(f"[API] XGBoost model weights loaded successfully from {MODEL_PATH}")
        except Exception as e:
            print(f"[API] Failed to parse model weights: {e}")
    else:
        print(f"[API] WARNING: Model file not found at {MODEL_PATH}. Please run training first.")

# Run load on startup
load_global_model()

@app.get("/health")
def health():
    """System health check endpoint."""
    model_loaded = MODEL_PATH.exists()
    return {
        "status": "healthy",
        "model": "xgboost_baseline",
        "model_status": "loaded" if model_loaded else "missing"
    }

@app.post("/upload")
async def upload_data(file: List[UploadFile] = File(...)):
    """Upload inventory logs, validate schema structure, and output summary details."""
    dfs = []
    for f in file:
        if not f.filename.endswith('.csv'):
            raise HTTPException(status_code=400, detail="Only CSV datasets are accepted.")
        content = await f.read()
        dfs.append(pd.read_csv(io.BytesIO(content)))
        
    try:
        # Merge frames if multiple files are uploaded
        if len(dfs) > 1:
            dfs_sorted = sorted(dfs, key=len, reverse=True)
            merged = dfs_sorted[0].copy()
            for current in dfs_sorted[1:]:
                common_keys = list(set(merged.columns) & set(current.columns))
                if common_keys:
                    new_features = [c for c in current.columns if c not in merged.columns]
                    if new_features:
                        merged = merged.merge(current[common_keys + new_features], on=common_keys, how="left")
            main_df = merged
        else:
            main_df = dfs[0]
            
        detected_schema = AutoSchemaEngine.validate_and_parse(main_df)
        return {
            "status": "ok",
            "rows": len(main_df),
            "columns": list(main_df.columns),
            "detected_schema": detected_schema
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Data parsing error: {e}")

@app.post("/forecast")
async def forecast(file: List[UploadFile] = File(...)):
    """Upload CSV logs -> runs features extraction -> returns demand forecasts."""
    if not MODEL_PATH.exists():
        load_global_model()
        if not MODEL_PATH.exists():
            raise HTTPException(status_code=500, detail="Model weights missing on server.")
            
    try:
        dfs = []
        for f in file:
            content = await f.read()
            dfs.append(pd.read_csv(io.BytesIO(content)))
            
        # Ingestion and wide/long processing
        merged_df = process_upload(dfs)
        features_df = engineer_features(merged_df)
        
        # Separate X features matrix
        exclude = {"drug_id", "store_id", "week", "demand", "stock_on_hand", "recommended_order_qty"}
        feature_cols = [c for c in features_df.columns if c not in exclude]
        
        X = features_df[feature_cols].values
        predictions = model.predict(X)
        
        # Format output payload
        features_df["forecast"] = predictions
        features_df["entity_id"] = features_df["drug_id"]
        features_df["location_id"] = features_df["store_id"]
        features_df["time_index"] = features_df["week"]
        features_df["target"] = features_df["demand"]
        
        records = features_df[["entity_id", "location_id", "time_index", "target", "forecast"]].to_dict(orient="records")
        return records
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Forecast pipeline error: {e}")

@app.post("/alerts")
async def alerts(file: List[UploadFile] = File(...)):
    """Upload CSV logs -> runs predictions -> returns active stockout alerts."""
    if not MODEL_PATH.exists():
        load_global_model()
        if not MODEL_PATH.exists():
            raise HTTPException(status_code=500, detail="Model weights missing on server.")
            
    try:
        dfs = []
        for f in file:
            content = await f.read()
            dfs.append(pd.read_csv(io.BytesIO(content)))
            
        merged_df = process_upload(dfs)
        features_df = engineer_features(merged_df)
        
        exclude = {"drug_id", "store_id", "week", "demand", "stock_on_hand", "recommended_order_qty"}
        feature_cols = [c for c in features_df.columns if c not in exclude]
        
        X = features_df[feature_cols].values
        predictions = model.predict(X)
        
        alerts_list = detect_stockouts(features_df, predictions)
        return alerts_list
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Alerts pipeline error: {e}")

@app.post("/explain")
async def explain(file: List[UploadFile] = File(...), item_index: int = Query(0)):
    """Upload CSV logs -> runs predictions -> returns SHAP explainability attributes for item_index."""
    if not MODEL_PATH.exists():
        load_global_model()
        if not MODEL_PATH.exists():
            raise HTTPException(status_code=500, detail="Model weights missing on server.")
            
    try:
        dfs = []
        for f in file:
            content = await f.read()
            dfs.append(pd.read_csv(io.BytesIO(content)))
            
        merged_df = process_upload(dfs)
        features_df = engineer_features(merged_df)
        
        exclude = {"drug_id", "store_id", "week", "demand", "stock_on_hand", "recommended_order_qty"}
        feature_cols = [c for c in features_df.columns if c not in exclude]
        
        X = features_df[feature_cols].values
        
        explanation = explain_predictions(model, X, feature_cols, item_index)
        return explanation
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Explainability pipeline error: {e}")
