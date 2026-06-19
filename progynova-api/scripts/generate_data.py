import os
import time
import json
import numpy as np
import pandas as pd
from dataclasses import dataclass, field
from pathlib import Path
import xgboost as xgb
from sklearn.metrics import mean_absolute_percentage_error, mean_squared_error, f1_score

# Directory Setup
DATA_DIR = Path("data")
MODELS_DIR = Path("models")
os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(MODELS_DIR/"checkpoints", exist_ok=True)

# Config
SEED = 42
N_WEEKS = 156          # 3 years
START_DATE = "2023-01-02"
REF_POP = 50_000
rng = np.random.default_rng(SEED)

DISEASES = ["dengue", "malaria", "flu", "diarrhoeal",
            "respiratory", "typhoid", "chikungunya", "leptospirosis"]

# ---------- Drug definitions (NLEM 2022) ----------
@dataclass
class Drug:
    drug_id: str
    name: str
    category: str
    baseline: float          # units/week at REF_POP
    shelf_life_weeks: int
    seasonal_amp: float = 0.0
    seasonal_phase: float = 0.0
    festival_sens: float = 0.0
    weather_sens: float = 0.0
    disease_response: dict = field(default_factory=dict)

DRUGS = [
    # Chronic / stable
    Drug("D01","Metformin 500mg","Antidiabetic",320,104,seasonal_amp=0.05),
    Drug("D02","Human Insulin 40IU/ml","Antidiabetic",90,52,seasonal_amp=0.05),
    Drug("D03","Telmisartan 40mg","Antihypertensive",210,104,seasonal_amp=0.04),
    Drug("D04","Amlodipine 5mg","Antihypertensive",240,104,seasonal_amp=0.04),
    Drug("D05","Atorvastatin 10mg","Lipid-lowering",180,104,seasonal_amp=0.04),
    Drug("D06","Phenytoin Sodium 100mg","Antiepileptic",70,78,seasonal_amp=0.03),
    Drug("D07","Levothyroxine 50mcg","Thyroid",130,104,seasonal_amp=0.03),
    # Acute / seasonal
    Drug("D08","Paracetamol 500mg","Analgesic/Antipyretic",450,104,
         seasonal_amp=0.25,seasonal_phase=26,festival_sens=0.10,
         disease_response={"dengue":(0.9,2),"flu":(0.7,1),"chikungunya":(0.8,1),"typhoid":(0.5,1)}),
    Drug("D09","ORS (WHO formula)","Rehydration",300,78,
         seasonal_amp=0.30,seasonal_phase=22,weather_sens=0.45,
         disease_response={"dengue":(0.5,1),"diarrhoeal":(1.1,0),"typhoid":(0.4,1)}),
    Drug("D10","Oseltamivir 75mg","Antiviral",40,52,
         seasonal_amp=0.20,seasonal_phase=4,
         disease_response={"flu":(1.6,1)}),
    Drug("D11","Amoxicillin 500mg","Antibiotic",260,78,
         seasonal_amp=0.15,seasonal_phase=2,
         disease_response={"respiratory":(0.8,1),"typhoid":(0.3,1)}),
    Drug("D12","Azithromycin 500mg","Antibiotic",170,78,
         seasonal_amp=0.12,seasonal_phase=2,
         disease_response={"respiratory":(0.6,1),"typhoid":(0.9,1)}),
    Drug("D13","Cetirizine 10mg","Antihistamine",200,104,
         seasonal_amp=0.25,seasonal_phase=10,
         disease_response={"flu":(0.3,1)}),
    Drug("D14","Salbutamol Inhaler 100mcg","Bronchodilator",85,78,
         seasonal_amp=0.30,seasonal_phase=48,weather_sens=0.20,
         disease_response={"respiratory":(0.7,1)}),
    Drug("D15","Artemether+Lumefantrine 20/120mg","Antimalarial",55,52,
         seasonal_amp=0.35,seasonal_phase=24,
         disease_response={"malaria":(1.8,1)}),
    Drug("D16","Doxycycline 100mg","Antibiotic",75,78,
         seasonal_amp=0.30,seasonal_phase=24,weather_sens=0.30,
         disease_response={"leptospirosis":(1.5,1)}),
    Drug("D17","Zinc Dispersible 20mg","Supplement",140,78,
         seasonal_amp=0.25,seasonal_phase=22,
         disease_response={"diarrhoeal":(1.0,0)}),
    Drug("D18","Pantoprazole 40mg","Proton Pump Inhibitor",190,104,
         seasonal_amp=0.10,festival_sens=0.25),
    Drug("D19","Dextromethorphan Syrup","Cough Suppressant",230,78,
         seasonal_amp=0.30,seasonal_phase=48,
         disease_response={"flu":(0.6,1),"respiratory":(0.7,1)}),
]

# ---------- Store definitions (real Indian cities) ----------
@dataclass
class Store:
    store_id: str
    name: str
    city: str
    state: str
    population: int
    lead_time: int    # supplier lead time in weeks

STORES = [
    Store("S01","MedPlus Pharmacy, Kothrud","Pune","Maharashtra",68000,1),
    Store("S02","Jan Aushadhi Kendra, Nashik Road","Nashik","Maharashtra",42000,2),
    Store("S03","Apollo Pharmacy, Koramangala","Bengaluru","Karnataka",81000,1),
    Store("S04","Sanjivini Medicals, Hubli","Hubli","Karnataka",35000,2),
    Store("S05","Dhanwantari Pharmacy, Salt Lake","Kolkata","West Bengal",74000,1),
    Store("S06","Jan Aushadhi Kendra, Howrah","Howrah","West Bengal",51000,2),
    Store("S07","Netmeds Store, T. Nagar","Chennai","Tamil Nadu",72000,1),
    Store("S08","Apollo Pharmacy, Madurai","Madurai","Tamil Nadu",38000,2),
    Store("S09","MedPlus Pharmacy, Dwarka","New Delhi","Delhi",85000,1),
    Store("S10","Jan Aushadhi Kendra, Noida Sec-62","Noida","Uttar Pradesh",46000,2),
    Store("S11","Lifeline Pharmacy, Saheed Nagar","Bhubaneswar","Odisha",55000,1),
    Store("S12","District Hospital Pharmacy","Cuttack","Odisha",31000,3),
    Store("S13","Oushadhi Pharmacy, MG Road","Kochi","Kerala",62000,1),
    Store("S14","Jan Aushadhi Kendra, Kozhikode","Kozhikode","Kerala",40000,2),
    Store("S15","Rajasthan Medicals, MI Road","Jaipur","Rajasthan",70000,1),
    Store("S16","PHC Pharmacy, Barmer","Barmer","Rajasthan",22000,3),
]

STATE_TO_REGION = {
    "Maharashtra":"West", "Karnataka":"South", "West Bengal":"East",
    "Tamil Nadu":"South-East", "Delhi":"North", "Uttar Pradesh":"North",
    "Odisha":"East-Central", "Kerala":"South-West", "Rajasthan":"North-West",
}
REGIONS = sorted(set(STATE_TO_REGION.values()))

# ---------- Indian festival calendar (week-of-year -> regional intensity) ----------
FESTIVALS = {
    2:  {"South-East":1.0,"South":0.6,"North":0.4,"West":0.5,"East":0.3,
         "North-West":0.5,"South-West":0.4,"East-Central":0.3},  # Pongal/Sankranti
    12: {"North":0.9,"North-West":0.9,"East":0.7,"West":0.7,"South":0.3,
         "South-East":0.3,"South-West":0.3,"East-Central":0.6},  # Holi
    14: {"North":0.6,"West":0.6,"East":0.5,"South":0.4,"North-West":0.7,
         "South-East":0.4,"South-West":0.5,"East-Central":0.5},  # Eid-ul-Fitr
    24: {"North":0.5,"West":0.5,"East":0.5,"South":0.3,"North-West":0.6,
         "South-East":0.3,"South-West":0.4,"East-Central":0.4},  # Eid-ul-Adha
    35: {"South-West":1.0,"South":0.3,"South-East":0.2,"North":0.0,
         "West":0.1,"East":0.0,"North-West":0.0,"East-Central":0.0},  # Onam
    37: {"West":1.0,"South":0.5,"North":0.2,"South-East":0.3,
         "East":0.2,"South-West":0.4,"North-West":0.2,"East-Central":0.2},  # Ganesh Chaturthi
    42: {"East":1.0,"East-Central":0.8,"North":0.6,"West":0.7,
         "South":0.4,"North-West":0.6,"South-East":0.4,"South-West":0.3},  # Durga Puja
    44: {"North":1.0,"West":1.0,"North-West":1.0,"East":0.8,
         "South":0.6,"South-East":0.6,"South-West":0.5,"East-Central":0.7},  # Diwali
    52: {"South-West":0.7,"South":0.5,"South-East":0.6,"East":0.4,
         "North":0.4,"West":0.4,"North-West":0.3,"East-Central":0.3},  # Christmas
}

# ---------- Disease outbreak patterns ----------
REGION_OUTBREAKS = {
    "West":         {"dengue":(39,6,1.0),"malaria":(32,5,0.6),"leptospirosis":(30,4,0.9),
                     "diarrhoeal":(27,8,0.7),"chikungunya":(38,4,0.5),"respiratory":(50,6,0.6)},
    "South":        {"dengue":(40,6,0.8),"malaria":(28,6,0.9),"diarrhoeal":(24,8,0.7),
                     "respiratory":(48,6,0.7),"chikungunya":(36,5,0.7)},
    "East":         {"dengue":(38,6,0.85),"malaria":(30,5,0.5),"flu":(2,5,0.7),
                     "diarrhoeal":(25,9,0.8),"typhoid":(28,5,0.7),"respiratory":(50,6,0.8)},
    "South-East":   {"dengue":(44,6,0.9),"malaria":(26,5,0.4),"diarrhoeal":(22,8,0.6),
                     "chikungunya":(42,5,0.6),"respiratory":(2,5,0.5),"leptospirosis":(46,4,0.5)},
    "North":        {"dengue":(37,6,0.95),"malaria":(34,5,0.4),"flu":(3,6,0.9),
                     "diarrhoeal":(26,7,0.6),"typhoid":(30,5,0.6),"respiratory":(1,7,0.9)},
    "East-Central": {"malaria":(28,7,0.95),"dengue":(38,5,0.7),"diarrhoeal":(26,9,0.8),
                     "typhoid":(29,5,0.6),"respiratory":(50,5,0.5)},
    "South-West":   {"leptospirosis":(28,5,1.0),"dengue":(36,5,0.7),"diarrhoeal":(24,7,0.7),
                     "chikungunya":(34,4,0.5),"flu":(4,4,0.4),"respiratory":(6,5,0.4)},
    "North-West":   {"malaria":(32,6,0.7),"dengue":(38,5,0.6),"flu":(2,6,0.8),
                     "diarrhoeal":(28,7,0.6),"respiratory":(1,7,0.7),"typhoid":(30,4,0.5)},
}

MONSOON_ONSET = {"South-West":22,"South":23,"South-East":43,"West":24,
                 "East-Central":24,"East":25,"North":27,"North-West":28}
MONSOON_STRENGTH = {"South-West":0.95,"East":0.85,"East-Central":0.90,"West":0.85,
                    "South":0.75,"North":0.70,"North-West":0.45,"South-East":0.70}

def woy(w):
    return (w % 52) + 1

def build_context():
    rows = []
    for region in REGIONS:
        onset = MONSOON_ONSET[region]
        strength = MONSOON_STRENGTH[region]
        for w in range(N_WEEKS):
            wo = woy(w)

            # Rainfall anomaly
            if region == "South-East":
                ne = strength * np.exp(-((wo-45)**2)/(2*5**2))
                sw = 0.3 * np.exp(-((wo-24)**2)/(2*4**2))
                rainfall = ne + sw + rng.normal(0, 0.06)
            else:
                mp = onset + 6
                wd = 7 if strength > 0.6 else 5
                rainfall = strength * np.exp(-((wo-mp)**2)/(2*wd**2)) + rng.normal(0, 0.07)
            rainfall = float(np.clip(rainfall, -0.15, None))

            # Monsoon phase
            if region == "South-East":
                phase = ("NE-monsoon" if 42<=wo<=50 else
                         "SW-brief" if 22<=wo<=26 else
                         "winter" if wo<=8 else
                         "summer" if wo<=20 else "dry")
            else:
                if wo < onset-4:
                    phase = "winter" if (wo<=14 or wo>46) else "pre-monsoon"
                elif wo < onset:     phase = "pre-monsoon"
                elif wo <= onset+14: phase = "monsoon"
                elif wo <= onset+20: phase = "post-monsoon"
                else:                phase = "winter" if wo>46 else "post-monsoon"

            # Festival intensity
            fest = 0.0
            for fw, intensities in FESTIVALS.items():
                d = min(abs(wo-fw), 52-abs(wo-fw))
                if d <= 1:
                    fest = max(fest, intensities.get(region, 0.0))

            row = {"region":region, "week":w, "week_of_year":wo,
                   "rainfall_anomaly":round(rainfall,3),
                   "monsoon_phase":phase, "festival_intensity":round(fest,2)}

            # Disease severities
            outbreaks = REGION_OUTBREAKS.get(region, {})
            for disease in DISEASES:
                sev = 0.0
                if disease in outbreaks:
                    peak, width, base = outbreaks[disease]
                    dd = min(abs(wo-peak), 52-abs(wo-peak))
                    sev = base * np.exp(-(dd**2)/(2*width**2))
                if rng.random() < 0.015:
                    sev += rng.uniform(0.15, 0.5)
                row[f"sev_{disease}"] = round(float(np.clip(sev+rng.normal(0,0.025),0,None)),3)

            rows.append(row)
    return pd.DataFrame(rows)

def lagged_sev(ctx, disease, week, lag):
    t = week - lag
    if t < 0: return 0.0
    col = f"sev_{disease}"
    if col not in ctx.columns: return 0.0
    val = ctx.loc[ctx["week"]==t, col]
    return float(val.iloc[0]) if len(val) else 0.0

def expected_demand(drug, store, week, ctx, region):
    wo = woy(week)
    base = drug.baseline
    pop_mult = store.population / REF_POP
    trend = 1.06 ** (week / 52.0)
    seasonal = 1.0 + drug.seasonal_amp * np.sin(2*np.pi*(wo+drug.seasonal_phase)/52.0)

    row = ctx.loc[ctx["week"]==week].iloc[0]
    festival = 1.0 + drug.festival_sens * row["festival_intensity"]
    weather = 1.0 + drug.weather_sens * max(row["rainfall_anomaly"], 0.0)

    outbreak = 1.0
    for disease, (strength, lag) in drug.disease_response.items():
        outbreak += strength * lagged_sev(ctx, disease, week, lag)

    return max(base * pop_mult * trend * seasonal * festival * weather * outbreak, 1.0)

def sample_nb(mu, r=8.0):
    return int(rng.negative_binomial(r, r/(r+mu)))

def simulate(drug, store, ctx, region):
    avg_mu = np.mean([expected_demand(drug, store, w, ctx, region) for w in range(52)])
    lead = store.lead_time
    rop = avg_mu * (lead+1) * 1.2
    otu = avg_mu * (lead+4)
    stock = float(otu)
    pending = {}
    records = []

    for w in range(N_WEEKS):
        stock += pending.pop(w, 0.0)
        mu = expected_demand(drug, store, w, ctx, region)
        demand = sample_nb(mu)
        dispensed = min(demand, int(stock))
        stockout = int(demand > stock)
        stock -= dispensed

        if stock < rop and not pending:
            oq = max(otu - stock, 0.0)
            pending[w + lead] = oq
        else:
            oq = 0.0

        records.append({
            "store_id":store.store_id, "drug_id":drug.drug_id,
            "city":store.city, "state":store.state, "region":region,
            "week":w, "demand":demand, "units_dispensed":dispensed,
            "stock_on_hand":int(stock+dispensed), "units_ordered":int(oq),
            "stockout":stockout
        })
    return records

def run_pipeline():
    print("PHASE 1: Generating synthetic data...")
    drugs_df = pd.DataFrame([{
        "drug_id":d.drug_id,"name":d.name,"category":d.category,
        "baseline_weekly_demand":d.baseline,"shelf_life_weeks":d.shelf_life_weeks,
        "seasonal_amplitude":d.seasonal_amp,
        "responds_to":";".join(d.disease_response.keys())
    } for d in DRUGS])

    stores_df = pd.DataFrame([{
        "store_id":s.store_id,"name":s.name,"city":s.city,"state":s.state,
        "region":STATE_TO_REGION[s.state],"catchment_population":s.population,
        "supplier_lead_time_weeks":s.lead_time
    } for s in STORES])

    context_df = build_context()
    context_df["date"] = context_df["week"].apply(lambda w: pd.Timestamp(START_DATE)+pd.Timedelta(weeks=int(w)))

    ctx_by_region = {r: context_df[context_df["region"]==r].reset_index(drop=True) for r in REGIONS}
    all_records = []
    for store in STORES:
        region = STATE_TO_REGION[store.state]
        ctx = ctx_by_region[region]
        for drug in DRUGS:
            all_records.extend(simulate(drug, store, ctx, region))

    disp_df = pd.DataFrame(all_records)
    disp_df["date"] = disp_df["week"].apply(lambda w: pd.Timestamp(START_DATE)+pd.Timedelta(weeks=int(w)))
    disp_df = disp_df[["store_id","drug_id","city","state","region","week","date",
                        "demand","units_dispensed","stock_on_hand","units_ordered","stockout"]]

    drugs_df.to_csv(DATA_DIR/"drugs.csv", index=False)
    stores_df.to_csv(DATA_DIR/"stores.csv", index=False)
    context_df.to_csv(DATA_DIR/"context.csv", index=False)
    disp_df.to_csv(DATA_DIR/"dispensing.csv", index=False)
    print("Raw tables written to data/.")

    # ---------- FEATURE ENGINEERING ----------
    print("PHASE 2: Feature Engineering...")
    df = disp_df.merge(
        stores_df[["store_id","catchment_population","supplier_lead_time_weeks"]],
        on="store_id", how="left")
    df = df.merge(
        drugs_df[["drug_id","category","baseline_weekly_demand","shelf_life_weeks","responds_to"]],
        on="drug_id", how="left")
    context_cols = [c for c in context_df.columns if c != "date"]
    df = df.merge(context_df[context_cols], on=["region","week"], how="left")

    df = df.sort_values(["store_id","drug_id","week"]).reset_index(drop=True)
    for lag in [1, 2, 4, 8, 12, 26, 52]:
        df[f"demand_lag_{lag}"] = df.groupby(["store_id","drug_id"])["demand"].shift(lag)

    for w in [4, 8, 12]:
        df[f"demand_roll_mean_{w}"] = (
            df.groupby(["store_id","drug_id"])["demand"]
              .transform(lambda x: x.shift(1).rolling(window=w, min_periods=1).mean()))
        df[f"demand_roll_std_{w}"] = (
            df.groupby(["store_id","drug_id"])["demand"]
              .transform(lambda x: x.shift(1).rolling(window=w, min_periods=2).std()))
    for c in [c for c in df.columns if "roll_std" in c]:
        df[c] = df[c].fillna(0)

    df["sin_week"] = np.sin(2 * np.pi * df["week_of_year"] / 52.0)
    df["cos_week"] = np.cos(2 * np.pi * df["week_of_year"] / 52.0)
    df["month"] = ((df["week_of_year"]-1) // 4.33).astype(int).clip(0,11) + 1

    disease_lags = {}
    default_lag_map = {"dengue":2,"flu":1,"chikungunya":1,"typhoid":1,
                       "diarrhoeal":0,"malaria":1,"respiratory":1,"leptospirosis":1}
    for _, row in drugs_df.iterrows():
        responds = row.get("responds_to","")
        if pd.isna(responds) or responds == "":
            disease_lags[row["drug_id"]] = {}
        else:
            diseases = responds.split(";")
            disease_lags[row["drug_id"]] = {d: default_lag_map.get(d,1) for d in diseases}

    all_diseases = set()
    for m in disease_lags.values():
        all_diseases.update(m.keys())

    for disease in sorted(all_diseases):
        sev_col = f"sev_{disease}"
        if sev_col not in df.columns: continue
        for lag in [0, 1, 2]:
            df[f"outbreak_{disease}_lag{lag}"] = df.groupby(["store_id","drug_id"])[sev_col].shift(lag)

    sev_cols = [c for c in df.columns if c.startswith("sev_")]
    df["outbreak_any_active"] = (df[sev_cols].max(axis=1) > 0.3).astype(int)
    df["outbreak_count"] = (df[sev_cols] > 0.3).sum(axis=1)

    phase_map = {"winter":0,"pre-monsoon":1,"summer":2,"monsoon":3,
                 "post-monsoon":4,"NE-monsoon":5,"SW-brief":6,"dry":7}
    df["monsoon_phase_enc"] = df["monsoon_phase"].map(phase_map).fillna(0).astype(int)
    df["region_enc"] = df["region"].map({r:i for i,r in enumerate(sorted(df["region"].unique()))}).astype(int)
    df["category_enc"] = df["category"].map({c:i for i,c in enumerate(sorted(df["category"].unique()))}).astype(int)
    df["drug_enc"] = df["drug_id"].str.replace("D","").astype(int)
    df["store_enc"] = df["store_id"].str.replace("S","").astype(int)

    df["demand_wow_change"] = df.groupby(["store_id","drug_id"])["demand"].diff(1)
    df["demand_momentum_4wk"] = (
        df["demand_roll_mean_4"] / df.groupby(["store_id","drug_id"])["demand_roll_mean_4"].shift(4)
    ).replace([np.inf,-np.inf], np.nan).fillna(1.0)

    demand_rate = df["demand_roll_mean_4"].replace(0, 1)
    df["days_of_cover"] = (df["stock_on_hand"]/demand_rate*7).replace([np.inf,-np.inf],999).fillna(0).round(1)
    lead_days = df["supplier_lead_time_weeks"] * 7
    df["reorder_urgent"] = (df["days_of_cover"] < (lead_days + 7)).astype(int)
    target_stock = demand_rate * 4
    df["recommended_order_qty"] = (target_stock - df["stock_on_hand"]).clip(lower=0).round(0).fillna(0).astype(int)

    df = df.dropna(subset=["demand_lag_52"]).copy()
    
    # Drop non-numeric / reference string columns before writing features
    sev_drop = [c for c in df.columns if c.startswith("sev_")]
    text_drop = ["city","state","name","responds_to","monsoon_phase","region","category","date"]
    df = df.drop(columns=[c for c in sev_drop+text_drop if c in df.columns], errors="ignore")
    
    df = df.fillna(0)

    df.to_parquet(DATA_DIR/"features.parquet", index=False)
    df.to_csv(DATA_DIR/"features.csv", index=False)
    print("Features matrix written to data/.")

    # ---------- BASELINE MODELS ----------
    print("PHASE 3: Model Training...")
    train = df[df["week"] <= 129].copy()
    val = df[(df["week"]>=130) & (df["week"]<=142)].copy()
    test = df[df["week"] >= 143].copy()

    exclude = {"store_id","drug_id","week","date","demand","units_dispensed",
               "stock_on_hand","units_ordered","stockout",
               "days_of_cover","reorder_urgent","recommended_order_qty"}
    feature_cols = [c for c in df.columns if c not in exclude]

    X_train = train[feature_cols].values
    y_train = train["demand"].values
    X_val = val[feature_cols].values
    y_val = val["demand"].values
    X_test = test[feature_cols].values
    y_test = test["demand"].values

    model = xgb.XGBRegressor(
        max_depth=6, learning_rate=0.05, n_estimators=500,
        subsample=0.8, colsample_bytree=0.8, min_child_weight=5,
        reg_alpha=0.1, reg_lambda=1.0, random_state=42,
        n_jobs=-1, tree_method="hist", early_stopping_rounds=30)

    model.fit(X_train, y_train, eval_set=[(X_val, y_val)], verbose=False)
    
    # Save Model Weights
    model.save_model(str(MODELS_DIR/"xgboost_baseline.json"))
    model.save_model(str(MODELS_DIR/"checkpoints"/"xgboost_baseline.json"))
    print("Model successfully trained and saved to models/xgboost_baseline.json!")

    # Calculate metric check
    y_pred = model.predict(X_test)
    mape = mean_absolute_percentage_error(y_test, y_pred)*100
    rmse = np.sqrt(mean_squared_error(y_test, y_pred))
    print(f"Test Set Evaluation Results: MAPE = {mape:.2f}% | RMSE = {rmse:.2f}")

if __name__ == "__main__":
    run_pipeline()
