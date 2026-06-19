import numpy as np
import pandas as pd
import re

def extract_digit_or_hash(val: str) -> int:
    """Extract any digit sequence from ID, or return deterministic hash modulo 1000."""
    digits = re.findall(r'\d+', val)
    if digits:
        return int("".join(digits))
    return abs(hash(val)) % 1000

def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    """Run full feature engineering pipeline on standardized variables and map to model inputs."""
    group_keys = ["location_id", "entity_id"]
    df = df.sort_values(group_keys + ["time_index"]).reset_index(drop=True)
    
    # 1. Historical Lag features
    for lag in [1, 2, 4, 8, 12, 26]:
        df[f"target_lag_{lag}"] = df.groupby(group_keys)["target"].shift(lag)
    df["target_lag_52"] = df.groupby(group_keys)["target"].shift(52)
        
    # 2. Rolling averages & std deviations
    for w in [4, 8, 12]:
        df[f"target_roll_mean_{w}"] = (
            df.groupby(group_keys)["target"]
              .transform(lambda x: x.shift(1).rolling(window=w, min_periods=1).mean())
        )
        df[f"target_roll_std_{w}"] = (
            df.groupby(group_keys)["target"]
              .transform(lambda x: x.shift(1).rolling(window=w, min_periods=2).std())
        )
    for c in [c for c in df.columns if "roll_std" in c]:
        df[c] = df[c].fillna(0.0)
        
    # 3. Calendar attributes
    t_col = df["time_index"]
    if pd.api.types.is_datetime64_any_dtype(t_col):
        d_max, d_min = t_col.max(), t_col.min()
        days_delta = (d_max - d_min).days
        cycle_len = 52 if (days_delta < 500) else 365
        df["sin_time"] = np.sin(2 * np.pi * t_col.dt.dayofyear / cycle_len)
        df["cos_time"] = np.cos(2 * np.pi * t_col.dt.dayofyear / cycle_len)
        df["month"] = t_col.dt.month
        df["week_of_year"] = t_col.dt.isocalendar().week.astype(int)
    else:
        df["sin_time"] = np.sin(2 * np.pi * t_col / 52.0)
        df["cos_time"] = np.cos(2 * np.pi * t_col / 52.0)
        df["month"] = ((t_col - 1) // 4.33).astype(int).clip(0, 11) + 1
        df["week_of_year"] = (t_col % 52) + 1
        
    # 4. Momentum metrics
    df["target_wow_change"] = df.groupby(group_keys)["target"].diff(1).fillna(0.0)
    df["target_momentum_4wk"] = (
        df["target_roll_mean_4"] / df.groupby(group_keys)["target_roll_mean_4"].shift(4).fillna(1.0)
    ).fillna(1.0)
    
    # 5. Prescriptive order logic
    demand_rate = df["target_roll_mean_4"].replace(0, 1.0)
    df["days_of_cover"] = (df["stock_on_hand"] / demand_rate * 7.0).replace([np.inf, -np.inf], 999.0).fillna(0.0).round(1)
    lead_days = df["lead_time"] * 7.0
    df["reorder_urgent"] = (df["days_of_cover"] < (lead_days + 7.0)).astype(int)
    
    TARGET_COVER_WEEKS = 4
    SAFETY_MULTIPLIER = 1.2
    target_inventory_buffer = df["target_roll_mean_4"] * TARGET_COVER_WEEKS * SAFETY_MULTIPLIER
    df["recommended_order_qty"] = np.clip(target_inventory_buffer - df["stock_on_hand"], 0, None).fillna(0.0).round(0).astype(int)
    
    # 6. Infinite and NaN backstop cleaning
    df = df.replace([np.inf, -np.inf], np.nan)
    base_numeric_features = [c for c in df.select_dtypes(include=[np.number]).columns if c not in ["stockout"]]
    for col in base_numeric_features:
        if "momentum" in col:
            df[col] = df[col].fillna(1.0)
        else:
            df[col] = df[col].fillna(0.0)
    df[base_numeric_features] = np.clip(df[base_numeric_features], -1e6, 1e6)
    
    df_clean = df.fillna(0.0).copy()
    
    # Drop first year with incomplete lag references to avoid NaN model error if we have enough data
    unique_weeks = df_clean["time_index"].nunique()
    if unique_weeks >= 53:
        df_clean = df_clean.dropna(subset=["target_lag_52"]).copy()
    
    # ---- 7. Model Feature Signature Adapter Mapping (56 features) ----
    model_df = pd.DataFrame(index=df_clean.index)
    
    mapping = {
        'catchment_population': 50000.0,
        'supplier_lead_time_weeks': df_clean['lead_time'],
        'baseline_weekly_demand': df_clean['target_roll_mean_12'],
        'shelf_life_weeks': 104.0,
        'week_of_year': df_clean['week_of_year'],
        'rainfall_anomaly': 0.0,
        'festival_intensity': 0.0,
        'demand_lag_1': df_clean['target_lag_1'],
        'demand_lag_2': df_clean['target_lag_2'],
        'demand_lag_4': df_clean['target_lag_4'],
        'demand_lag_8': df_clean['target_lag_8'],
        'demand_lag_12': df_clean['target_lag_12'],
        'demand_lag_26': df_clean['target_lag_26'],
        'demand_lag_52': df_clean['target_lag_52'],
        'demand_roll_mean_4': df_clean['target_roll_mean_4'],
        'demand_roll_std_4': df_clean['target_roll_std_4'],
        'demand_roll_mean_8': df_clean['target_roll_mean_8'],
        'demand_roll_std_8': df_clean['target_roll_std_8'],
        'demand_roll_mean_12': df_clean['target_roll_mean_12'],
        'demand_roll_std_12': df_clean['target_roll_std_12'],
        'sin_week': df_clean['sin_time'],
        'cos_week': df_clean['cos_time'],
        'month': df_clean['month'],
        'outbreak_chikungunya_lag0': 0.0,
        'outbreak_chikungunya_lag1': 0.0,
        'outbreak_chikungunya_lag2': 0.0,
        'outbreak_dengue_lag0': 0.0,
        'outbreak_dengue_lag1': 0.0,
        'outbreak_dengue_lag2': 0.0,
        'outbreak_diarrhoeal_lag0': 0.0,
        'outbreak_diarrhoeal_lag1': 0.0,
        'outbreak_diarrhoeal_lag2': 0.0,
        'outbreak_flu_lag0': 0.0,
        'outbreak_flu_lag1': 0.0,
        'outbreak_flu_lag2': 0.0,
        'outbreak_leptospirosis_lag0': 0.0,
        'outbreak_leptospirosis_lag1': 0.0,
        'outbreak_leptospirosis_lag2': 0.0,
        'outbreak_malaria_lag0': 0.0,
        'outbreak_malaria_lag1': 0.0,
        'outbreak_malaria_lag2': 0.0,
        'outbreak_respiratory_lag0': 0.0,
        'outbreak_respiratory_lag1': 0.0,
        'outbreak_respiratory_lag2': 0.0,
        'outbreak_typhoid_lag0': 0.0,
        'outbreak_typhoid_lag1': 0.0,
        'outbreak_typhoid_lag2': 0.0,
        'outbreak_any_active': 0.0,
        'outbreak_count': 0.0,
        'monsoon_phase_enc': 0.0,
        'region_enc': df_clean.get('region_enc', 0.0),
        'category_enc': df_clean.get('category_enc', 0.0),
        'drug_enc': df_clean['entity_id'].apply(extract_digit_or_hash),
        'store_enc': df_clean['location_id'].apply(extract_digit_or_hash),
        'demand_wow_change': df_clean['target_wow_change'],
        'demand_momentum_4wk': df_clean['target_momentum_4wk']
    }
    
    model_feature_cols = [
        'catchment_population', 'supplier_lead_time_weeks', 'baseline_weekly_demand', 'shelf_life_weeks',
        'week_of_year', 'rainfall_anomaly', 'festival_intensity', 'demand_lag_1', 'demand_lag_2',
        'demand_lag_4', 'demand_lag_8', 'demand_lag_12', 'demand_lag_26', 'demand_lag_52',
        'demand_roll_mean_4', 'demand_roll_std_4', 'demand_roll_mean_8', 'demand_roll_std_8',
        'demand_roll_mean_12', 'demand_roll_std_12', 'sin_week', 'cos_week', 'month',
        'outbreak_chikungunya_lag0', 'outbreak_chikungunya_lag1', 'outbreak_chikungunya_lag2',
        'outbreak_dengue_lag0', 'outbreak_dengue_lag1', 'outbreak_dengue_lag2',
        'outbreak_diarrhoeal_lag0', 'outbreak_diarrhoeal_lag1', 'outbreak_diarrhoeal_lag2',
        'outbreak_flu_lag0', 'outbreak_flu_lag1', 'outbreak_flu_lag2',
        'outbreak_leptospirosis_lag0', 'outbreak_leptospirosis_lag1', 'outbreak_leptospirosis_lag2',
        'outbreak_malaria_lag0', 'outbreak_malaria_lag1', 'outbreak_malaria_lag2',
        'outbreak_respiratory_lag0', 'outbreak_respiratory_lag1', 'outbreak_respiratory_lag2',
        'outbreak_typhoid_lag0', 'outbreak_typhoid_lag1', 'outbreak_typhoid_lag2',
        'outbreak_any_active', 'outbreak_count', 'monsoon_phase_enc',
        'region_enc', 'category_enc', 'drug_enc', 'store_enc',
        'demand_wow_change', 'demand_momentum_4wk'
    ]
    
    # Build exact matching feature matrix structure
    for col in model_feature_cols:
        val = mapping[col]
        if isinstance(val, pd.Series):
            model_df[col] = val.values
        else:
            model_df[col] = val
            
    # Preserve key target metrics for downstream API logic
    model_df["drug_id"] = df_clean["entity_id"].values
    model_df["store_id"] = df_clean["location_id"].values
    model_df["week"] = df_clean["time_index"].values
    model_df["demand"] = df_clean["target"].values
    model_df["stock_on_hand"] = df_clean["stock_on_hand"].values
    model_df["recommended_order_qty"] = df_clean["recommended_order_qty"].values
    
    return model_df
