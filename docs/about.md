# About ProgyNova AI

**ProgyNova AI** is a demand forecasting and stockout prediction platform built specifically for pharmacy retail networks. It combines a cost-sensitive XGBoost machine learning model with a FastAPI backend and an interactive React + TypeScript dashboard to turn raw pharmacy transaction data into real-time, actionable inventory intelligence.

The platform was designed to solve one of the most dangerous challenges in healthcare supply chains: the **class imbalance paradox**. Stockout events represent less than 1.3% of all transaction records, yet their clinical consequences — missed medications, delayed treatments — are disproportionately severe. ProgyNova AI addresses this asymmetry head-on with a purpose-built ML pipeline.

---

## What Problem Does It Solve?

Traditional inventory systems fail at rare-event detection. A standard machine learning model trained on pharmacy data will simply learn to predict "no stockout" for every item and achieve 98%+ accuracy — while missing every actual stockout. This is clinically unacceptable.

ProgyNova AI solves this by:
- **Reweighting training observations** so each stockout event is penalized 115.2× more than a normal sale during model fitting.
- **Parameterising the alert threshold** so operators can tune between capital efficiency and zero missed stockouts.
- **Explaining every prediction** with exact SHAP attribution values so pharmacists understand *why* an alert was raised.

---

## Core Features

### 🧠 Cost-Sensitive XGBoost Forecasting Core
The demand forecasting engine uses a gradient-boosted regressor (XGBoost) trained with asymmetric sample weights. The loss function penalises false negatives (missed stockouts) far more heavily than false positives, forcing the model to isolate rare stockout signals even within a heavily imbalanced dataset.

- Achieves **4.90% MAPE** on held-out validation data
- Outperforms PatchTST Transformer (17.40% MAPE) and CNN-LSTM (18.25% MAPE)
- Trained on synthetic Indian pharmacy transaction data spanning 155 weeks

### ⚖️ Three-Mode Asymmetric Sensitivity Threshold
Operators can switch between three risk configurations in real time, each targeting a different clinical or business objective:

| Mode | Recall | Precision | Best For |
|------|--------|-----------|----------|
| **Strict** | 91.67% | 95.65% | Expensive, low-turnover medications |
| **Balanced** | 91.67% | 93.62% | Standard inventory management |
| **Clinical Safe** | **100.00%** | 85.71% | Life-critical or high-risk drugs |

### 🌿 TreeSHAP Explainability Engine
Every individual forecast comes with an exact SHAP attribution breakdown computed in under 15 milliseconds. The explainer surfaces the top positive and negative demand drivers — outbreak signals, rolling lags, seasonality — and renders them as a natural language explanation alongside the chart.

### 📂 AutoSchemaEngine — Format-Agnostic Ingestion
ProgyNova AI accepts CSV files in wide-form, entity-wide, or long-form table layouts. The `AutoSchemaEngine` automatically detects column roles (dates, product IDs, quantities, stock levels, lead times) using semantic keyword mapping, resolving relational joins across multiple uploaded files without any manual configuration.

### 📊 Interactive Forecasting Dashboard
The React + TypeScript frontend provides:
- Real-time demand forecast time-series charts
- Colour-coded stockout alert tables with risk scores
- Per-item SHAP waterfall explanations
- Live model performance metrics (MAE, RMSE, MAPE, ROC-AUC, Precision, Recall, F1)
- Sensitivity mode toggle with instant recalculation

---

## Technical Architecture

The backend is a **FastAPI** service exposing five REST endpoints (`/upload`, `/forecast`, `/alerts`, `/explain`, `/metrics`). The frontend consumes these endpoints and renders all outputs in a single-page application built with Vite.

**Data flow:** CSV Upload → AutoSchemaEngine → Feature Engineering → XGBoost Core → Stockout Threshold Engine + TreeSHAP Explainer → React Dashboard

---

## Validation Results

Evaluated on a strictly held-out temporal test split (Weeks 143–155, N = 3,952 records):

| Configuration | Accuracy | F1-Score | ROC-AUC | False Negatives |
|---------------|----------|----------|---------|-----------------|
| Previous Ensemble (Unbalanced) | 99.14% | 0.00% | 0.50 | 48 |
| Optimised — Strict | 99.85% | 93.62% | 0.9991 | 4 |
| Optimised — Balanced | 99.82% | **92.63%** | 0.9991 | 4 |
| Optimised — Clinical Safe | 99.80% | 92.31% | **1.0000** | **0** |

The unbalanced ensemble — despite 99% accuracy — **missed every single stockout**. The optimised cost-sensitive model with Clinical Safe mode achieves **zero false negatives**.

---

## Who Is It For?

ProgyNova AI is designed as a **B2B SaaS platform** targeting:
- Pharmacy retail chains managing multi-location inventory
- Hospital pharmacy procurement teams
- Healthcare supply chain analysts and operations managers

It requires no data science expertise. Upload your transaction CSV, select a sensitivity mode, and receive forecasts, alerts, and SHAP explanations within seconds.
