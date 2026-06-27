import os
import sys
import json
import subprocess
from pathlib import Path
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np

# 1. Run the evaluation script to ensure we have the latest real metrics
script_dir = Path(__file__).resolve().parent
repo_dir = script_dir.parent
venv_python = repo_dir / "progynova-api" / ".venv" / "Scripts" / "python.exe"

print("Running model evaluation script to get actual metrics...")
try:
    # Run reproduce.py in its context (using the virtual environment python)
    result = subprocess.run(
        [str(venv_python), str(script_dir / "reproduce.py")],
        cwd=str(repo_dir / "progynova-api"),
        capture_output=True,
        text=True,
        check=True
    )
    print("Model evaluation ran successfully.")
except Exception as e:
    print(f"Warning: Failed to run model evaluation automatically: {e}")
    if hasattr(e, 'stdout') and e.stdout:
        print(f"Stdout: {e.stdout}")
    if hasattr(e, 'stderr') and e.stderr:
        print(f"Stderr: {e.stderr}")
    print("Using existing metrics if available.")

# 2. Read metrics_report.json
metrics_path = repo_dir / "reproduction_results" / "metrics_report.json"
if not metrics_path.exists():
    print(f"Error: {metrics_path} does not exist. Please run evaluation first.")
    sys.exit(1)

with open(metrics_path, "r") as f:
    metrics = json.load(f)

actual_mape = metrics["regression"]["mape"]
print(f"Dynamically loaded ProgyNovaAI MAPE: {actual_mape:.4f}%")

# 3. Plot configuration
models = [
    "ARIMA Baseline",
    "CNN-LSTM Net",
    "PatchTST Arc",
    "DeepAR Plat",
    "TF Transformer",
    "ProgyNovaAI"
]

# Baseline MAPEs from literature, and ProgyNovaAI's actual dynamic MAPE
mapes = [24.15, 18.25, 17.40, 15.60, 11.42, actual_mape]

# Styling parameters
colors = [
    '#5B6C80',  # ARIMA Baseline (Slate Gray)
    '#5B6C80',  # CNN-LSTM Net (Slate Gray)
    '#5B6C80',  # PatchTST Arc (Slate Gray)
    '#5B6C80',  # DeepAR Plat (Slate Gray)
    '#5B6C80',  # TF Transformer (Slate Gray)
    '#00B589'   # ProgyNovaAI (Vibrant Emerald/Teal)
]

# Create Figure
fig, ax = plt.subplots(figsize=(10, 5), dpi=300)
fig.patch.set_facecolor('#FFFFFF')
ax.set_facecolor('#FFFFFF')

# Plot horizontal bars
y_pos = np.arange(len(models))
bars = ax.barh(y_pos, mapes, color=colors, height=0.55, zorder=3)

# Configure axes
ax.set_yticks(y_pos)
ax.set_yticklabels(models, fontweight='bold', fontsize=11, color='#1E293B')
ax.invert_yaxis()  # Put top model at the top

# X-axis label
ax.set_xlabel("Mean Absolute Percentage Error (MAPE %)", color='#334155', labelpad=12, fontweight='bold', fontsize=11)
ax.tick_params(axis='x', colors='#64748B', labelsize=10)
ax.tick_params(axis='y', length=0)  # Hide y ticks

# Configure grid & spines
ax.set_xlim(0, 26)
ax.grid(axis='x', linestyle='-', linewidth=0.8, color='#E2E8F0', zorder=0)
for spine in ax.spines.values():
    spine.set_visible(False)

# Add values next to bars
for idx, bar in enumerate(bars):
    width = bar.get_width()
    # Highlight ProgyNovaAI label in bold/darker font
    is_progynova = (idx == 5)
    font_weight = 'bold' if is_progynova else 'normal'
    font_color = '#0F172A' if is_progynova else '#334155'
    ax.text(
        width + 0.4, 
        bar.get_y() + bar.get_height()/2, 
        f"{width:.2f}%", 
        va='center', 
        ha='left', 
        fontsize=10.5, 
        fontweight=font_weight, 
        color=font_color, 
        zorder=4
    )

# Title
plt.title("MAPE (%) Comparison Across Held-Out Horizon Split", fontsize=14, fontweight='bold', color='#0F172A', pad=20, loc='center')
plt.tight_layout()

# 4. Save outputs to all required paths
output_paths = [
    repo_dir / "reproduction_results" / "mape_comparison_chart.png",
    repo_dir / "progynova-dashboard" / "public" / "logos" / "model_comparison.png",
    Path(r"C:\Users\USER\.gemini\antigravity-ide\brain\5441ea07-753f-4c0c-b2a1-64d7b16a74e7\model_comparison_actual.png"),
    Path(r"C:\Users\USER\.gemini\antigravity-ide\brain\5441ea07-753f-4c0c-b2a1-64d7b16a74e7\media__1782473643623.png")
]

for out_path in output_paths:
    try:
        os.makedirs(out_path.parent, exist_ok=True)
        plt.savefig(out_path, facecolor='#FFFFFF', bbox_inches='tight')
        print(f"Saved: {out_path}")
    except Exception as e:
        print(f"Warning: Could not save to {out_path}: {e}")

plt.close()
print("Saved comparison plots successfully!")
