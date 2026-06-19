import pandas as pd
import numpy as np
from typing import Dict, Any

class AutoSchemaEngine:
    TIME_KW = ["time", "date", "week", "timestamp", "period", "day", "hour", "year", "month"]
    STOCK_KW = ["stock_on_hand", "stock", "inventory", "current_stock", "available_stock", "on_hand", "stock_qty"]
    LEAD_KW = ["lead_time", "leadtime", "supplier_lead", "delivery_time", "lead_weeks", "lead"]
    ENTITY_ID_KW = ["drug_id", "sku", "item_id", "product_id", "material_id", "ndc", "entity_id", "product", "drug"]
    LOCATION_ID_KW = ["store", "location", "branch", "facility", "site", "depot", "warehouse", "location_id", "store_id"]
    TARGET_KW = ["demand", "sales", "quantity", "units", "target", "demand_units", "qty", "sold"]

    @classmethod
    def score_column(cls, col_name: str, keywords: list) -> int:
        col_clean = str(col_name).lower().replace("-", "_")
        if any(kw == col_clean for kw in keywords): return 100
        return sum(20 for kw in keywords if kw in col_clean)

    @classmethod
    def validate_and_parse(cls, df: pd.DataFrame) -> Dict[str, Any]:
        """Validate dataframe, auto-detect column roles, and return detected schemas."""
        df_cols = [str(c).strip() for c in df.columns]
        
        # Check semantic profiles
        time_columns = [c for c in df.columns if cls.score_column(c, cls.TIME_KW) > 0]
        explicit_id_columns = [c for c in df.columns if cls.score_column(c, cls.ENTITY_ID_KW) > 40]
        stock_columns = [c for c in df.columns if cls.score_column(c, cls.STOCK_KW) > 40]
        lead_columns = [c for c in df.columns if cls.score_column(c, cls.LEAD_KW) > 40]
        
        # Check primary time column to avoid classifying time steps as metadata time columns
        best_time = max(time_columns, key=lambda c: cls.score_column(c, cls.TIME_KW)) if time_columns else None
        
        non_target_cols = set(([best_time] if best_time else []) + stock_columns + lead_columns + explicit_id_columns)
        remaining_numeric_cols = [c for c in df.select_dtypes(include=[np.number]).columns if c not in non_target_cols]
        
        # Check if there is an explicit target column (score > 40)
        has_explicit_target = any(cls.score_column(c, cls.TARGET_KW) > 40 for c in df.columns)
        
        is_wide = False
        is_time_wide = False
        is_entity_wide = False
        
        if not has_explicit_target:
            if len(time_columns) > 1:
                is_wide = True
                is_time_wide = True
            elif len(remaining_numeric_cols) > 1 and len(explicit_id_columns) == 0:
                is_wide = True
                is_entity_wide = True
        
        detected_roles = {}
        if is_wide:
            if is_time_wide:
                detected_roles["layout"] = "time-wide"
                detected_roles["time_index"] = "extracted from column headers"
                entity_col = max(df.columns, key=lambda c: cls.score_column(c, cls.ENTITY_ID_KW)) if explicit_id_columns else df.columns[0]
                detected_roles["entity_id"] = entity_col
                detected_roles["target"] = "melted cell values"
            else:
                detected_roles["layout"] = "entity-wide"
                detected_roles["time_index"] = best_time
                detected_roles["entity_id"] = "extracted from column headers"
                detected_roles["target"] = "melted cell values"
            
            detected_roles["location_id"] = "LOC_GLOBAL (injected default)"
            detected_roles["stock_on_hand"] = "9999.0 (injected default)"
            detected_roles["lead_time"] = "2.0 (injected default)"
        else:
            # Bind Core Identifiers for long-form
            best_ent = max(df.columns, key=lambda c: cls.score_column(c, cls.ENTITY_ID_KW)) if explicit_id_columns else None
            if best_ent and cls.score_column(best_ent, cls.ENTITY_ID_KW) > 20:
                detected_roles["entity_id"] = best_ent
            else:
                detected_roles["entity_id"] = "SKU_UNSPECIFIED (injected default)"
                
            best_loc = max(df.columns, key=lambda c: cls.score_column(c, cls.LOCATION_ID_KW)) if [c for c in df.columns if cls.score_column(c, cls.LOCATION_ID_KW) > 20] else None
            if best_loc and cls.score_column(best_loc, cls.LOCATION_ID_KW) > 20:
                detected_roles["location_id"] = best_loc
            else:
                detected_roles["location_id"] = "LOC_UNSPECIFIED (injected default)"
                
            best_time_long = best_time
            if best_time_long:
                detected_roles["time_index"] = best_time_long
            else:
                raise ValueError("Missing time index column in dataset")
                
            best_target = max(df.columns, key=lambda c: cls.score_column(c, cls.TARGET_KW)) if [c for c in df.columns if cls.score_column(c, cls.TARGET_KW) > 20] else None
            if best_target:
                detected_roles["target"] = best_target
            else:
                raise ValueError("Missing target/demand column in dataset")
                
            stock_cols = [c for c in df.columns if cls.score_column(c, cls.STOCK_KW) > 40]
            if stock_cols:
                detected_roles["stock_on_hand"] = stock_cols[0]
            else:
                detected_roles["stock_on_hand"] = "0.0 (injected default)"
                
            lead_cols = [c for c in df.columns if cls.score_column(c, cls.LEAD_KW) > 40]
            if lead_cols:
                detected_roles["lead_time"] = lead_cols[0]
            else:
                detected_roles["lead_time"] = "1.0 (injected default)"

        schema = {}
        for col in df.columns:
            dtype = str(df[col].dtype)
            if "int" in dtype:
                schema[col] = "integer"
            elif "float" in dtype:
                schema[col] = "float"
            elif "datetime" in dtype or "date" in dtype:
                schema[col] = "datetime"
            else:
                schema[col] = "string"
                
        return {
            "is_wide": is_wide,
            "detected_roles": detected_roles,
            "column_types": schema
        }
