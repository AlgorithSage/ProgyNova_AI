import os
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.patches as patches
import numpy as np

# Set styling for light mode dashboard layout
fig, ax = plt.subplots(figsize=(10, 5.2), dpi=300)
fig.patch.set_facecolor('#FFFFFF')
ax.set_facecolor('#FFFFFF')

# Actual performance results (MAPE % - lower is better)
models = ["Transformer", "LSTM", "CNN-LSTM", "XGBoost"]
mapes = [17.40, 19.10, 18.25, 4.90]
statuses = ["Tested", "Tested", "Tested", "Best Performing"]

# Modern UI dashboard colors (representing each model class)
# Deep Slate Blue, Purple, Soft Blue, Emerald Green
colors = ['#4F46E5', '#7C3AED', '#2563EB', '#10B981'] 

# Plot horizontal bars
y_pos = np.arange(len(models))
height = 0.42
rounding_size = 0.18  # rounding size for corners

# Customize axes and labels
ax.set_yticks(y_pos)
ax.set_yticklabels(models, fontsize=12, fontweight='bold', color='#1E293B')
ax.invert_yaxis()  # Top-down ordering
ax.set_xlabel("Mean Absolute Percentage Error (MAPE %)", fontsize=11, color='#475569', labelpad=12, fontweight='bold')
ax.tick_params(axis='x', colors='#475569', labelsize=10)
ax.tick_params(axis='y', colors='#1E293B', labelsize=12, length=0)

# Configure soft horizontal grid lines
ax.grid(axis='x', linestyle='-', linewidth=1.2, color='#F1F5F9', zorder=0)
for spine in ['top', 'right', 'left', 'bottom']:
    ax.spines[spine].set_visible(False)

# Draw custom rounded bars
for i, (mape, color, status) in enumerate(zip(mapes, colors, statuses)):
    y = y_pos[i] - height / 2
    
    # 1. Main rounded box (rounds all 4 corners)
    rounded_box = patches.FancyBboxPatch(
        (0, y), mape, height,
        boxstyle=f"round,pad=0,rounding_size={rounding_size}",
        facecolor=color, edgecolor='none', zorder=3, alpha=0.95
    )
    ax.add_patch(rounded_box)
    
    # 2. Cover left rounded corners to make them flat
    flat_rect = patches.Rectangle(
        (0, y), mape - rounding_size, height,
        facecolor=color, edgecolor='none', zorder=3, alpha=0.95
    )
    ax.add_patch(flat_rect)

    # 3. Add text label for the actual MAPE score
    ax.text(mape + 0.6, y_pos[i], f"{mape:.2f}%", 
            va='center', ha='left', fontsize=11, fontweight='bold', color='#0F172A', zorder=4)
    
    # Setup badge style
    if status == "Best Performing":
        badge_color = '#D1FAE5'  # Soft emerald
        badge_text_color = '#065F46'
        badge_label = "★ Best Core Engine"
    else:
        badge_color = '#F3F4F6'  # Soft grey
        badge_text_color = '#475569'
        badge_label = "Alternative Model"
        
    # Draw badge box
    ax.text(23.8, y_pos[i], badge_label,
            va='center', ha='center', fontsize=9.5, fontweight='bold',
            color=badge_text_color,
            bbox=dict(boxstyle='round,pad=0.4', facecolor=badge_color, edgecolor='none'),
            zorder=4)

# Set x limits to give space for labels
ax.set_xlim(0, 27.5)

# Title and subtitle headers
plt.title("ProgyNova AI — Forecasting Model Comparison", fontsize=15, fontweight='bold', color='#0F172A', pad=24, loc='left')

# Subtitle explanation
ax.text(0, -0.65, "Benchmarking continuous demand forecasting accuracy across architectures (lower MAPE is better)", 
        fontsize=10, color='#475569', transform=ax.get_xaxis_transform())

# Ensure clean directory exists and save
os.makedirs("progynova-dashboard/public/logos", exist_ok=True)
output_path = "progynova-dashboard/public/logos/model_comparison.png"
plt.tight_layout()
plt.savefig(output_path, facecolor='#FFFFFF', edgecolor='none', bbox_inches='tight')

# Save version to brain directory for the walkthrough
brain_output_path = r"C:\Users\USER\.gemini\antigravity-ide\brain\6645aced-12b5-44c7-9461-e7a86f6d6734\model_comparison_actual.png"
plt.savefig(brain_output_path, facecolor='#FFFFFF', edgecolor='none', bbox_inches='tight')

plt.close()

print(f"Saved actual comparison graphic to {output_path} and {brain_output_path} successfully!")


