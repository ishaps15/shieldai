import numpy as np
import pandas as pd
from typing import Dict, List, Tuple, Any, Optional

class FeaturePipeline:
    """
    Leak-free behavioral feature engineering pipeline for transaction monitoring.
    Calculates rolling velocity, historical deviations, temporal signals,
    and novelty indicators strictly using past data (t < current_transaction_timestamp).
    """

    NUMERICAL_FEATURE_NAMES = [
        "log_amount",
        "historical_zscore",
        "ratio_to_hist_mean",
        "time_since_prev_sec",
        "tx_count_1h",
        "tx_count_24h",
        "spend_sum_24h",
        "ratio_to_24h_spend",
        "sin_hour",
        "cos_hour",
        "is_night_window",
        "is_weekend",
        "is_new_location",
        "is_new_channel"
    ]

    def __init__(self):
        self.fitted_ = False
        self.population_amount_median = 50.0
        self.population_amount_mad = 30.0

    def fit(self, df: pd.DataFrame) -> "FeaturePipeline":
        """Compute robust baseline statistics from population for imputation and fallbacks."""
        if "amount" in df.columns and len(df) > 0:
            amounts = df["amount"].dropna().values
            self.population_amount_median = float(np.median(amounts))
            diff = np.abs(amounts - self.population_amount_median)
            self.population_amount_mad = float(np.median(diff)) if np.median(diff) > 0 else 1.0
        self.fitted_ = True
        return self

    def transform(self, df: pd.DataFrame) -> Tuple[pd.DataFrame, List[str], List[str]]:
        """
        Transforms input transaction dataframe into feature matrix without future leakage.
        Returns:
            - features_df: DataFrame of computed features ready for ML models
            - feature_names: List of generated feature columns
            - missing_signals: List of signals that could not be calculated due to missing source columns
        """
        if df.empty:
            return pd.DataFrame(columns=self.NUMERICAL_FEATURE_NAMES), self.NUMERICAL_FEATURE_NAMES, []

        missing_signals = []
        df_work = df.copy()

        # Check required/optional columns
        if "timestamp" not in df_work.columns:
            df_work["timestamp"] = pd.date_range(end=pd.Timestamp.now(), periods=len(df_work), freq="min")
            missing_signals.append("timestamp: using synthetic sequence")
        else:
            df_work["timestamp"] = pd.to_datetime(df_work["timestamp"])

        if "amount" not in df_work.columns:
            df_work["amount"] = self.population_amount_median
            missing_signals.append("amount: defaulted to population median")
        else:
            df_work["amount"] = pd.to_numeric(df_work["amount"], errors="coerce").fillna(self.population_amount_median)

        if "sender_id" not in df_work.columns:
            df_work["sender_id"] = "anonymous_sender"
            missing_signals.append("sender_id: unable to compute sender-specific historical profiles")

        if "location" not in df_work.columns:
            df_work["location"] = "UNKNOWN"
            missing_signals.append("location: location hop signals unavailable")

        if "device_channel" not in df_work.columns:
            df_work["device_channel"] = "web"
            missing_signals.append("device_channel: channel switch signals unavailable")

        # 1. STRICT CAUSAL SORTING: sort by timestamp ascending
        df_work = df_work.sort_values(by="timestamp", ascending=True).reset_index(drop=False)
        original_order_col = df_work["index"]

        # 2. Skew Transformation for Amount
        # log1p prevents extreme positive skew from dominating distance/split metrics
        df_work["log_amount"] = np.log1p(np.maximum(df_work["amount"], 0.0))

        # 3. Temporal Cyclical & Window Signals
        timestamps = df_work["timestamp"]
        hours = timestamps.dt.hour + timestamps.dt.minute / 60.0
        df_work["sin_hour"] = np.sin(2.0 * np.pi * hours / 24.0)
        df_work["cos_hour"] = np.cos(2.0 * np.pi * hours / 24.0)
        # Night window: transactions between 00:00 and 05:00
        df_work["is_night_window"] = ((timestamps.dt.hour >= 0) & (timestamps.dt.hour <= 5)).astype(float)
        # Weekend indicator
        df_work["is_weekend"] = (timestamps.dt.day_of_week >= 5).astype(float)

        # 4. Strict Non-Leaking Causal Rolling Features per Sender
        historical_zscore = np.zeros(len(df_work), dtype=float)
        ratio_to_hist_mean = np.ones(len(df_work), dtype=float)
        time_since_prev_sec = np.full(len(df_work), 86400.0, dtype=float)
        tx_count_1h = np.ones(len(df_work), dtype=float)
        tx_count_24h = np.ones(len(df_work), dtype=float)
        spend_sum_24h = df_work["amount"].values.copy()
        ratio_to_24h_spend = np.ones(len(df_work), dtype=float)
        is_new_location = np.zeros(len(df_work), dtype=float)
        is_new_channel = np.zeros(len(df_work), dtype=float)

        # Process each sender chronologically
        sender_groups = df_work.groupby("sender_id", sort=False)
        for sender, indices in sender_groups.groups.items():
            idx_list = indices.to_numpy()
            sub_times = timestamps.iloc[idx_list].values.astype("datetime64[s]").astype(np.int64)
            sub_amounts = df_work["amount"].iloc[idx_list].values
            sub_locations = df_work["location"].iloc[idx_list].values
            sub_channels = df_work["device_channel"].iloc[idx_list].values

            # Seen sets for novelty detection
            seen_locations = set()
            seen_channels = set()

            running_sum = 0.0
            running_sq_sum = 0.0
            running_count = 0

            for i in range(len(idx_list)):
                global_idx = idx_list[i]
                cur_t = sub_times[i]
                cur_amt = sub_amounts[i]
                cur_loc = sub_locations[i]
                cur_chan = sub_channels[i]

                # Novelty checks strictly against past
                if i > 0 and cur_loc not in seen_locations and cur_loc != "UNKNOWN":
                    is_new_location[global_idx] = 1.0
                seen_locations.add(cur_loc)

                if i > 0 and cur_chan not in seen_channels:
                    is_new_channel[global_idx] = 1.0
                seen_channels.add(cur_chan)

                # Prior stats calculation (strictly strictly before i)
                if running_count > 1:
                    mean_prior = running_sum / running_count
                    variance_prior = (running_sq_sum / running_count) - (mean_prior ** 2)
                    std_prior = np.sqrt(max(variance_prior, 1e-4))
                    historical_zscore[global_idx] = (cur_amt - mean_prior) / std_prior
                    ratio_to_hist_mean[global_idx] = cur_amt / max(mean_prior, 1.0)
                elif running_count == 1:
                    mean_prior = running_sum
                    ratio_to_hist_mean[global_idx] = cur_amt / max(mean_prior, 1.0)
                    # Robust population fallback
                    historical_zscore[global_idx] = (cur_amt - self.population_amount_median) / max(self.population_amount_mad, 1.0)
                else:
                    # First transaction: fallback to robust population deviation
                    ratio_to_hist_mean[global_idx] = 1.0
                    historical_zscore[global_idx] = (cur_amt - self.population_amount_median) / max(self.population_amount_mad, 1.0)

                # Time since previous transaction for sender
                if i > 0:
                    delta_sec = max(float(cur_t - sub_times[i-1]), 1.0)
                    time_since_prev_sec[global_idx] = delta_sec
                else:
                    time_since_prev_sec[global_idx] = 86400.0 # 24h default for new sender

                # Rolling counts & sums in 1h (3600s) and 24h (86400s)
                # Scan backwards within window
                c_1h = 1
                c_24h = 1
                s_24h = cur_amt
                for back in range(i - 1, -1, -1):
                    diff_t = cur_t - sub_times[back]
                    if diff_t <= 3600:
                        c_1h += 1
                    if diff_t <= 86400:
                        c_24h += 1
                        s_24h += sub_amounts[back]
                    else:
                        break # sorted, no need to go further back

                tx_count_1h[global_idx] = c_1h
                tx_count_24h[global_idx] = c_24h
                spend_sum_24h[global_idx] = s_24h
                ratio_to_24h_spend[global_idx] = cur_amt / max(s_24h, 1.0)

                # Update cumulative stats for future transactions
                running_sum += cur_amt
                running_sq_sum += cur_amt * cur_amt
                running_count += 1

        # Populate features in df_work
        df_work["historical_zscore"] = np.clip(historical_zscore, -5.0, 15.0)
        df_work["ratio_to_hist_mean"] = np.clip(ratio_to_hist_mean, 0.0, 50.0)
        df_work["time_since_prev_sec"] = np.clip(time_since_prev_sec, 0.0, 604800.0) # clip at 7 days
        df_work["tx_count_1h"] = tx_count_1h
        df_work["tx_count_24h"] = tx_count_24h
        df_work["spend_sum_24h"] = spend_sum_24h
        df_work["ratio_to_24h_spend"] = np.clip(ratio_to_24h_spend, 0.0, 1.0)
        df_work["is_new_location"] = is_new_location
        df_work["is_new_channel"] = is_new_channel

        # Re-sort to original input order
        df_work = df_work.sort_values(by="index").reset_index(drop=True)

        features_df = df_work[self.NUMERICAL_FEATURE_NAMES].fillna(0.0)
        return features_df, self.NUMERICAL_FEATURE_NAMES, missing_signals
