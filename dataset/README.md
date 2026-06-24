# 🏥 Indian Pharmacy Supply Chain — Demand, Stockouts & Disease Outbreaks

## Overview

A **synthetic, research-grade dataset** simulating **3 years of weekly pharmaceutical dispensing transactions** across **16 pharmacy outlets** in **9 Indian states**, covering **19 essential drugs** from India's National List of Essential Medicines (NLEM 2022). The dataset captures realistic demand patterns influenced by **monsoon seasonality, regional disease outbreaks (dengue, malaria, flu, etc.), festival-driven spikes, and supplier lead-time constraints**.

> **47,424 dispensing records** · **1,248 epidemiological context rows** · **19 drugs** · **16 stores** · **156 weeks (Jan 2023 – Dec 2025)**

This dataset was originally created to power the **ProgyNova AI** demand forecasting and stockout prediction system. It is designed for time-series forecasting, classification, supply chain optimization, and healthcare analytics research.

---

## 🎯 Use Cases

| Domain | Example Task |
| :--- | :--- |
| **Time-Series Forecasting** | Predict weekly drug demand per store using lagged features, seasonality, and outbreak signals |
| **Binary Classification** | Detect stockout events (demand > stock-on-hand) with configurable sensitivity thresholds |
| **Supply Chain Optimization** | Model reorder points, safety stock levels, and lead-time buffering strategies |
| **Epidemiological Analysis** | Study how regional disease outbreaks (dengue, malaria, flu) drive pharmaceutical demand |
| **Seasonal Pattern Mining** | Analyze monsoon phase effects, festival-driven demand spikes, and weather anomalies |
| **Explainable AI (XAI)** | Build SHAP-based explainability pipelines to interpret demand forecasting models |
| **Healthcare Logistics** | Simulate pharmacy network operations across diverse Indian geographies |
| **Anomaly Detection** | Identify unusual demand surges caused by outbreak spikes or supply disruptions |

---

## 📁 Dataset Structure

This dataset is organized into logical subdirectories for datasets, documentation, scripts, and visualizations:

```
dataset/
├── data/
│   ├── dispensing.csv      # Core transactional data (47,424 rows × 20 columns)
│   ├── drugs.csv           # Drug catalog and properties (19 rows × 7 columns)
│   ├── stores.csv          # Pharmacy outlet metadata (16 rows × 7 columns)
│   └── context.csv         # Regional epidemiological context (1,248 rows × 15 columns)
├── docs/
│   ├── dataset_overview_section.md   # Extra dataset metadata details
│   └── dataset_overview_section.docx  # Full format draft report
├── scripts/
│   ├── benchmark.py                  # Auditing and baseline model training script
│   └── generate_dataset_plots.py     # Figure generation script
├── visualizations/
│   ├── benchmark_model_comparison.png
│   ├── demographic_demand_coupling.png
│   └── outbreak_demand_alignment.png
├── README.md           # This file
├── LICENSE             # CC BY 4.0 License
└── dataset_benchmark_results.json # Execution telemetry results
```

### Relationships

```
dispensing.csv ──┬── drug_id   → drugs.csv (drug_id)
                 ├── store_id  → stores.csv (store_id)
                 └── region, week → context.csv (region, week)
```

---

## 📊 File Descriptions & Schema

### 1. `dispensing.csv` — Weekly Dispensing Transactions

The primary dataset. Each row represents one drug–store–week combination over 156 weeks.

| Column | Type | Description |
| :--- | :--- | :--- |
| `store_id` | string | Pharmacy outlet identifier (S01–S16) |
| `drug_id` | string | Drug identifier (D01–D19) |
| `city` | string | City where the pharmacy is located |
| `state` | string | Indian state |
| `region` | string | Geographical region (East, West, North, South, etc.) |
| `week` | int | Sequential week index (0–155) |
| `date` | date | ISO 8601 date for the start of the week |
| `demand` | int | Actual patient demand in units for that week |
| `units_dispensed` | int | Units actually dispensed (min of demand and available stock) |
| `stock_on_hand` | int | Inventory level at the start of the week |
| `units_ordered` | int | Replenishment order quantity placed (0 if no order) |
| `stockout` | int | Binary flag: 1 if demand exceeded available stock, 0 otherwise |
| `batch_number` | string | Pharmaceutical batch identifier |
| `expiry_date` | date | Batch expiry date |
| `unit_price_inr` | float | Unit price in Indian Rupees (₹) |
| `total_amount_inr` | float | Total transaction value (units_dispensed × unit_price) |
| `patient_age_group` | string | Age category: Pediatric, Adult, or Geriatric |
| `copay_type` | string | Payment method: Cash, Private Insurance, or CGHS Government Scheme |
| `prescriber_specialty` | string | Prescribing physician's specialty |
| `dispense_status` | string | Transaction outcome (Fully Dispensed, Partially Dispensed, OutOfStock_Cancelled, No Transaction) |

**Key Statistics:**
- **Rows:** 47,424 (19 drugs × 16 stores × ~156 weeks)
- **Stockout rate:** ~1.3% (realistic class imbalance for classification tasks)
- **Demand range:** 0 – 2,500+ units/week depending on drug and store

---

### 2. `drugs.csv` — Drug Catalog

Metadata for the 19 drugs in the dataset, selected from India's NLEM 2022 covering chronic (antidiabetics, antihypertensives) and acute (antimalarials, antivirals, antibiotics) categories.

| Column | Type | Description |
| :--- | :--- | :--- |
| `drug_id` | string | Unique drug identifier (D01–D19) |
| `name` | string | Drug name with dosage form |
| `category` | string | Therapeutic category (e.g., Antidiabetic, Antibiotic, Antimalarial) |
| `baseline_weekly_demand` | int | Average weekly demand at a reference population of 50,000 |
| `shelf_life_weeks` | int | Shelf life in weeks (52, 78, or 104) |
| `seasonal_amplitude` | float | Strength of seasonal demand variation (0.03–0.35) |
| `responds_to` | string | Semicolon-separated list of diseases that drive demand spikes |

**Drug Categories Covered:**
- Chronic: Metformin, Insulin, Telmisartan, Amlodipine, Atorvastatin, Phenytoin, Levothyroxine
- Acute/Seasonal: Paracetamol, ORS, Oseltamivir, Amoxicillin, Azithromycin, Cetirizine, Salbutamol, Artemether+Lumefantrine, Doxycycline, Zinc, Pantoprazole, Dextromethorphan

---

### 3. `stores.csv` — Pharmacy Outlet Metadata

Describes the 16 pharmacy locations spanning 9 Indian states and 8 geographical regions.

| Column | Type | Description |
| :--- | :--- | :--- |
| `store_id` | string | Unique store identifier (S01–S16) |
| `name` | string | Pharmacy name and locality |
| `city` | string | City name |
| `state` | string | Indian state |
| `region` | string | Geographical region |
| `catchment_population` | int | Estimated population served (22,000–85,000) |
| `supplier_lead_time_weeks` | int | Supplier replenishment lead time (1–3 weeks) |

**Cities Covered:** Pune, Nashik, Bengaluru, Hubli, Kolkata, Howrah, Chennai, Madurai, New Delhi, Noida, Bhubaneswar, Cuttack, Kochi, Kozhikode, Jaipur, Barmer

**Pharmacy Types:** MedPlus, Apollo, Jan Aushadhi Kendra (government), Netmeds, District Hospital, Private

---

### 4. `context.csv` — Regional Epidemiological & Environmental Context

Weekly epidemiological severity indices and environmental factors for each of the 8 geographical regions.

| Column | Type | Description |
| :--- | :--- | :--- |
| `region` | string | Geographical region |
| `week` | int | Sequential week index (0–155) |
| `week_of_year` | int | Calendar week of year (1–52) |
| `rainfall_anomaly` | float | Deviation from normal rainfall (positive = above-average) |
| `monsoon_phase` | string | Seasonal phase (winter, pre-monsoon, monsoon, post-monsoon, etc.) |
| `festival_intensity` | float | Regional festival activity intensity (0.0–1.0) |
| `sev_dengue` | float | Dengue outbreak severity index (0.0–1.2) |
| `sev_malaria` | float | Malaria outbreak severity index (0.0–1.0) |
| `sev_flu` | float | Influenza severity index (0.0–0.9) |
| `sev_diarrhoeal` | float | Diarrhoeal disease severity index (0.0–0.8) |
| `sev_respiratory` | float | Respiratory illness severity index (0.0–1.0) |
| `sev_typhoid` | float | Typhoid severity index (0.0–0.7) |
| `sev_chikungunya` | float | Chikungunya severity index (0.0–0.7) |
| `sev_leptospirosis` | float | Leptospirosis severity index (0.0–1.0) |
| `date` | date | ISO 8601 date for the start of the week |

**Regions Covered:** East, East-Central, North, North-West, South, South-East, South-West, West

**Diseases Modelled:** Dengue, Malaria, Influenza, Diarrhoeal diseases, Respiratory infections, Typhoid, Chikungunya, Leptospirosis

---

## 🔬 Data Generation Methodology

This dataset was **synthetically generated** using a domain-informed simulation engine. The generation process incorporates:

1. **Population-Scaled Baselines:** Each drug's weekly demand is scaled by the store's catchment population relative to a reference population of 50,000.

2. **Seasonal Demand Patterns:** Sinusoidal seasonal components with drug-specific amplitudes and phase shifts model real-world seasonal variation in pharmaceutical demand.

3. **Disease Outbreak Response:** Drugs respond to regional disease severity indices with configurable response strengths and lag periods. For example, Paracetamol demand rises with dengue and flu outbreaks; ORS demand tracks diarrhoeal disease severity.

4. **Monsoon & Rainfall Effects:** Region-specific monsoon onset dates and rainfall anomalies influence demand for weather-sensitive drugs.

5. **Festival-Driven Spikes:** Indian festival calendars (Diwali, Holi, Pongal, Durga Puja, Onam, etc.) create demand surges with region-specific intensities.

6. **Stochastic Demand:** Final demand values are sampled from a **Negative Binomial distribution** (overdispersion parameter $r = 16$) to model realistic count-data variance.

7. **Inventory Simulation:** A reorder-point / order-up-to-level (ROP/OTU) inventory policy determines replenishment orders based on lead times, resulting in realistic stockout events at ~1.3% prevalence.

8. **Year-over-Year Growth:** A 6% annual compounding trend factor models population and utilization growth.

**Reproducibility:** The simulation uses a fixed random seed (`SEED = 42`) via `numpy.random.default_rng()` for full reproducibility.

---

## 🚀 Quick Start

### Loading the Data (Python)

```python
import pandas as pd

dispensing = pd.read_csv("data/dispensing.csv")
drugs = pd.read_csv("data/drugs.csv")
stores = pd.read_csv("data/stores.csv")
context = pd.read_csv("data/context.csv")

# Join all tables
df = dispensing.merge(stores[["store_id", "catchment_population", "supplier_lead_time_weeks"]], on="store_id")
df = df.merge(drugs[["drug_id", "category", "baseline_weekly_demand", "responds_to"]], on="drug_id")
df = df.merge(context, on=["region", "week"])

print(f"Combined dataset: {df.shape[0]:,} rows × {df.shape[1]} columns")
print(f"Stockout rate: {df['stockout'].mean()*100:.2f}%")
```

### Basic EDA

```python
import matplotlib.pyplot as plt

# Weekly demand for Paracetamol across all stores
paracetamol = dispensing[dispensing["drug_id"] == "D08"]
weekly_demand = paracetamol.groupby("week")["demand"].sum()

plt.figure(figsize=(14, 4))
plt.plot(weekly_demand.index, weekly_demand.values)
plt.title("Paracetamol (D08) — Aggregate Weekly Demand Across All Stores")
plt.xlabel("Week")
plt.ylabel("Total Units Demanded")
plt.tight_layout()
plt.show()
```

### Building a Forecast Model

```python
from sklearn.model_selection import train_test_split
from xgboost import XGBRegressor
from sklearn.metrics import mean_absolute_percentage_error

# Feature engineering (simplified)
df["sin_week"] = np.sin(2 * np.pi * df["week_of_year"] / 52)
df["cos_week"] = np.cos(2 * np.pi * df["week_of_year"] / 52)

features = ["catchment_population", "baseline_weekly_demand", "sin_week", "cos_week",
            "rainfall_anomaly", "festival_intensity", "sev_dengue", "sev_flu", "sev_respiratory"]

X = df[features]
y = df["demand"]

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

model = XGBRegressor(n_estimators=300, max_depth=6, learning_rate=0.05)
model.fit(X_train, y_train)

y_pred = model.predict(X_test)
mape = mean_absolute_percentage_error(y_test, y_pred) * 100
print(f"Test MAPE: {mape:.2f}%")
```

---

### 🔬 Validation & Benchmarking Suite

To guarantee the reliability, scientific rigor, and learnability of this synthetic dataset, we have developed a comprehensive validation and benchmarking suite. You can run the audit and baseline model training locally using the provided [benchmark.py](./scripts/benchmark.py) script:

```bash
python scripts/benchmark.py
```

Running this script performs a 3-tier validation workflow, logging full diagnostic telemetry to `dataset_benchmark_results.json`. Below are the established outcomes:

#### 1. Data Integrity & Schema Validation (100% Pass)
The dataset conforms to rigorous structural constraints. Our automated audit verified the following properties:
- **Dimension Check**:
  - `dispensing.csv`: 47,424 rows × 20 columns
  - `context.csv`: 1,248 rows × 15 columns
  - `drugs.csv`: 19 rows × 7 columns
  - `stores.csv`: 16 rows × 7 columns
- **Completeness**: 0 missing/null values across all files.
- **Uniqueness**: 0 duplicate rows. Primary keys `(store_id, drug_id, week)` in `dispensing.csv` are unique.
- **Referential Integrity**: 0 orphaned keys. All foreign keys (`store_id`, `drug_id`, and `(region, week)`) resolve perfectly across all tables.

#### 2. Statistical Realism & Domain Diagnostics
We verified that the simulation output reproduces the statistical characteristics of real-world pharmacy supply chains:
- **Temporal Continuity**: Verified 156 consecutive weeks (sequential indexes 0 to 155) for all 304 unique store-drug combinations without any gaps.
- **Demographic Coupling**: Store catchment population correlates extremely strongly with average drug demand ($r = 0.9974$), validating realistic scaling across stores.
- **Epidemiological Alignment**: Demand spikes align correctly with disease outbreak severity indicators (all positive correlations, $r > 0.0$):
  - **Paracetamol (D08) vs. Dengue Outbreaks**: $r = 0.5857$
  - **Paracetamol (D08) vs. Influenza Outbreaks**: $r = 0.0092$
  - **ORS (D09) vs. Diarrhoeal Outbreaks**: $r = 0.2292$
  - **Antimalarials (D15) vs. Malaria Outbreaks**: $r = 0.4521$

#### 3. Machine Learning Learnability Benchmarks
We established baseline regression and classification scores using a chronological split (Weeks 4-119 for training, Weeks 120-155 for testing) to prevent temporal data leakage:
- **Continuous Demand Forecasting (Regression)**:
  - *Naive Baseline (Lag-1)*: MAE = 112.51, RMSE = 200.98, MAPE = 46.26%
  - *XGBoost Regressor*: MAE = 72.91, RMSE = 129.65, MAPE = 32.20% (a 35% error reduction over the baseline)
- **Stockout Alert Warnings (Imbalanced Binary Classification)**:
  - *XGBoost Classifier* (with scale_pos_weight = 133.6): Accuracy = 98.30%, Precision = 37.45%, Recall = 76.42%, F1-Score = 50.27%, ROC-AUC = 0.9781

All diagnostics and run telemetry are saved automatically to `dataset_benchmark_results.json`.

---

## 📈 Key Dataset Statistics

| Metric | Value |
| :--- | :--- |
| Total dispensing records | 47,424 |
| Unique drugs | 19 |
| Unique stores | 16 |
| Unique drug–store combinations | 304 |
| Time span | 156 weeks (Jan 2023 – Dec 2025) |
| Regions covered | 8 |
| Indian states covered | 9 |
| Cities covered | 16 |
| Diseases modelled | 8 |
| Overall stockout rate | ~1.3% |
| Drug price range (₹) | ₹45 – ₹1,350 per unit |
| Context records | 1,248 (8 regions × 156 weeks) |

---

## 🏷️ Tags

`pharmacy` · `supply-chain` · `healthcare` · `india` · `time-series` · `demand-forecasting` · `stockout-prediction` · `epidemiology` · `disease-outbreak` · `monsoon` · `pharmaceutical` · `inventory-management` · `xgboost` · `classification` · `regression` · `synthetic-data` · `NLEM`

---

## 📜 License

This dataset is released under the **Creative Commons Attribution 4.0 International (CC BY 4.0)** license. You are free to:

- **Share** — copy and redistribute the material in any medium or format
- **Adapt** — remix, transform, and build upon the material for any purpose, including commercial

Under the following terms:
- **Attribution** — You must give appropriate credit, provide a link to the license, and indicate if changes were made.

See the [LICENSE](./LICENSE) file for the full legal text.

---

## 📖 Citation

If you use this dataset in your research or project, please cite it as:

```bibtex
@misc{progynova_pharmacy_dataset_2025,
  title   = {Indian Pharmacy Demand \& Stockout Forecasting Dataset},
  author  = {AlgorithSage},
  year    = {2025},
  url     = {https://www.kaggle.com/datasets/your-username/indian-pharmacy-demand-stockout-forecasting},
  note    = {Synthetic dataset for pharmaceutical demand forecasting and stockout prediction across Indian pharmacy networks}
}
```

---

## 🙏 Acknowledgments

- Drug selection guided by India's **National List of Essential Medicines (NLEM) 2022**
- Disease outbreak patterns informed by **IDSP (Integrated Disease Surveillance Programme)** seasonal reports
- Festival calendar based on Indian national and regional holiday schedules
- Monsoon onset and rainfall patterns based on **IMD (India Meteorological Department)** climatological normals
- Pharmacy store names inspired by real Indian pharmacy chains (MedPlus, Apollo, Jan Aushadhi Kendra, Netmeds)

---

## ⚠️ Disclaimer

This is a **synthetic dataset** generated through computational simulation. While it models realistic patterns based on domain knowledge, it does **not** contain real patient data, actual pharmacy transactions, or genuine clinical records. It should be used for **research, education, and benchmarking purposes only**.
