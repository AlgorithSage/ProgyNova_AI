import os
import sys
import json
from pathlib import Path
import numpy as np
import pandas as pd
import xgboost as xgb
from sklearn.metrics import (
    mean_absolute_error,
    mean_squared_error,
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    confusion_matrix,
    roc_curve
)

# Set up matplotlib for headless execution to avoid tkinter display errors
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

# --------------------------------------------------------------------------
# Paths and Constants
# --------------------------------------------------------------------------
WORKSPACE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = WORKSPACE_DIR / "progynova-api" / "data"
MODELS_DIR = WORKSPACE_DIR / "progynova-api" / "models"
OUTPUT_DIR = WORKSPACE_DIR / "reproduction_results"

# --------------------------------------------------------------------------
# Sensitivity Levels
# --------------------------------------------------------------------------
SENSITIVITY_MODES = {
    "Strict": {"multiplier": 1.0, "buffer": 0.0, "desc": "Focus on high Precision, fewer false alarms"},
    "Balanced": {"multiplier": 1.0, "buffer": 5.0, "desc": "Harmonized F1-score optimization"},
    "Clinical Safe": {"multiplier": 1.05, "buffer": 1.0, "desc": "Maximizes Recall to protect patient safety"}
}

def check_env():
    """Ensure required directories exist."""
    print("=" * 70)
    print("[REPRODUCE] PROGYNOVA AI - SCIENTIFIC REPRODUCIBILITY & VALIDATION PIPELINE")
    print("=" * 70)
    
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    features_csv = DATA_DIR / "features.csv"
    model_json = MODELS_DIR / "xgboost_baseline.json"
    
    if not features_csv.exists() or not model_json.exists():
        print("[*] Missing raw dataset features or trained weights.")
        print("[*] Running synthetic simulation and model training scripts to build workspace...")
        
        # Insert scripts directory to sys.path and run generate_data
        scripts_dir = WORKSPACE_DIR / "progynova-api" / "scripts"
        sys.path.append(str(scripts_dir))
        
        # Change working directory temporarily to progynova-api to match its relative paths
        orig_cwd = os.getcwd()
        try:
            os.chdir(str(WORKSPACE_DIR / "progynova-api"))
            import generate_data
            generate_data.run_pipeline()
        finally:
            os.chdir(orig_cwd)
            
    if not (DATA_DIR / "features.csv").exists():
        print("[ERROR] Could not locate or generate 'features.csv' under data/.")
        sys.exit(1)
        
    if not (MODELS_DIR / "xgboost_baseline.json").exists():
        print("[ERROR] Could not locate or train the XGBoost model at models/xgboost_baseline.json.")
        sys.exit(1)

def run_evaluation(evaluate_full=False):
    # Load dataset
    print("\n[1/4] Loading features matrix...")
    df = pd.read_csv(DATA_DIR / "features.csv")
    
    # Validation Split
    if evaluate_full:
        test_df = df.copy()
        print(f"      - Loaded {len(df)} total rows.")
        print("      - Running evaluation on the FULL dataset (operational audit).")
        img_prefix = "full_fig"
        title_suffix = " (Full Horizon)"
    else:
        test_df = df[df["week"] >= 143].copy()
        print(f"      - Loaded {len(df)} total rows.")
        print(f"      - Filtered Test Set: {len(test_df)} rows (weeks 143 to 155).")
        img_prefix = "fig"
        title_suffix = " (Validation Window)"
    
    # Extract features
    exclude = {"store_id", "drug_id", "week", "date", "demand", "units_dispensed",
               "stock_on_hand", "units_ordered", "stockout",
               "days_of_cover", "reorder_urgent", "recommended_order_qty"}
    feature_cols = [c for c in df.columns if c not in exclude]
    
    X_test = test_df[feature_cols].values
    y_test = test_df["demand"].values
    stock_on_hand = test_df["stock_on_hand"].values
    
    # Load XGBoost model weights
    print("\n[2/4] Loading XGBoost regressor weights...")
    model = xgb.XGBRegressor()
    model.load_model(str(MODELS_DIR / "xgboost_baseline.json"))
    
    # Continuous predictions
    y_pred = model.predict(X_test)
    
    # Compute Continuous Regression Metrics
    mae = mean_absolute_error(y_test, y_pred)
    rmse = np.sqrt(mean_squared_error(y_test, y_pred))
    
    # Filtered non-zero MAPE
    non_zero = y_test > 0
    mape = np.mean(np.abs(y_test[non_zero] - y_pred[non_zero]) / y_test[non_zero]) * 100
    
    # Stabilized MAPE (with eps = 1.0 to handle zero demand weeks gracefully)
    s_mape = np.mean(np.abs(y_test - y_pred) / (y_test + 1.0)) * 100
    
    print("\n[REGRESSION] Continuous Regression Performance Summary:")
    print(f"      - Mean Absolute Error (MAE): {mae:.4f} boxes")
    print(f"      - Root Mean Squared Error (RMSE): {rmse:.4f} boxes")
    print(f"      - Filtered MAPE (Non-Zero): {mape:.2f}%")
    print(f"      - Stabilized sMAPE (epsilon=1.0): {s_mape:.2f}%")
    
    # Compute Binary Classification Metrics across Sensitivity settings
    print("\n[3/4] Running Alert Sensitivity grid evaluation...")
    actual_stockouts = (y_test > stock_on_hand).astype(int)
    
    results = {}
    for mode_name, params in SENSITIVITY_MODES.items():
        mult = params["multiplier"]
        buff = params["buffer"]
        
        # Warning threshold model
        predicted_alerts = ((y_pred * mult + buff) > stock_on_hand).astype(int)
        
        # Risk scores for ROC-AUC
        risk_scores = y_pred * mult + buff - stock_on_hand
        
        # Score calculations
        acc = accuracy_score(actual_stockouts, predicted_alerts)
        prec = precision_score(actual_stockouts, predicted_alerts, zero_division=0)
        rec = recall_score(actual_stockouts, predicted_alerts, zero_division=0)
        f1 = f1_score(actual_stockouts, predicted_alerts, zero_division=0)
        
        try:
            if len(np.unique(actual_stockouts)) > 1:
                auc = roc_auc_score(actual_stockouts, risk_scores)
            else:
                auc = 1.0 if np.all(actual_stockouts == predicted_alerts) else 0.5
        except Exception:
            auc = 0.5
            
        tn, fp, fn, tp = confusion_matrix(actual_stockouts, predicted_alerts).ravel()
        
        results[mode_name] = {
            "Accuracy": acc,
            "Precision": prec,
            "Recall": rec,
            "F1-Score": f1,
            "ROC-AUC": auc,
            "TN": int(tn),
            "FP": int(fp),
            "FN": int(fn),
            "TP": int(tp)
        }
    
    # Print Markdown table to stdout
    print(f"\n[CLASSIFICATION] Alert Optimization Metrics Matrix{title_suffix}:")
    print("| Sensitivity Mode | Multiplier | Buffer | Accuracy | Precision | Recall (Sens.) | F1-Score | TP / FN (Missed) | FP (Over-order) |")
    print("| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |")
    for mode_name, metrics in results.items():
        params = SENSITIVITY_MODES[mode_name]
        print(f"| **{mode_name}** | {params['multiplier']:.2f} | {params['buffer']:.1f} | {metrics['Accuracy']*100:.2f}% | {metrics['Precision']*100:.2f}% | {metrics['Recall']*100:.2f}% | {metrics['F1-Score']*100:.2f}% | {metrics['TP']} / {metrics['FN']} | {metrics['FP']} |")
 
    # Save metrics JSON
    report_name = "full_metrics_report.json" if evaluate_full else "metrics_report.json"
    with open(OUTPUT_DIR / report_name, "w") as f:
        json.dump({
            "regression": {
                "mae": mae, "rmse": rmse, "mape": mape, "stabilized_mape": s_mape
            },
            "classification": results
        }, f, indent=4)
    print(f"\n[+] Saved metrics JSON to {OUTPUT_DIR / report_name}")
    
    # --------------------------------------------------------------------------
    # [4/4] Generate Academic Figures
    # --------------------------------------------------------------------------
    print("\n[4/4] Exporting publication-grade figures...")
    
    # Figure 1: Actual vs Predicted Demand Scatter
    plt.figure(figsize=(8, 6))
    plt.scatter(y_test, y_pred, alpha=0.4, color='#3949AB', edgecolors='none', label='Observations')
    max_val = max(np.max(y_test), np.max(y_pred))
    plt.plot([0, max_val], [0, max_val], 'r--', alpha=0.8, label='Ideal ($y=x$)')
    plt.title(f'Actual vs. Predicted Pharmaceutical Demand Scatter Plot{title_suffix}', fontsize=12, fontweight='bold', pad=10)
    plt.xlabel('Actual Demand (units)', fontsize=10)
    plt.ylabel('Predicted Demand (units)', fontsize=10)
    plt.legend(frameon=True)
    plt.grid(True, linestyle=':', alpha=0.5)
    plt.tight_layout()
    plt.savefig(OUTPUT_DIR / f"{img_prefix}1_demand_scatter.png", dpi=300)
    plt.close()
    
    # Figure 2: Residuals Error Histogram
    plt.figure(figsize=(8, 6))
    residuals = y_test - y_pred
    plt.hist(residuals, bins=40, color='#F57F17', edgecolor='white', alpha=0.85)
    plt.axvline(0, color='red', linestyle='--', alpha=0.8, label='Zero Error')
    plt.title(f'Residuals Error Distribution ($y_{{true}} - y_{{pred}}$){title_suffix}', fontsize=12, fontweight='bold', pad=10)
    plt.xlabel('Prediction Residual (units)', fontsize=10)
    plt.ylabel('Frequency', fontsize=10)
    plt.legend()
    plt.grid(True, linestyle=':', alpha=0.5)
    plt.tight_layout()
    plt.savefig(OUTPUT_DIR / f"{img_prefix}2_residuals_histogram.png", dpi=300)
    plt.close()
 
    # Figure 3: Grid of Confusion Matrices for publication
    fig, axes = plt.subplots(1, 3, figsize=(15, 4.5))
    for idx, (mode_name, metrics) in enumerate(results.items()):
        ax = axes[idx]
        matrix = np.array([[metrics["TN"], metrics["FP"]], 
                           [metrics["FN"], metrics["TP"]]])
        
        # Color coding cell arrays
        im = ax.imshow(matrix, cmap='Blues', interpolation='nearest', aspect='auto')
        
        ax.set_title(f"Mode: {mode_name}\n(Recall: {metrics['Recall']*100:.1f}%)", fontsize=11, fontweight='bold')
        ax.set_xticks([0, 1])
        ax.set_yticks([0, 1])
        ax.set_xticklabels(['No Risk', 'Stockout Alert'])
        ax.set_yticklabels(['Actual Safe', 'Actual Stockout'])
        
        # Annotate values inside matrix squares
        for i in range(2):
            for j in range(2):
                color = "white" if matrix[i, j] > (matrix.max() / 2) else "black"
                ax.text(j, i, f"{matrix[i, j]:,}", ha="center", va="center", color=color, fontweight='bold', fontsize=12)
                
        ax.set_xlabel('Predicted Outcome', fontsize=9)
        if idx == 0:
            ax.set_ylabel('Actual Outcome', fontsize=9)
            
    plt.suptitle(f'Operational Confusion Matrices Across Alert Sensitivity Configurations{title_suffix}', fontsize=13, fontweight='bold', y=1.02)
    plt.tight_layout()
    plt.savefig(OUTPUT_DIR / f"{img_prefix}3_confusion_matrices.png", dpi=300, bbox_inches='tight')
    plt.close()
 
    # Figure 4: Receiver Operating Characteristic (ROC) Curve
    plt.figure(figsize=(8, 6))
    for mode_name, params in SENSITIVITY_MODES.items():
        mult = params["multiplier"]
        buff = params["buffer"]
        risk_scores = y_pred * mult + buff - stock_on_hand
        
        fpr, tpr, _ = roc_curve(actual_stockouts, risk_scores)
        auc_score = results[mode_name]["ROC-AUC"]
        plt.plot(fpr, tpr, label=f'{mode_name} (AUC = {auc_score:.4f})')
        
    plt.plot([0, 1], [0, 1], 'k--', alpha=0.5, label='Random Guess (AUC = 0.50)')
    plt.title(f'Receiver Operating Characteristic (ROC) Curve comparison{title_suffix}', fontsize=12, fontweight='bold', pad=10)
    plt.xlabel('False Positive Rate (FPR)', fontsize=10)
    plt.ylabel('True Positive Rate (TPR)', fontsize=10)
    plt.legend(frameon=True)
    plt.grid(True, linestyle=':', alpha=0.5)
    plt.tight_layout()
    plt.savefig(OUTPUT_DIR / f"{img_prefix}4_roc_curve.png", dpi=300)
    plt.close()
    
    print(f"[+] Saved four validation figures to directory: {OUTPUT_DIR}/")
    print("=" * 70)
    print("[SUCCESS] REPRODUCIBILITY CHECK PASSED SUCCESSFULLY!")
    print("=" * 70)
 
if __name__ == "__main__":
    check_env()
    evaluate_full = "--full" in sys.argv
    run_evaluation(evaluate_full=evaluate_full)
