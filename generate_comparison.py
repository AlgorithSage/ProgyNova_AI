import os
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np

# Data
models = ["Transformer", "LSTM", "CNN-LSTM", "XGBoost"]
mapes = [17.40, 19.10, 18.25, 4.90]
colors = ['#4F46E5', '#7C3AED', '#2563EB', '#10B981'] # Premium theme colors

# Create figure
fig, ax = plt.subplots(figsize=(8, 4), dpi=300)
fig.patch.set_facecolor('#FFFFFF')
ax.set_facecolor('#FFFFFF')

# Plot horizontal bars
y_pos = np.arange(len(models))
bars = ax.barh(y_pos, mapes, color=colors, height=0.5, zorder=3)

# Configure axes
ax.set_yticks(y_pos)
ax.set_yticklabels(models, fontweight='bold', color='#1E293B')
ax.invert_yaxis()
ax.set_xlabel("Mean Absolute Percentage Error (MAPE %)", color='#475569', labelpad=10, fontweight='bold')
ax.tick_params(colors='#475569', labelsize=10)
ax.tick_params(axis='y', length=0)

# Soft grid and hide borders
ax.grid(axis='x', linestyle='-', linewidth=1.0, color='#F1F5F9', zorder=0)
for spine in ax.spines.values():
    spine.set_visible(False)

# Add values next to bars
for bar in bars:
    width = bar.get_width()
    ax.text(width + 0.5, bar.get_y() + bar.get_height()/2, f"{width:.2f}%", 
            va='center', ha='left', fontsize=10, fontweight='bold', color='#0F172A', zorder=4)

plt.title("ProgyNova AI — Forecasting Model Comparison", fontsize=13, fontweight='bold', color='#0F172A', pad=15)
plt.tight_layout()

# Save outputs
os.makedirs("progynova-dashboard/public/logos", exist_ok=True)
plt.savefig("progynova-dashboard/public/logos/model_comparison.png", facecolor='#FFFFFF', bbox_inches='tight')

brain_path = r"C:\Users\USER\.gemini\antigravity-ide\brain\6645aced-12b5-44c7-9461-e7a86f6d6734\model_comparison_actual.png"
plt.savefig(brain_path, facecolor='#FFFFFF', bbox_inches='tight')

plt.close()
print("Saved simple comparison plot successfully!")
