# 🐍 ProgyNova AI - FastAPI Backend API

This directory contains the Python FastAPI backend for **ProgyNova AI**, which hosts the machine learning preprocessing pipelines, XGBoost forecasting models, deep sequence models, and SHAP explainability engines.

## 📂 Directory Layout

```
progynova-api/
├── app/
│   ├── main.py             # FastAPI entrypoint (routes and lifecycle)
│   ├── config.py           # Core settings (paths, hosts, ports, CORS)
│   ├── schema.py           # AutoSchemaEngine mapping layout
│   └── pipeline/
│       ├── ingestion.py    # Multi-file merge and data standardizer
│       ├── features.py     # Agnostic feature calculations (lags, rolling std)
│       ├── models.py       # Sequence architectures (CNN-LSTM & PatchTST)
│       ├── meta_learner.py # Stacking model meta-blender (Ridge)
│       ├── stockout.py     # Inventory days of cover & ordering recommendation
│       └── explainer.py    # Local SHAP explainer
│
├── data/                   # Generated datasets and pipeline parquet caches
├── models/
│   └── xgboost_baseline.json # Trained XGBoost baseline model weights
│
├── scripts/
│   ├── generate_data.py    # Synthetic pharmacy simulator & model trainer
│   └── verify_api.py       # REST API integration validation test suite
│
└── requirements.txt        # Backend dependencies
```

## 🛠️ Quick Start

1. **Activate virtual environment:**
   ```bash
   python -m venv .venv
   # On Windows:
   .venv\Scripts\Activate.ps1
   # On Unix/macOS:
   source .venv/bin/activate
   ```

2. **Install requirements:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Generate Synthetic Data & Train Baseline Model:**
   ```bash
   python scripts/generate_data.py
   ```
   This will generate simulated Indian pharmacy dataset CSVs (`dispensing.csv`, `drugs.csv`, `stores.csv`, `context.csv`) in `data/` and train an XGBoost model saved to `models/xgboost_baseline.json`.

4. **Launch the API server:**
   ```bash
   uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
   ```

5. **Run Integration Tests:**
   In another terminal, run:
   ```bash
   python scripts/verify_api.py
   ```

## 📝 API Endpoints Summary

### `POST /upload`
Uploads raw operational logs CSV file(s) and uses the `AutoSchemaEngine` to return a detected dataset profile (mapping dynamically named headers to target columns).

### `POST /forecast`
Preprocesses CSV payload using dynamic lag computations and temporal rolling statistics, outputs future demand estimates.

### `POST /alerts`
Assesses stockout risks based on current stock-on-hand, lead-time duration, and predicted demand rate. Returns order urgency flags and recommended reorder quantities.

### `POST /explain`
Runs SHAP explainability calculations on the tabular model for a selected record index (`item_index`). Explains predictions by charting the positive and negative push forces of individual features.
