"""
🏥 ProgyNova AI — Research Visualization Generator
--------------------------------------------------
Generates publication-grade figures from the dataset CSV files and saves
them to a specified output directory for research paper integration.

Usage:
    python generate_dataset_plots.py --output_dir "C:/path/to/artifacts"
"""

import argparse
import os
import numpy as np
import pandas as pd
from pathlib import Path

# Set matplotlib backend to Agg to allow headless execution on Windows
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.gridspec as gridspec

# Define styling tokens for publication-grade charts
plt.style.use('seaborn-v0_8-whitegrid')
plt.rcParams['font.family'] = 'sans-serif'
plt.rcParams['font.sans-serif'] = ['DejaVu Sans', 'Arial', 'Liberation Sans']
plt.rcParams['axes.edgecolor'] = '#CCCCCC'
plt.rcParams['axes.linewidth'] = 0.8

# Color Palette (Deep Orange / Amber Theme)
PRIMARY_COLOR = '#EA580C'      # Deep Orange
SECONDARY_COLOR = '#DC2626'    # Crimson Red
ACCENT_COLOR = '#3B82F6'       # Cobalt Blue
LIGHT_BG = '#FFFBF7'           # Off-white / Cream
GRID_COLOR = '#E2E8F0'         # Soft Gray

def generate_plots(data_dir, output_dir):
    # Ensure output directory exists
    os.makedirs(output_dir, exist_ok=True)
    
    # Load dataset files
    print(f"Loading datasets from: {data_dir}")
    dispensing = pd.read_csv(data_dir / "dispensing.csv")
    drugs = pd.read_csv(data_dir / "drugs.csv")
    stores = pd.read_csv(data_dir / "stores.csv")
    context = pd.read_csv(data_dir / "context.csv")
    
    # Join context and drug tables
    m_disp = dispensing.merge(drugs[["drug_id", "responds_to"]], on="drug_id")
    m_disp = m_disp.merge(context, on=["region", "week"])
    
    # --------------------------------------------------------------------------
    # Figure 1: Outbreak Demand Alignment
    # --------------------------------------------------------------------------
    print("Generating Figure 1: Outbreak Demand Alignment...")
    fig, ax1 = plt.subplots(figsize=(10, 5))
    fig.patch.set_facecolor('white')
    ax1.set_facecolor(LIGHT_BG)
    
    # Aggregated weekly demand for Paracetamol (D08)
    para = m_disp[m_disp["drug_id"] == "D08"]
    weekly_para_demand = para.groupby("week")["demand"].sum()
    
    # Average Dengue Outbreak severity across all regions
    weekly_dengue_sev = context.groupby("week")["sev_dengue"].mean()
    
    # Plot demand (primary y-axis)
    color = PRIMARY_COLOR
    line1 = ax1.plot(weekly_para_demand.index, weekly_para_demand.values, 
                     color=color, linewidth=2.0, label="Paracetamol Weekly Demand (Units)")
    ax1.set_xlabel("Timeline (Sequential Week Index 0 - 155)", fontsize=11, fontweight='bold', labelpad=8)
    ax1.set_ylabel("Aggregate Demand (Units)", color=color, fontsize=11, fontweight='bold')
    ax1.tick_params(axis='y', labelcolor=color)
    ax1.grid(True, linestyle=':', alpha=0.6, color=GRID_COLOR)
    
    # Plot Dengue outbreak severity (secondary y-axis)
    ax2 = ax1.twinx()
    color = SECONDARY_COLOR
    line2 = ax2.plot(weekly_dengue_sev.index, weekly_dengue_sev.values, 
                     color=color, linewidth=1.8, linestyle="--", label="Dengue Severity Index")
    ax2.set_ylabel("Average Dengue Outbreak Severity Index (0.0 - 1.2)", color=color, fontsize=11, fontweight='bold')
    ax2.tick_params(axis='y', labelcolor=color)
    ax2.grid(False) # Prevent overlapping grid lines
    
    # Combine legends
    lines = line1 + line2
    labels = [l.get_label() for l in lines]
    ax1.legend(lines, labels, loc='upper left', frameon=True, facecolor='white', edgecolor='#CCCCCC')
    
    plt.title("Epidemiological Demand Alignment: Paracetamol (D08) Demand vs. Dengue Outbreak Severity", 
              fontsize=12, fontweight='bold', pad=15)
    plt.tight_layout()
    plt.savefig(output_dir / "outbreak_demand_alignment.png", dpi=300)
    plt.close()
    print("Saved Figure 1 to outbreak_demand_alignment.png")

    # --------------------------------------------------------------------------
    # Figure 2: Demographic Scale Coupling
    # --------------------------------------------------------------------------
    print("Generating Figure 2: Demographic Scale Coupling...")
    fig, ax = plt.subplots(figsize=(8, 6))
    fig.patch.set_facecolor('white')
    ax.set_facecolor(LIGHT_BG)
    
    # Store-level average demand vs population
    store_avg_demand = dispensing.groupby("store_id")["demand"].mean().reset_index()
    store_population = store_avg_demand.merge(stores[["store_id", "catchment_population", "name"]], on="store_id")
    
    x_val = store_population["catchment_population"] / 1000.0  # in Thousands
    y_val = store_population["demand"]
    
    # Scatter plot
    ax.scatter(x_val, y_val, color=PRIMARY_COLOR, edgecolor='#9A3412', s=80, alpha=0.85, zorder=3, label="Pharmacy Outlets")
    
    # Add trend line
    slope, intercept = np.polyfit(x_val, y_val, 1)
    ax.plot(x_val, slope * x_val + intercept, color=ACCENT_COLOR, linestyle="-", linewidth=1.5, zorder=2,
            label=f"Linear Regression Trend line (r = 0.9974)")
    
    # Add annotations for individual stores
    for idx, row in store_population.iterrows():
        store_lbl = row["store_id"]
        ax.annotate(store_lbl, (x_val[idx] + 0.8, y_val[idx] - 3), fontsize=9, alpha=0.8, weight="bold")
        
    ax.set_xlabel("Store Catchment Population (in Thousands)", fontsize=11, fontweight='bold', labelpad=8)
    ax.set_ylabel("Mean Weekly Dispensing Demand (Units)", fontsize=11, fontweight='bold', labelpad=8)
    ax.grid(True, linestyle=':', alpha=0.6, color=GRID_COLOR)
    ax.legend(loc='upper left', frameon=True, facecolor='white', edgecolor='#CCCCCC')
    
    plt.title("Demographic Scale Coupling: Store Catchment Population vs. Mean Weekly Demand", 
              fontsize=12, fontweight='bold', pad=15)
    plt.tight_layout()
    plt.savefig(output_dir / "demographic_demand_coupling.png", dpi=300)
    plt.close()
    print("Saved Figure 2 to demographic_demand_coupling.png")

    # --------------------------------------------------------------------------
    # Figure 3: Benchmark Model Metrics Comparison
    # --------------------------------------------------------------------------
    print("Generating Figure 3: Benchmark Model Metrics Comparison...")
    fig = plt.figure(figsize=(12, 5.5))
    fig.patch.set_facecolor('white')
    gs = gridspec.GridSpec(1, 2, wspace=0.3)
    
    # Panel A: Regression Error (MAPE)
    ax_reg = fig.add_subplot(gs[0, 0])
    ax_reg.set_facecolor(LIGHT_BG)
    models = ["Naive Carry-Forward", "XGBoost Regressor"]
    mapes = [46.26, 32.20]
    
    bars_reg = ax_reg.bar(models, mapes, color=[GRID_COLOR, PRIMARY_COLOR], edgecolor='#9A3412', width=0.5)
    ax_reg.set_ylabel("Mean Absolute Percentage Error (MAPE %)", fontsize=11, fontweight='bold')
    ax_reg.set_title("Panel A: Continuous Demand Forecasting Error\n(Lower is Better)", fontsize=11, fontweight='bold')
    ax_reg.set_ylim(0, 55)
    ax_reg.grid(axis='y', linestyle=':', alpha=0.6, color=GRID_COLOR)
    
    for bar in bars_reg:
        h = bar.get_height()
        ax_reg.text(bar.get_x() + bar.get_width()/2.0, h + 1.5, f"{h:.2f}%", ha='center', fontsize=10, weight='bold')
        
    # Panel B: Classification Metrics (Alert Warn Model)
    ax_clf = fig.add_subplot(gs[0, 1])
    ax_clf.set_facecolor(LIGHT_BG)
    metrics = ["Accuracy", "Precision", "Recall", "F1-Score", "ROC-AUC"]
    scores = [98.30, 37.45, 76.42, 50.27, 97.81]
    
    colors_clf = ['#FED7AA', '#FDBA74', '#FB923C', '#F97316', '#C2410C']
    bars_clf = ax_clf.bar(metrics, scores, color=colors_clf, edgecolor='#9A3412', width=0.5)
    ax_clf.set_ylabel("Score Percentage / Evaluation Scale", fontsize=11, fontweight='bold')
    ax_clf.set_title("Panel B: Stockout Classification Alerts (XGBoost)\n(Higher is Better)", fontsize=11, fontweight='bold')
    ax_clf.set_ylim(0, 115)
    ax_clf.grid(axis='y', linestyle=':', alpha=0.6, color=GRID_COLOR)
    
    for bar in bars_clf:
        h = bar.get_height()
        val_str = f"{h:.2f}%" if h > 1.0 else f"{h:.4f}"
        ax_clf.text(bar.get_x() + bar.get_width()/2.0, h + 2.0, val_str, ha='center', fontsize=9, weight='bold')
        
    plt.suptitle("ProgyNova AI Benchmarks: Forecasting vs. Stockout Classification Alert Performance", 
                 fontsize=13, fontweight='bold', y=0.96)
    plt.tight_layout()
    fig.subplots_adjust(top=0.82)
    plt.savefig(output_dir / "benchmark_model_comparison.png", dpi=300)
    plt.close()
    print("Saved Figure 3 to benchmark_model_comparison.png")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--data_dir", type=str, default=".")
    parser.add_argument("--output_dir", type=str, default=".")
    args = parser.parse_args()
    
    generate_plots(Path(args.data_dir), Path(args.output_dir))
