# ProgyNova AI User Guide & Documentation

Welcome to the ProgyNova AI platform. This guide serves as a unified reference for understanding the system architecture, operating the interactive dashboard, and interpreting the underlying machine learning models that power the stockout predictions.

---

## 1. System Overview

ProgyNova AI is a demand forecasting and stockout prediction platform designed specifically to address the **class imbalance paradox** of clinical stockout events. In typical pharmacy networks, actual medication shortages occur less than 1.3% of the time, making traditional accuracy metrics dangerously misleading. 

ProgyNova solves this using a **Cost-Sensitive XGBoost Regressor** paired with an **Asymmetric Post-Hoc Threshold Optimizer**, ensuring life-saving therapies (like insulin and bronchodilators) are never under-ordered.

### Core Capabilities:
- **Format-Agnostic Ingestion:** Upload varied CSV schemas; the `AutoSchemaEngine` dynamically maps columns.
- **TreeSHAP Explainability:** Understand *why* a demand surge is predicted (e.g., local outbreaks, seasonal trends).
- **Dynamic Sensitivity Adjustments:** Toggle between Strict, Balanced, and Clinical Safe alerting profiles on the fly.

---

## 2. Testing with Custom Datasets

You can easily test the model on your own pharmacy or retail transaction datasets without writing new ingestion code.

### Preparing your Data
Your custom dataset should be a CSV file containing at minimum:
- **Temporal Index:** A date or week column.
- **Entity & Location:** Unique IDs for the product/drug and the store/location.
- **Demand/Target:** The historical sales or dispensed quantities.
- **Inventory Context (Optional):** Current stock-on-hand for stockout evaluation.

*Note: The system automatically attempts to map your custom column names (e.g., `item_code`, `qty_sold`, `inventory_level`) to the internal schema.*

### How to Upload
1. Open the Dashboard (Home page).
2. Click **"Import Data"** or use the drag-and-drop panel on the right.
3. The system will automatically route the CSV to the backend, run the XGBoost inference, and render the forecasts and critical alerts.

---

## 3. Operational Sensitivity Modes

To account for different risk tolerances across medical products, ProgyNova uses an asymmetric alert boundary:
$$\text{Alert} = \mathbb{I}\left( (\hat{y} \cdot \alpha + \beta) > S \right)$$

You can control this behavior in the **ML Metrics** tab using the following modes:

| Sensitivity Level | Multiplier ($\alpha$) | Buffer ($\beta$) | Operational Impact |
| :--- | :---: | :---: | :--- |
| **Strict** | 1.00 | 0.0 | Minimizes false alarms. Best for expensive, slow-moving therapeutics where capital lockup must be avoided. |
| **Balanced** | 1.00 | 5.0 | Harmonizes precision and recall. A stable default for general pharmacy inventory. |
| **Clinical Safe** | 1.05 | 1.0 | Maximizes Recall (~100.0%). Best for life-saving critical drugs where missed shortages are unacceptable. |

---

## 4. Understanding the Dashboard Metrics

> **Dynamic Audit vs. Baseline**
> 
> By default, the ML Metrics page displays a pre-computed **Model Baseline Benchmark** demonstrating historical performance. 
> 
> The moment you upload a custom dataset via the Home page, the dashboard instantly recalculates all metrics and switches to **Dynamic Audit (Uploaded Logs)** mode. Every chart, confusion matrix cell, and recall score will update in real-time to reflect the model's accuracy on your specific data!

When reviewing your **ML Metrics** page, you will see several standard performance indicators:

- **Accuracy (>99.8%):** Heavily inflated by the massive volume of weeks where stock is sufficient. Do not rely on this alone.
- **Precision:** The percentage of triggered alerts that actually result in a stockout. High precision means fewer false alarms.
- **Recall (Sensitivity):** The percentage of *actual true stockouts* that the system successfully warned you about. This is the **most critical metric** for patient safety.
- **F1-Score:** The harmonic mean of Precision and Recall.

### Continuous Forecasting Performance
The underlying XGBoost regressor (which powers the continuous demand line) operates with an error margin of **4.90% MAPE** (Mean Absolute Percentage Error), significantly outperforming baseline naive models (38.6%) and complex deep-learning Transformers (17.4%).

---

## 5. Driver Analysis (TreeSHAP)

By clicking on any alert in the table, the **Driver Explainer** panel will slide in. This uses exact TreeSHAP calculations to show you exactly which variables pushed the forecast higher or lower.

- **Red Bars (Positive SHAP):** Variables driving demand *up* (e.g., an active regional disease outbreak, high historical lags).
- **Blue Bars (Negative SHAP):** Variables driving demand *down* (e.g., off-season timing, low copay coverage).

Use these explanations to justify large reorder capital requests to hospital management.
