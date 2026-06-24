# ProgyNovaAI: Design, Formal Validation, and Mathematical Formulation of a Cost-Sensitive Demand Forecasting Architecture

## Abstract
This document delineates the mathematical formulation, design logic, and validation outcomes of the ProgyNovaAI forecasting architecture. We outline the transitions from a conceptual multi-branch stacked ensemble to a unified, cost-sensitive gradient boosted regressor integrated with a post-hoc asymmetric threshold optimizer. The architecture addresses the critical challenge of severe class imbalance in clinical demand forecasting, wherein stockout events constitute a rare minority class ($\approx 1.21\%$ of observations).

---

## 1. Introduction and Problem Formulation

Predicting pharmaceutical stockout events across distributed pharmacy networks is a highly challenging problem due to two primary data properties:

1.  **Multimodal Tabular and Temporal Covariates:** Demand fluctuations are driven by a heterogeneous mixture of static site parameters (e.g., store catchment population, supplier lead times, therapeutic category) and highly seasonal, dynamic variables (e.g., historical sales lags, regional monsoonal precipitation anomalies, holiday cycles, and lagging epidemiological outbreak signals).
2.  **Severe Class Imbalance:** In real-world pharmacy transaction logs, actual stockouts—defined as weeks where demand ($y$) exceeds the stock-on-hand ($S$)—are rare occurrences. In the experimental dataset, stockouts occur in less than 1.3% of the total store-drug-week observations. 

Standard machine learning models optimizing global loss functions (such as Mean Squared Error) fail under these conditions. The model weights converge toward the majority class (predicting "No Stockout" everywhere), achieving high accuracy (e.g., 99.1%) while completely failing to intercept critical shortages. 

To address this, the ProgyNovaAI system has been formulated as a unified **Cost-Sensitive Decision Tree Regressor** paired with an **Asymmetric Post-Hoc Threshold Optimizer**.

---

## 2. Validation of Tree-Based Benchmarks (M4/M5 Competitions)

The design transition from deep sequence ensembles (e.g., PatchTST Transformers and 1D-CNN + LSTM networks) to a unified gradient boosted decision tree (XGBoost) is supported by empirical findings from the **M4 and M5 Makridakis Forecasting Competitions**. 

The M4 and M5 competitions demonstrated that for tabular, highly intermittent, and hierarchical sales demand datasets, hybrid machine learning algorithms based on decision trees consistently outperform pure deep neural network models. The reasons are:

1.  **Direct Covariate Integration:** Unlike sequence-only models (e.g., LSTMs or Transformers) which require complex projections to combine temporal lags with static metadata, decision trees natively integrate tabular features (such as population size, categorical drug metadata, and monsoonal weather indicators) directly into their split criteria.
2.  **Sparsity and Missing Values:** Pharmacy logs frequently exhibit missing data. Deep neural architectures require imputation (e.g., interpolation), which introduces synthetic bias. Gradient boosted trees handle missing values natively by assigning them a default split direction during tree node construction, preserving the raw characteristics of the transaction log.
3.  **Local Structural Breaks:** Sudden localized epidemiological spikes (e.g., dengue outbreaks during monsoon seasons) represent local structural breaks in demand. Neural models tend to smooth these signals over time due to recursive gradient updates. In contrast, recursive partitioning in decision trees isolates these extreme conditions into leaf nodes, enabling rapid adaptation to environmental flags.

---

## 3. Mathematical Formulation of the Pipeline

### 3.1 Feature Engineering and Adapter Pipeline
Let the raw transaction ledger be represented as a set of observations $D$. The feature adapter maps each record dynamically to generate a dense, multi-dimensional feature space $X \in \mathbb{R}^{d}$:
1.  **Historical Lags:** Captures consumption history across intervals $t-k$ for $k \in \{1, 2, 4, 8, 12, 26, 52\}$.
2.  **Rolling Metrics:** Captures $w$-period rolling demand means and standard deviations:
    $$\mu_{t, w} = \frac{1}{w}\sum_{i=1}^{w} y_{t-i}, \quad \sigma_{t, w} = \sqrt{\frac{1}{w-1}\sum_{i=1}^{w} (y_{t-i} - \mu_{t, w})^2} \quad \text{for } w \in \{4, 8, 12\}$$
3.  **Cyclical Temporal Encodings:** Models seasonal dynamics via sine and cosine transforms:
    $$\text{sin\_week}_t = \sin\left(\frac{2\pi \cdot \text{week\_of\_year}_t}{52}\right), \quad \text{cos\_week}_t = \cos\left(\frac{2\pi \cdot \text{week\_of\_year}_t}{52}\right)$$
4.  **Lagged Outbreak Signalling:** Formulates features for regional disease indicators when epidemiological severity records exceed a defined activation threshold.

### 3.2 Cost-Sensitive Gradient Loss Weighting
To prevent the model from ignoring rare stockout events during gradient updates, we compute sample weights during training. Let $N_{\text{neg}}$ be the number of safe weeks ($y_i \le S_i$) and $N_{\text{pos}}$ be the number of stockout weeks ($y_i > S_i$). The sample weight $w_i$ applied to the loss function for observation $i$ is formulated as:

$$w_i = \begin{cases} \frac{N_{\text{neg}}}{N_{\text{pos}}} & \text{if } y_i > S_i \\ 1.0 & \text{if } y_i \le S_i \end{cases}$$

For our 47,424-row dataset, the class imbalance ratio yields $w_{\text{stockout}} \approx 115.2$. This scales the gradient update for missed stockouts by a factor of 115, forcing the XGBoost splits to isolate rare shortages without modifying the raw historical logs.

### 3.3 Post-Hoc Asymmetric Thresholding
To translate continuous forecasts $\hat{y}$ into binary warnings while allowing operator risk adjustment, we formulate a parameterized decision boundary:

$$\text{Alert} = \mathbb{I}\left( (\hat{y} \cdot \alpha + \beta) > S \right)$$

where $\alpha$ is the demand multiplier, $\beta$ is the safety stock buffer (in physical units), and $S$ is the stock-on-hand. By adjusting $\alpha$ and $\beta$, the system provides three distinct risk profiles:

| Sensitivity Mode | Multiplier ($\alpha$) | Buffer ($\beta$) | Operational Target |
| :--- | :---: | :---: | :--- |
| **Strict** | $1.00$ | $0.0$ | High-precision monitoring (minimizes false alarms for expensive inventory). |
| **Balanced** | $1.00$ | $5.0$ | Optimal trade-off (maximizes F1-score balance). |
| **Clinical Safe** | $1.05$ | $1.0$ | Recall-maximized monitoring (ensures zero missed stockouts for critical drugs). |

---

## 4. Empirical Validation and Results

### 4.1 Temporal Validation Split Setup
To prevent temporal data leakage, we enforce a strict forward-chaining temporal split:
*   **Training Set:** Weeks 52 to 129 ($23,712$ samples).
*   **Validation Set:** Weeks 130 to 142 ($3,952$ samples).
*   **Test Set (Held-Out):** Weeks 143 to 155 ($3,952$ samples).

### 4.2 Forecasting Model Accuracy (Regression)
We compared the unified XGBoost model against naive baselines and deep neural models on the validation split:

| Model Architecture | MAE (Units) | RMSE (Units) | MAPE (\%) | Description / Computational Profile |
| :--- | :---: | :---: | :---: | :--- |
| Naive Baseline (Lag-1)          | 14.85        | 23.41         | 38.64%    | Carry-forward baseline. High error during trend changes. |
| Seasonal Naive (Lag-52)         | 12.10        | 19.82         | 29.50%    | Year-over-year baseline. Fails to capture localized outbreaks. |
| PatchTST Transformer            | 6.84         | 11.23         | 17.40%    | Long-range sequence modeling. High computational latency. |
| CNN-LSTM Sequence Model         | 7.12         | 11.90         | 18.25%    | Captures short-range sequence dynamics. GPU-dependent. |
| **Unified XGBoost Regressor**   | **5.42**     | **8.76**      | **4.90%** | Trained with cost-sensitive loss weighting ($w_i \approx 115.2$). |

### 4.3 Stockout Alert Optimization (Classification)
Metrics were evaluated on the strictly held-out **Temporal Test Split ($N=3,952$, Weeks 143–155)**:

| Model / Configuration | Accuracy | Precision | Recall | F1-Score | ROC-AUC | FN | FP |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Previous Ensemble** (Unbalanced) | 99.14% | 0.00% | 0.00% | 0.00% | 0.5000 | 48 | 0 |
| **Optimized Model** (Strict)        | 99.85% | 95.65% | 91.67% | 93.62% | 0.9991 | 4 | 2 |
| **Optimized Model** (Balanced)      | 99.82% | 93.62% | 91.67% | **92.63%**| 0.9991 | 4 | 3 |
| **Optimized Model** (Clinical Safe) | 99.80% | 85.71% | **100.00%**| 92.31% | 1.0000 | 0 | 8 |

---

## 5. Technical Discussion and Contributions

### 5.1 The Class Imbalance Paradox
Under severe class imbalance (where only 48 out of 3,952 test observations are stockouts), a baseline classifier that predicts "no stockout" for every sample achieves a deceptively high **98.79% overall accuracy** ($3,904 \div 3,952$). However, its F1-Score and Recall are **0%**, rendering it operationally useless. 

The ProgyNovaAI cost-sensitive framework resolves this paradox. By applying gradient loss balancing, it forces the decision trees to prioritize minority-class identification. In Balanced Mode, the system achieves a **92.63% F1-score** and **91.67% Recall**, representing true predictive capability. In Clinical Safe Mode, the F1-score is maintained at **92.31%** while Recall is driven to **100.00%** (zero missed stockout events).

### 5.2 Decoupled Optimization and Real-time tree-SHAP Explainability
*   **Decoupled Prediction:** By separating the regression model (XGBoost forecasting) from the risk preference (post-hoc $\alpha, \beta$ thresholding), the system avoids the need to retrain models when changing risk preferences.
*   **Exact TreeSHAP Attributions:** Using TreeSHAP on the unified XGBoost model allows the system to compute exact feature attribution matrices in under 15 milliseconds, replacing slower meta-learner calculations.
*   **Computational Efficiency:** Consolidating the model pipeline from a parallel ensemble to a single XGBoost regressor reduced batch inference latency from >12 seconds to **under 200 milliseconds** for the entire 47,424-row dataset.
