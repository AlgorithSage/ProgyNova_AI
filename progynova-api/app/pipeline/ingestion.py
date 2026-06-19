import pandas as pd
import numpy as np
from typing import List
from app.schema import AutoSchemaEngine

def process_upload(dfs: List[pd.DataFrame]) -> pd.DataFrame:
    """Ingest one or multiple DataFrames, merge them on common columns, and pivot if wide-form."""
    if not dfs:
        raise ValueError("No datasets provided.")
        
    # 1. Merge multiple frames sequentially if more than one is uploaded
    if len(dfs) == 1:
        main_df = dfs[0].copy()
    else:
        # Sort dataframes by row count descending
        dfs_sorted = sorted(dfs, key=len, reverse=True)
        main_df = dfs_sorted[0].copy()
        
        for current_df in dfs_sorted[1:]:
            common_keys = list(set(main_df.columns) & set(current_df.columns))
            if common_keys:
                new_features = [c for c in current_df.columns if c not in main_df.columns]
                if new_features:
                    main_df = main_df.merge(current_df[common_keys + new_features], on=common_keys, how="left")
                    
    # 2. Run dynamic role parsing & standardizing
    main_df.columns = [str(c).strip() for c in main_df.columns]
    
    analysis = AutoSchemaEngine.validate_and_parse(main_df)
    is_wide = analysis["is_wide"]
    detected_roles = analysis["detected_roles"]
    
    if is_wide:
        time_columns = [c for c in main_df.columns if AutoSchemaEngine.score_column(c, AutoSchemaEngine.TIME_KW) > 0]
        explicit_id_columns = [c for c in main_df.columns if AutoSchemaEngine.score_column(c, AutoSchemaEngine.ENTITY_ID_KW) > 40]
        stock_columns = [c for c in main_df.columns if AutoSchemaEngine.score_column(c, AutoSchemaEngine.STOCK_KW) > 40]
        lead_columns = [c for c in main_df.columns if AutoSchemaEngine.score_column(c, AutoSchemaEngine.LEAD_KW) > 40]
        
        # Check layout style
        layout = detected_roles["layout"]
        if layout == "time-wide":
            entity_col = detected_roles["entity_id"]
            id_vars = [entity_col]
            for c in main_df.columns:
                if c != entity_col and c not in time_columns and main_df[c].dtype == 'object':
                    id_vars.append(c)
                    
            df_melted = main_df.melt(id_vars=id_vars, value_vars=time_columns, var_name="time_index", value_name="target")
            df_melted = df_melted.rename(columns={entity_col: "entity_id"})
            df_melted["location_id"] = "LOC_GLOBAL"
            df_melted["stock_on_hand"] = 9999.0
            df_melted["lead_time"] = 2.0
            df_processed = df_melted.copy()
            primary_time_key = "time_index"
        else:
            primary_time_col = detected_roles["time_index"]
            best_time = primary_time_col
            non_target_cols = set(([best_time] if best_time else []) + stock_columns + lead_columns + explicit_id_columns)
            remaining_numeric_cols = [c for c in main_df.select_dtypes(include=[np.number]).columns if c not in non_target_cols]
            
            id_vars = [primary_time_col]
            for aux_c in ["Year", "Month", "Date", "Hour", "Day"]:
                if aux_c in main_df.columns and aux_c != primary_time_col:
                    id_vars.append(aux_c)
                    
            df_melted = main_df.melt(id_vars=id_vars, value_vars=remaining_numeric_cols, var_name="entity_id", value_name="target")
            df_melted = df_melted.rename(columns={primary_time_col: "time_index"})
            df_melted["location_id"] = "LOC_GLOBAL"
            df_melted["stock_on_hand"] = 9999.0
            df_melted["lead_time"] = 2.0
            df_processed = df_melted.copy()
            primary_time_key = "time_index"
    else:
        # Binding long-form
        column_mapping = {}
        for role, col in detected_roles.items():
            if not str(col).endswith("(injected default)"):
                column_mapping[col] = role
                
        df_processed = main_df.rename(columns=column_mapping).copy()
        
        # Inject defaults if missing
        if "entity_id" not in df_processed.columns:
            df_processed["entity_id"] = "SKU_UNSPECIFIED"
        if "location_id" not in df_processed.columns:
            df_processed["location_id"] = "LOC_UNSPECIFIED"
        if "stock_on_hand" not in df_processed.columns:
            df_processed["stock_on_hand"] = 0.0
        if "lead_time" not in df_processed.columns:
            df_processed["lead_time"] = 1.0
            
        primary_time_key = "time_index"
        
    # Normalize time_index
    raw_time = df_processed[primary_time_key]
    
    if pd.api.types.is_numeric_dtype(raw_time):
        df_processed["time_index"] = raw_time
    else:
        # Try parsing as datetime first
        parsed_dt = pd.to_datetime(raw_time, errors='coerce')
        if not parsed_dt.isna().all():
            # It's a valid date column
            t_min = parsed_dt.min()
            df_processed["time_index_dt"] = parsed_dt  # keep for display
            df_processed["time_index"] = (parsed_dt - t_min).dt.days
        else:
            # Try to extract numbers (e.g. "week_1" -> 1)
            raw_time_str = raw_time.astype(str)
            extracted_nums = raw_time_str.str.extract(r'(\d+)')
            if not extracted_nums.isna().all().all():
                df_processed["time_index"] = pd.to_numeric(extracted_nums[0], errors='coerce').fillna(0)
            else:
                df_processed["time_index"] = range(len(df_processed))
    
    # Enforce type casting
    df_processed["entity_id"] = df_processed["entity_id"].astype(str)
    df_processed["location_id"] = df_processed["location_id"].astype(str)
    
    for key in ["target", "stock_on_hand", "lead_time"]:
        df_processed[key] = pd.to_numeric(df_processed[key], errors='coerce').fillna(0.0)
        
    return df_processed
