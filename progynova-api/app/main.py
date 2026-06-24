import io
import hashlib
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

# Global drug name map loaded from data/drugs.csv
_drug_name_map = {}

def load_drug_names():
    """Load drug ID to name mapping from data/drugs.csv."""
    global _drug_name_map
    drugs_csv_path = MODEL_PATH.parent.parent / "data" / "drugs.csv"
    if drugs_csv_path.exists():
        try:
            df_drugs = pd.read_csv(drugs_csv_path)
            _drug_name_map = dict(zip(df_drugs["drug_id"].astype(str), df_drugs["name"].astype(str)))
            print(f"[API] Loaded {len(_drug_name_map)} drug name mappings successfully.")
        except Exception as e:
            print(f"[API] Failed to parse drug name map: {e}")
    else:
        print(f"[API] WARNING: drugs.csv not found at {drugs_csv_path}.")

# Pre-load on startup
load_drug_names()

# Global store ID to "City, State" map loaded from data/stores.csv
_store_location_map = {}

def load_store_locations():
    """Load store ID to city/state mapping from data/stores.csv."""
    global _store_location_map
    stores_csv_path = MODEL_PATH.parent.parent / "data" / "stores.csv"
    if stores_csv_path.exists():
        try:
            df_stores = pd.read_csv(stores_csv_path)
            labels = df_stores["city"].astype(str) + ", " + df_stores["state"].astype(str)
            _store_location_map = dict(zip(df_stores["store_id"].astype(str), labels))
            print(f"[API] Loaded {len(_store_location_map)} store location mappings successfully.")
        except Exception as e:
            print(f"[API] Failed to parse store location map: {e}")
    else:
        print(f"[API] WARNING: stores.csv not found at {stores_csv_path}.")

# Pre-load on startup
load_store_locations()

# In-memory cache for processed dataframes and predictions to prevent redundant feature engineering
# Key: SHA-256 hash of the uploaded CSV file(s)
# Value: Dictionary containing features_df, X feature matrix, predictions array, and feature column names.
_processed_data_cache = {}

async def get_files_hash(files: List[UploadFile]) -> str:
    """Compute a SHA-256 hash of the content of the uploaded files."""
    hasher = hashlib.sha256()
    for f in files:
        await f.seek(0)
        content = await f.read()
        hasher.update(content)
        await f.seek(0)
    return hasher.hexdigest()

async def get_cached_or_process(files: List[UploadFile] = None) -> dict:
    """Get processed features_df, X, and predictions from cache, or compute and cache them."""
    is_empty = not files or len(files) == 0 or (len(files) == 1 and files[0].filename == '')
    
    if is_empty:
        file_hash = "preloaded_baseline_dataset"
    else:
        file_hash = await get_files_hash(files)
        
    if file_hash in _processed_data_cache:
        print(f"[API] Cache HIT for file hash: {file_hash}")
        return _processed_data_cache[file_hash]
        
    print(f"[API] Cache MISS for file hash: {file_hash}. Running pipeline...")
    
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
        
    # Standardize and merge
    merged_df = process_upload(dfs)
    features_df = engineer_features(merged_df)
    
    # Separate X features matrix
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
    """System health check endpoint."""
    model_loaded = MODEL_PATH.exists()
    return {
        "status": "healthy",
        "model": "xgboost_baseline",
        "model_status": "loaded" if model_loaded else "missing"
    }

@app.post("/upload")
async def upload_data(file: List[UploadFile] = File(None)):
    """Upload inventory logs, validate schema structure, and output summary details."""
    is_empty = not file or len(file) == 0 or (len(file) == 1 and file[0].filename == '')
    
    if is_empty:
        data_dir = MODEL_PATH.parent.parent / "data"
        disp_csv = data_dir / "dispensing.csv"
        if not disp_csv.exists():
            raise HTTPException(status_code=404, detail="Preloaded dispensing.csv not found on server.")
        main_df = pd.read_csv(disp_csv)
    else:
        dfs = []
        for f in file:
            if not f.filename.endswith('.csv'):
                raise HTTPException(status_code=400, detail="Only CSV datasets are accepted.")
            await f.seek(0)
            content = await f.read()
            await f.seek(0)
            dfs.append(pd.read_csv(io.BytesIO(content)))
            
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
            
    try:
        detected_schema = AutoSchemaEngine.validate_and_parse(main_df)
        
        # Pre-warm the pipeline cache in the background for this uploaded file
        try:
            await get_cached_or_process(file)
        except Exception as e:
            print(f"[API] Warning: Background cache warming failed: {e}")
            
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
async def forecast(file: List[UploadFile] = File(None)):
    """Upload CSV logs -> runs features extraction -> returns demand forecasts."""
    if not MODEL_PATH.exists():
        load_global_model()
        if not MODEL_PATH.exists():
            raise HTTPException(status_code=500, detail="Model weights missing on server.")
            
    try:
        cache_entry = await get_cached_or_process(file)
        features_df = cache_entry["features_df"].copy()
        predictions = cache_entry["predictions"]
        
        # Format output payload
        features_df["forecast"] = predictions
        
        # Map drug names to a readable string (e.g. "D01 - Metformin 500mg")
        features_df["entity_id"] = features_df["drug_id"].astype(str)
        if _drug_name_map:
            features_df["entity_id"] = features_df["entity_id"].apply(
                lambda x: f"{x} - {_drug_name_map[x]}" if x in _drug_name_map else x
            )
            
        features_df["location_id"] = features_df["store_id"].astype(str)
        if _store_location_map:
            features_df["location_id"] = features_df["location_id"].apply(
                lambda x: f"{x} - {_store_location_map[x]}" if x in _store_location_map else x
            )
        features_df["time_index"] = features_df["week"]
        features_df["target"] = features_df["demand"]
        features_df["original_index"] = features_df.index
        
        records = features_df[["original_index", "entity_id", "location_id", "time_index", "target", "forecast"]].to_dict(orient="records")
        return records
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Forecast pipeline error: {e}")

@app.post("/alerts")
async def alerts(
    file: List[UploadFile] = File(None),
    multiplier: float = Query(1.0),
    buffer: float = Query(0.0)
):
    """Upload CSV logs -> runs predictions -> returns active stockout alerts."""
    if not MODEL_PATH.exists():
        load_global_model()
        if not MODEL_PATH.exists():
            raise HTTPException(status_code=500, detail="Model weights missing on server.")
            
    try:
        cache_entry = await get_cached_or_process(file)
        features_df = cache_entry["features_df"]
        predictions = cache_entry["predictions"]
        
        alerts_list = detect_stockouts(features_df, predictions, multiplier=multiplier, buffer=buffer)
        
        # Map drug names and store locations into the stockout alerts
        # (e.g. "D01 - Metformin 500mg", "S06 - Pune, Maharashtra")
        for a in alerts_list:
            d_id = str(a["entity_id"])
            if _drug_name_map and d_id in _drug_name_map:
                a["entity_id"] = f"{d_id} - {_drug_name_map[d_id]}"

            loc_id = str(a["location_id"])
            if _store_location_map and loc_id in _store_location_map:
                a["location_id"] = f"{loc_id} - {_store_location_map[loc_id]}"

        return alerts_list
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Alerts pipeline error: {e}")

@app.post("/explain")
async def explain(file: List[UploadFile] = File(None), item_index: int = Query(0)):
    """Upload CSV logs -> runs predictions -> returns SHAP explainability attributes for item_index."""
    if not MODEL_PATH.exists():
        load_global_model()
        if not MODEL_PATH.exists():
            raise HTTPException(status_code=500, detail="Model weights missing on server.")
            
    try:
        cache_entry = await get_cached_or_process(file)
        X = cache_entry["X"]
        feature_cols = cache_entry["feature_cols"]
        
        explanation = explain_predictions(model, X, feature_cols, item_index)
        return explanation
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Explainability pipeline error: {e}")

@app.post("/metrics")
async def get_metrics(
    file: List[UploadFile] = File(None),
    multiplier: float = Query(1.0),
    buffer: float = Query(0.0)
):
    """Upload CSV logs -> runs predictions -> returns regression and classification metrics."""
    if not MODEL_PATH.exists():
        load_global_model()
        if not MODEL_PATH.exists():
            raise HTTPException(status_code=500, detail="Model weights missing on server.")
            
    try:
        import numpy as np
        cache_entry = await get_cached_or_process(file)
        features_df = cache_entry["features_df"]
        predictions = cache_entry["predictions"]
        
        y_true = features_df["demand"].values
        y_pred = predictions
        stock_on_hand = features_df["stock_on_hand"].values
        
        if len(y_true) == 0:
            raise HTTPException(status_code=400, detail="The dataset contains no rows for metrics computation.")
            
        from sklearn.metrics import (
            mean_absolute_error,
            mean_squared_error,
            mean_absolute_percentage_error,
            accuracy_score,
            precision_score,
            recall_score,
            f1_score,
            roc_auc_score
        )
        
        # Continuous regression errors
        mae = mean_absolute_error(y_true, y_pred)
        rmse = np.sqrt(mean_squared_error(y_true, y_pred))
        
        # Filtered non-zero MAPE
        non_zero = y_true > 0
        if non_zero.sum() > 0:
            mape = mean_absolute_percentage_error(y_true[non_zero], y_pred[non_zero]) * 100
        else:
            mape = 0.0
            
        # Stabilized MAPE (adding 1.0 box epsilon)
        stabilized_mape = np.mean(np.abs(y_true - y_pred) / (y_true + 1.0)) * 100
        
        # Classification: Stockout Alerts
        # True Stockout is demand > stock_on_hand
        y_true_stockout = (y_true > stock_on_hand).astype(int)
        # Predicted Alert is (forecast * multiplier + buffer) > stock_on_hand
        y_pred_stockout = ((y_pred * multiplier + buffer) > stock_on_hand).astype(int)
        
        # Continuous risk score for ROC-AUC (incorporating multiplier and buffer)
        risk_scores = y_pred * multiplier + buffer - stock_on_hand
        
        # Compute classification metrics
        accuracy = accuracy_score(y_true_stockout, y_pred_stockout)
        precision = precision_score(y_true_stockout, y_pred_stockout, zero_division=0)
        recall = recall_score(y_true_stockout, y_pred_stockout, zero_division=0)
        f1 = f1_score(y_true_stockout, y_pred_stockout, zero_division=0)
        
        try:
            if len(np.unique(y_true_stockout)) > 1:
                roc_auc = roc_auc_score(y_true_stockout, risk_scores)
            else:
                roc_auc = 1.0 if np.all(y_true_stockout == y_pred_stockout) else 0.5
        except Exception:
            roc_auc = 0.5
            
        # Confusion matrix
        tp = int(((y_pred_stockout == 1) & (y_true_stockout == 1)).sum())
        fp = int(((y_pred_stockout == 1) & (y_true_stockout == 0)).sum())
        fn = int(((y_pred_stockout == 0) & (y_true_stockout == 1)).sum())
        tn = int(((y_pred_stockout == 0) & (y_true_stockout == 0)).sum())
        
        # Residuals error distribution (histogram)
        residuals = y_true - y_pred
        counts, bins = np.histogram(residuals, bins=10)
        error_distribution = []
        for i in range(len(counts)):
            bin_label = f"{bins[i]:.1f} to {bins[i+1]:.1f}"
            error_distribution.append({
                "bin": bin_label,
                "count": int(counts[i])
            })
            
        # Sampling actual vs predicted points for scatter plot (max 150 points)
        sample_size = min(150, len(y_true))
        indices = np.linspace(0, len(y_true) - 1, sample_size, dtype=int)
        actual_vs_predicted = []
        for idx in indices:
            actual_vs_predicted.append({
                "index": int(idx),
                "actual": round(float(y_true[idx]), 2),
                "predicted": round(float(y_pred[idx]), 2)
            })
            
        return {
            "summary": {
                "total_samples": len(y_true),
                "actual_stockouts": int(y_true_stockout.sum()),
                "predicted_alerts": int(y_pred_stockout.sum())
            },
            "regression": {
                "mae": round(float(mae), 4),
                "rmse": round(float(rmse), 4),
                "mape": round(float(mape), 2),
                "stabilized_mape": round(float(stabilized_mape), 2)
            },
            "classification": {
                "accuracy": round(float(accuracy), 4),
                "precision": round(float(precision), 4),
                "recall": round(float(recall), 4),
                "f1_score": round(float(f1), 4),
                "roc_auc": round(float(roc_auc), 4)
            },
            "confusion_matrix": {
                "tp": tp,
                "fp": fp,
                "fn": fn,
                "tn": tn
            },
            "error_distribution": error_distribution,
            "actual_vs_predicted": actual_vs_predicted
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Metrics calculation error: {e}")
