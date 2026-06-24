import os
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np

# Set styling for light mode dashboard layout
fig, ax = plt.subplots(figsize=(10, 5), dpi=300)
fig.patch.set_facecolor('#FFFFFF')
ax.set_facecolor('#FFFFFF')

# Actual performance results (MAPE % - lower is better)
models = ["Transformer", "LSTM", "CNN-LSTM", "XGBoost"]
mapes = [17.40, 19.10, 18.25, 4.90]
statuses = ["Tested", "Tested", "Tested", "Best Performing"]

# Modern UI dashboard colors (representing each model class)
colors = ['#3B82F6', '#6366F1', '#10B981', '#EA580C'] # Blue, Indigo, Emerald, Deep Orange

# Plot horizontal bars
y_pos = np.arange(len(models))
bars = ax.barh(y_pos, mapes, color=colors, height=0.45, edgecolor='none', alpha=0.95, zorder=3)

# Customize axes and labels
ax.set_yticks(y_pos)
ax.set_yticklabels(models, fontsize=12, fontweight='bold', color='#0F172A')
ax.invert_yaxis()  # Top-down ordering
ax.set_xlabel("Mean Absolute Percentage Error (MAPE %)", fontsize=11, color='#475569', labelpad=12, fontweight='bold')
ax.tick_params(axis='x', colors='#475569', labelsize=10)
ax.tick_params(axis='y', colors='#0F172A', labelsize=12, length=0)

# Configure soft horizontal grid lines
ax.grid(axis='x', linestyle=':', alpha=0.5, color='#CBD5E1', zorder=0)
for spine in ['top', 'right', 'left', 'bottom']:
    ax.spines[spine].set_visible(False)

# Add value readouts and status badges
for i, (bar, mape, status) in enumerate(zip(bars, mapes, statuses)):
    width = bar.get_width()
    
    # Text label for the actual MAPE score
    ax.text(width + 0.6, bar.get_y() + bar.get_height()/2, f"{mape:.2f}%", 
            va='center', ha='left', fontsize=11, fontweight='bold', color='#1E293B')
    
    # Setup badge style
    if status == "Best Performing":
        badge_color = '#FFEDD5'
        badge_text_color = '#C2410C'
        badge_label = f"★ {status}"
    else:
        badge_color = '#F1F5F9'
        badge_text_color = '#475569'
        badge_label = status
        
    # Draw badge box
    ax.text(23.5, bar.get_y() + bar.get_height()/2, badge_label,
            va='center', ha='center', fontsize=9.5, fontweight='bold',
            color=badge_text_color,
            bbox=dict(boxstyle='round,pad=0.4', facecolor=badge_color, edgecolor='none'))

# Title and subtitle headers
plt.title("ProgyNova AI — Forecasting Model Comparison", fontsize=15, fontweight='bold', color='#0F172A', pad=22, loc='left')

# Subtitle explanation
ax.text(0, -0.62, "Benchmarking continuous demand forecasting accuracy across architectures (lower MAPE is better)", 
        fontsize=10, color='#475569', transform=ax.get_xaxis_transform())

# Ensure clean directory exists and save
os.makedirs("progynova-dashboard/public/logos", exist_ok=True)
output_path = "progynova-dashboard/public/logos/model_comparison.png"
plt.tight_layout()
plt.savefig(output_path, facecolor='#FFFFFF', edgecolor='none', bbox_inches='tight')

# Save light mode version to brain directory for the walkthrough as well
brain_output_path = r"C:\Users\USER\.gemini\antigravity-ide\brain\6645aced-12b5-44c7-9461-e7a86f6d6734\model_comparison_actual.png"
plt.savefig(brain_output_path, facecolor='#FFFFFF', edgecolor='none', bbox_inches='tight')

plt.close()

print(f"Saved light mode comparison graphic to {output_path} and {brain_output_path} successfully!")

