"""
Indian Pharmacy Supply Chain - Dataset Validation & Benchmarking Suite
-------------------------------------------------------------------------
This script performs a rigorous data integrity audit, checks statistical realism 
against domain rules, and trains baseline machine learning models (regression & classification)
to establish benchmark scores on the Kaggle datasets.

Usage:
    python benchmark.py

Outputs:
    - Terminal report with audit & ML baseline results
    - dataset_benchmark_results.json (structured metrics log)
"""

import os
import json
import warnings
from pathlib import Path
import numpy as np
import pandas as pd
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

# Suppress warnings for clean console outputs
warnings.filterwarnings("ignore")

# Define helper functions for clean console logging without terminal-breaking emojis
def print_header(title):
    print("\n" + "=" * 75)
    print(f"  *** {title} ***")
    print("=" * 75)

def print_section(title):
    print(f"\n>>> {title}")
    print("-" * 50)

def print_pass(msg):
    print(f"  [PASS] {msg}")

def print_fail(msg):
    print(f"  [FAIL] {msg}")

def main():
    # --------------------------------------------------------------------------
    # Setup Paths and Files
    # --------------------------------------------------------------------------
    script_dir = Path(__file__).resolve().parent
    dispensing_path = script_dir / "dispensing.csv"
    drugs_path = script_dir / "drugs.csv"
    stores_path = script_dir / "stores.csv"
    context_path = script_dir / "context.csv"

    print_header("PROGYNOVA AI: KAGGLER DATASET INTEGRITY & BENCHMARKING SUITE")
    print(f"Dataset Folder Location: {script_dir}")

    # Check file availability
    files = {
        "dispensing.csv": dispensing_path,
        "drugs.csv": drugs_path,
        "stores.csv": stores_path,
        "context.csv": context_path
    }
    
    missing_files = []
    for fname, path in files.items():
        if not path.exists():
            missing_files.append(fname)
            
    if missing_files:
        print_fail(f"Missing files from dataset directory: {missing_files}")
        print("Please place the script in the same directory as the datasets.")
        return

    print_pass("All 4 dataset files located.")

    # Load DataFrames
    dispensing = pd.read_csv(dispensing_path)
    drugs = pd.read_csv(drugs_path)
    stores = pd.read_csv(stores_path)
    context = pd.read_csv(context_path)

    # --------------------------------------------------------------------------
    # Step 1: Data Integrity & Schema Validation
    # --------------------------------------------------------------------------
    print_section("1. Data Integrity & Referential Audits")
    
    integrity_log = {}
    passed_integrity = True

    # Check row & column counts
    expected_shapes = {
        "dispensing": (47424, 20),
        "drugs": (19, 7),
        "stores": (16, 7),
        "context": (1248, 15)
    }

    shapes_ok = True
    for df_name, df in zip(["dispensing", "drugs", "stores", "context"], [dispensing, drugs, stores, context]):
        exp_r, exp_c = expected_shapes[df_name]
        act_r, act_c = df.shape
        if act_r == exp_r and act_c == exp_c:
            print_pass(f"'{df_name}' dimensions match schema ({act_r} rows x {act_c} cols)")
        else:
            print_fail(f"'{df_name}' dimensions mismatch. Expected: {exp_r}x{exp_c}, Got: {act_r}x{act_c}")
            shapes_ok = False
            passed_integrity = False
    integrity_log["dimensions_ok"] = bool(shapes_ok)

    # Missing values audit
    nulls = {}
    for df_name, df in zip(["dispensing", "drugs", "stores", "context"], [dispensing, drugs, stores, context]):
        n_null = int(df.isnull().sum().sum())
        nulls[df_name] = n_null
        if n_null == 0:
            print_pass(f"'{df_name}' has 0 missing values.")
        else:
            null_cols = df.isnull().sum()
            null_cols = null_cols[null_cols > 0].to_dict()
            print_fail(f"'{df_name}' has {n_null} missing values: {null_cols}")
            passed_integrity = False
    integrity_log["nulls_audit"] = nulls

    # Duplicate rows audit
    duplicates = {}
    for df_name, df in zip(["dispensing", "drugs", "stores", "context"], [dispensing, drugs, stores, context]):
        n_dupe = int(df.duplicated().sum())
        duplicates[df_name] = n_dupe
        if n_dupe == 0:
            print_pass(f"'{df_name}' has 0 duplicate rows.")
        else:
            print_fail(f"'{df_name}' has {n_dupe} duplicate rows.")
            passed_integrity = False
    integrity_log["duplicates_audit"] = duplicates

    # Foreign Key Referential Integrity Checks
    # 1. dispensing -> stores
    orphaned_stores = ~dispensing["store_id"].isin(stores["store_id"])
    n_orphaned_stores = int(orphaned_stores.sum())
    if n_orphaned_stores == 0:
        print_pass("Referential integrity check: dispensing.store_id -> stores.store_id (0 orphaned)")
    else:
        print_fail(f"Referential integrity check: {n_orphaned_stores} orphaned stores found in dispensing.csv!")
        passed_integrity = False
    
    # 2. dispensing -> drugs
    orphaned_drugs = ~dispensing["drug_id"].isin(drugs["drug_id"])
    n_orphaned_drugs = int(orphaned_drugs.sum())
    if n_orphaned_drugs == 0:
        print_pass("Referential integrity check: dispensing.drug_id -> drugs.drug_id (0 orphaned)")
    else:
        print_fail(f"Referential integrity check: {n_orphaned_drugs} orphaned drugs found in dispensing.csv!")
        passed_integrity = False

    # 3. dispensing -> context (region, week)
    joined_keys = dispensing[["region", "week"]].merge(context[["region", "week"]], on=["region", "week"], how="left", indicator=True)
    orphaned_context = joined_keys["_merge"] == "left_only"
    n_orphaned_context = int(orphaned_context.sum())
    if n_orphaned_context == 0:
        print_pass("Referential integrity check: dispensing.(region, week) -> context.(region, week) (0 orphaned)")
    else:
        print_fail(f"Referential integrity check: {n_orphaned_context} orphaned context records found in dispensing.csv!")
        passed_integrity = False
    
    integrity_log["referential_integrity_ok"] = bool(n_orphaned_stores == 0 and n_orphaned_drugs == 0 and n_orphaned_context == 0)
    integrity_log["passed_all_integrity"] = bool(passed_integrity)

    # --------------------------------------------------------------------------
    # Step 2: Statistical Realism Tests
    # --------------------------------------------------------------------------
    print_section("2. Statistical Realism & Domain Diagnostics")
    
    stat_log = {}
    passed_stats = True

    # 1. Temporal Continuity
    # Check if there are exactly 304 unique store-drug combos, each with exactly 156 weeks (0 to 155)
    combos = dispensing.groupby(["store_id", "drug_id"])
    n_combos = len(combos)
    expected_combos = 16 * 19 # 304
    
    combos_ok = True
    if n_combos == expected_combos:
        print_pass(f"Located exactly {n_combos} store-drug combinations (16 stores x 19 drugs)")
    else:
        print_fail(f"Combination count mismatch. Expected: {expected_combos}, Got: {n_combos}")
        combos_ok = False
        passed_stats = False

    lengths_ok = True
    for (store, drug), group in combos:
        if len(group) != 156:
            lengths_ok = False
            passed_stats = False
            break
        weeks_seq = group["week"].sort_values().values
        if not np.array_equal(weeks_seq, np.arange(156)):
            lengths_ok = False
            passed_stats = False
            break

    if lengths_ok:
        print_pass("Sequential temporal continuity verified: all 304 combinations span exactly 156 weeks (0-155)")
    else:
        print_fail("Temporal gaps or out-of-order sequence detected in store-drug logs!")
    
    stat_log["temporal_continuity_ok"] = bool(combos_ok and lengths_ok)

    # 2. Population Scaling Test
    # Demand should scale with catchment population (average demand per store joined with catchment population)
    store_avg_demand = dispensing.groupby("store_id")["demand"].mean().reset_index()
    store_population = store_avg_demand.merge(stores[["store_id", "catchment_population"]], on="store_id")
    pop_corr = store_population["demand"].corr(store_population["catchment_population"])
    
    stat_log["population_demand_correlation"] = float(pop_corr)
    if pop_corr > 0.8:
        print_pass(f"Demographic scale coupling holds: Population-to-Demand correlation is high (r = {pop_corr:.4f})")
    else:
        print_fail(f"Demographic scaling correlation is weak (r = {pop_corr:.4f})")
        passed_stats = False

    # 3. Outbreak Correlation Test
    # Join dispensing with context and drug mapping to test outbreak-aware response patterns
    m_disp = dispensing.merge(drugs[["drug_id", "responds_to"]], on="drug_id")
    m_disp = m_disp.merge(context, on=["region", "week"])
    
    # Check specific drug-epidemic correlations
    # Paracetamol (D08) responds to dengue and flu
    para = m_disp[m_disp["drug_id"] == "D08"]
    dengue_corr = para["demand"].corr(para["sev_dengue"])
    flu_corr = para["demand"].corr(para["sev_flu"])
    
    # ORS (D09) responds to diarrhoeal diseases
    ors = m_disp[m_disp["drug_id"] == "D09"]
    diarrhoea_corr = ors["demand"].corr(ors["sev_diarrhoeal"])
    
    # Antimalarials (D15) responds to malaria
    malaria_drug = m_disp[m_disp["drug_id"] == "D15"]
    malaria_corr = malaria_drug["demand"].corr(malaria_drug["sev_malaria"])

    stat_log["paracetamol_dengue_corr"] = float(dengue_corr)
    stat_log["paracetamol_flu_corr"] = float(flu_corr)
    stat_log["ors_diarrhoeal_corr"] = float(diarrhoea_corr)
    stat_log["antimalarial_malaria_corr"] = float(malaria_corr)

    outbreaks_ok = True
    for name, r_val in zip(
        ["Paracetamol-Dengue", "Paracetamol-Flu", "ORS-Diarrhoeal", "Antimalarial-Malaria"],
        [dengue_corr, flu_corr, diarrhoea_corr, malaria_corr]
    ):
        # We verify that the correlation is positive (r > 0.0), indicating positive demand response
        if r_val > 0.0:
            print_pass(f"Outbreak alignment verified: {name} correlation is positive (r = {r_val:.4f})")
        else:
            print_fail(f"Outbreak signal alignment is weak/negative for {name} (r = {r_val:.4f})")
            outbreaks_ok = False
            passed_stats = False

    stat_log["outbreak_alignment_ok"] = bool(outbreaks_ok)
    stat_log["passed_all_stats"] = bool(passed_stats)

    # --------------------------------------------------------------------------
    # Step 3: Machine Learning Learnability Benchmarks
    # --------------------------------------------------------------------------
    print_section("3. Machine Learning Learnability Benchmarks")
    
    # Join datasets to construct features
    df = dispensing.merge(stores[["store_id", "catchment_population", "supplier_lead_time_weeks"]], on="store_id")
    df = df.merge(drugs[["drug_id", "category", "baseline_weekly_demand", "responds_to"]], on="drug_id")
    df = df.merge(context, on=["region", "week"])
    
    # Ensure ordered sorting to generate correct historical lags
    df = df.sort_values(["store_id", "drug_id", "week"]).reset_index(drop=True)
    
    # Feature Engineering (Lags and Rolling Statistics)
    print("Engineering features (Lags, Rolling Averages, Circular Time)...")
    
    # Target lags
    df["demand_lag_1"] = df.groupby(["store_id", "drug_id"])["demand"].shift(1)
    df["demand_lag_2"] = df.groupby(["store_id", "drug_id"])["demand"].shift(2)
    df["demand_lag_4"] = df.groupby(["store_id", "drug_id"])["demand"].shift(4)
    
    # Rolling averages
    df["demand_roll_mean_4"] = df.groupby(["store_id", "drug_id"])["demand"].shift(1).rolling(window=4).mean().reset_index(0, drop=True)
    
    # Circular seasonal encodings
    df["sin_week"] = np.sin(2 * np.pi * df["week_of_year"] / 52)
    df["cos_week"] = np.cos(2 * np.pi * df["week_of_year"] / 52)
    
    # Drop initial rows where lags are undefined (weeks 0, 1, 2, 3)
    df_clean = df.dropna(subset=["demand_lag_1", "demand_lag_2", "demand_lag_4", "demand_roll_mean_4"]).reset_index(drop=True)
    
    # Categorical mapping
    df_clean = pd.get_dummies(df_clean, columns=["category", "copay_type", "patient_age_group"], drop_first=True)
    
    # Feature columns to include in the model
    exclude_cols = {
        "store_id", "drug_id", "city", "state", "region", "week", "date", 
        "demand", "units_dispensed", "stockout", "batch_number", "expiry_date", 
        "responds_to", "total_amount_inr", "prescriber_specialty", "dispense_status",
        "monsoon_phase", "_merge"
    }
    
    feature_cols = [c for c in df_clean.columns if c not in exclude_cols and not pd.api.types.is_string_dtype(df_clean[c])]
    
    print(f"      - Mapped {len(feature_cols)} features for model training.")
    
    # Chronological Train-Test Split (Weeks 4-119 for Training, Weeks 120-155 for Test)
    train_mask = df_clean["week"] <= 119
    test_mask = df_clean["week"] > 119
    
    X_train = df_clean.loc[train_mask, feature_cols]
    y_train_reg = df_clean.loc[train_mask, "demand"]
    y_train_clf = df_clean.loc[train_mask, "stockout"]
    
    X_test = df_clean.loc[test_mask, feature_cols]
    y_test_reg = df_clean.loc[test_mask, "demand"]
    y_test_clf = df_clean.loc[test_mask, "stockout"]
    
    stock_on_hand_test = df_clean.loc[test_mask, "stock_on_hand"].values
    
    print(f"      - Training samples (weeks 4-119): {len(X_train):,}")
    print(f"      - Test samples (weeks 120-155): {len(X_test):,}")

    ml_log = {}

    # Check for xgboost installation
    try:
        from xgboost import XGBRegressor, XGBClassifier
        has_xgboost = True
    except ImportError:
        print("Warning: xgboost package not found. Falling back to RandomForest for baseline benchmarks.")
        from sklearn.ensemble import RandomForestRegressor, RandomForestClassifier
        has_xgboost = False

    # Naive Carry-Forward Baseline (Lag-1)
    naive_preds = df_clean.loc[test_mask, "demand_lag_1"].values
    naive_mape = mean_absolute_percentage_error(y_test_reg[y_test_reg > 0], naive_preds[y_test_reg > 0]) * 100
    naive_mae = mean_absolute_error(y_test_reg, naive_preds)
    naive_rmse = np.sqrt(mean_squared_error(y_test_reg, naive_preds))
    print(f"\n   [Naive Carry-Forward Baseline]:")
    print(f"      -> MAE:  {naive_mae:.4f}")
    print(f"      -> RMSE: {naive_rmse:.4f}")
    print(f"      -> MAPE: {naive_mape:.2f}%")

    ml_log["naive_baseline"] = {
        "MAE": round(float(naive_mae), 4),
        "RMSE": round(float(naive_rmse), 4),
        "MAPE_Pct": round(float(naive_mape), 2)
    }

    # 3.1: Continuous Demand Forecasting (Regression)
    print("\n   [Regression Model - Weekly Demand Forecasting]:")
    if has_xgboost:
        reg_model = XGBRegressor(n_estimators=150, max_depth=5, learning_rate=0.08, random_state=42, n_jobs=-1)
    else:
        reg_model = RandomForestRegressor(n_estimators=100, max_depth=10, random_state=42, n_jobs=-1)
        
    reg_model.fit(X_train, y_train_reg)
    reg_preds = np.clip(reg_model.predict(X_test), 0, None)
    
    reg_mae = mean_absolute_error(y_test_reg, reg_preds)
    reg_rmse = np.sqrt(mean_squared_error(y_test_reg, reg_preds))
    reg_mape = mean_absolute_percentage_error(y_test_reg[y_test_reg > 0], reg_preds[y_test_reg > 0]) * 100
    
    print(f"      -> MAE:  {reg_mae:.4f} units")
    print(f"      -> RMSE: {reg_rmse:.4f} units")
    print(f"      -> MAPE: {reg_mape:.2f}%")
    
    ml_log["regression_benchmark"] = {
        "model_type": "XGBoost" if has_xgboost else "RandomForest",
        "MAE": round(float(reg_mae), 4),
        "RMSE": round(float(reg_rmse), 4),
        "MAPE_Pct": round(float(reg_mape), 2)
    }
    
    # 3.2: Stockout Event Detection (Classification)
    print("\n   [Classification Model - Binary Stockout Detection]:")
    n_neg = (y_train_clf == 0).sum()
    n_pos = (y_train_clf == 1).sum()
    imbalance_ratio = n_neg / n_pos if n_pos > 0 else 1.0
    
    if has_xgboost:
        clf_model = XGBClassifier(n_estimators=150, max_depth=5, learning_rate=0.08, 
                                  scale_pos_weight=imbalance_ratio, random_state=42, n_jobs=-1)
    else:
        clf_model = RandomForestClassifier(n_estimators=100, max_depth=10, 
                                           class_weight="balanced", random_state=42, n_jobs=-1)
        
    clf_model.fit(X_train, y_train_clf)
    
    clf_probs = clf_model.predict_proba(X_test)[:, 1]
    clf_preds = clf_model.predict(X_test)
    
    clf_acc = accuracy_score(y_test_clf, clf_preds)
    clf_prec = precision_score(y_test_clf, clf_preds, zero_division=0)
    clf_rec = recall_score(y_test_clf, clf_preds, zero_division=0)
    clf_f1 = f1_score(y_test_clf, clf_preds, zero_division=0)
    
    try:
        clf_auc = roc_auc_score(y_test_clf, clf_probs)
    except:
        clf_auc = 0.5

    print(f"      -> Accuracy:  {clf_acc*100:.2f}%")
    print(f"      -> Precision: {clf_prec*100:.2f}%")
    print(f"      -> Recall:    {clf_rec*100:.2f}%")
    print(f"      -> F1-Score:  {clf_f1*100:.2f}%")
    print(f"      -> ROC-AUC:   {clf_auc:.4f}")

    ml_log["classification_benchmark"] = {
        "model_type": "XGBoost" if has_xgboost else "RandomForest",
        "Accuracy": round(float(clf_acc), 4),
        "Precision": round(float(clf_prec), 4),
        "Recall": round(float(clf_rec), 4),
        "F1_Score": round(float(clf_f1), 4),
        "ROC_AUC": round(float(clf_auc), 4),
        "imbalance_ratio_used": round(float(imbalance_ratio), 2)
    }

    # --------------------------------------------------------------------------
    # Step 4: Write Benchmark Output to JSON File
    # --------------------------------------------------------------------------
    output_payload = {
        "data_integrity_audit": integrity_log,
        "statistical_realism_tests": stat_log,
        "machine_learning_benchmarks": ml_log
    }
    
    results_path = script_dir / "dataset_benchmark_results.json"
    with open(results_path, "w") as f:
        json.dump(output_payload, f, indent=4)
        
    print_section("Benchmark Results Export")
    print_pass(f"Exported metrics JSON registry to: {results_path}")
    print("=" * 75)
    print(" *** PIPELINE RUN COMPLETED SUCCESSFULLY! ***")
    print("=" * 75)

if __name__ == "__main__":
    main()
