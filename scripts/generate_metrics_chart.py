import os
import sys
import json
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np
from pathlib import Path

# 1. Load metrics_report.json
script_dir = Path(__file__).resolve().parent
repo_dir = script_dir.parent
metrics_path = repo_dir / "reproduction_results" / "metrics_report.json"

if not metrics_path.exists():
    print(f"Error: {metrics_path} does not exist. Please run reproduce.py first.")
    sys.exit(1)

with open(metrics_path, "r") as f:
    data = json.load(f)

classification_data = data["classification"]

# 2. Extract metrics
modes = ["Strict", "Balanced", "Clinical Safe"]
metrics = ["Accuracy", "Precision", "Recall", "F1-Score", "ROC-AUC"]

# Build matrix of scores (multiplied by 100 for percentage visualization)
scores = {mode: [] for mode in modes}
for mode in modes:
    for metric in metrics:
        val = classification_data[mode][metric]
        scores[mode].append(val * 100.0)

# 3. Create the grouped bar chart
x = np.arange(len(metrics))  # metric label locations
width = 0.24  # width of the bars

fig, ax = plt.subplots(figsize=(10, 6), dpi=300)
fig.patch.set_facecolor('#FFFFFF')
ax.set_facecolor('#FFFFFF')

# Define premium theme colors
colors = {
    "Strict": "#475569",       # Slate Gray
    "Balanced": "#2563EB",     # Classic Cobalt Blue
    "Clinical Safe": "#10B981"  # Emerald Green
}

# Plot bars
rects_strict = ax.bar(x - width, scores["Strict"], width, label='Strict Mode (Low False Alarms)', color=colors["Strict"], zorder=3)
rects_balanced = ax.bar(x, scores["Balanced"], width, label='Balanced Mode', color=colors["Balanced"], zorder=3)
rects_safe = ax.bar(x + width, scores["Clinical Safe"], width, label='Clinical Safe Mode (Max Recall)', color=colors["Clinical Safe"], zorder=3)

# Configure axes
ax.set_ylabel('Score / Percentage (%)', fontsize=11, fontweight='bold', color='#1E293B', labelpad=12)
ax.set_title('ProgyNova AI — Stockout Alert Classification Performance Matrix', fontsize=13, fontweight='bold', color='#0F172A', pad=20)
ax.set_xticks(x)
ax.set_xticklabels(metrics, fontweight='bold', fontsize=10.5, color='#1E293B')
ax.set_ylim(0, 115)  # Make room for text labels

# Soft horizontal grid and hide borders
ax.grid(axis='y', linestyle='-', linewidth=0.8, color='#E2E8F0', zorder=0)
for spine in ax.spines.values():
    spine.set_visible(False)

# Add value labels on top of the bars
def autolabel(rects):
    for rect in rects:
        height = rect.get_height()
        ax.annotate(f'{height:.1f}%',
                    xy=(rect.get_x() + rect.get_width() / 2, height),
                    xytext=(0, 4),  # 4 points vertical offset
                    textcoords="offset points",
                    ha='center', va='bottom', fontsize=8.5, fontweight='bold', color='#334155')

autolabel(rects_strict)
autolabel(rects_balanced)
autolabel(rects_safe)

# Add custom premium legend
ax.legend(loc='lower center', bbox_to_anchor=(0.5, -0.18), ncol=3, frameon=True, facecolor='#FFFFFF', edgecolor='#E2E8F0', fontsize=9.5)

plt.tight_layout()

# 4. Save outputs to all required paths
output_paths = [
    repo_dir / "reproduction_results" / "model_metrics_chart.png",
    repo_dir / "progynova-dashboard" / "public" / "logos" / "model_metrics.png",
    Path(r"C:\Users\USER\.gemini\antigravity-ide\brain\5441ea07-753f-4c0c-b2a1-64d7b16a74e7\model_metrics_actual.png")
]

for out_path in output_paths:
    try:
        os.makedirs(out_path.parent, exist_ok=True)
        plt.savefig(out_path, facecolor='#FFFFFF', bbox_inches='tight')
        print(f"Saved: {out_path}")
    except Exception as e:
        print(f"Warning: Could not save to {out_path}: {e}")

plt.close()
print("Saved model metrics chart successfully!")
