import os
import uuid
import random
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from typing import Tuple, List, Dict, Any

class SyntheticDataGenerator:
    """
    Generates realistic synthetic transaction streams with clearly labelled injected anomalies:
    1. Standard baseline transactions (log-normal amounts, diurnal human patterns)
    2. High-value sudden spikes (compromised account pattern)
    3. Rapid micro-payment velocity bursts (card testing pattern)
    4. Off-hours abnormal activity (midnight anomalous transfers)
    5. Novel geographic hops and device switches
    """

    CHANNELS = ["web", "mobile_app", "pos", "atm"]
    CATEGORIES = ["retail", "grocery", "entertainment", "travel", "crypto", "utilities", "restaurant"]
    LOCATIONS = ["US", "CA", "GB", "DE", "FR", "JP", "AU", "SG"]
    TYPES = ["payment", "transfer", "withdrawal", "pos"]

    def __init__(self, random_seed: int = 42):
        self.random_seed = random_seed
        np.random.seed(random_seed)
        random.seed(random_seed)

    def generate_dataset(
        self,
        num_transactions: int = 2500,
        anomaly_rate: float = 0.05,
        include_labels: bool = True,
        is_drifted: bool = False,
        days_back: int = 14
    ) -> pd.DataFrame:
        """
        Creates synthetic transaction dataset.
        If is_drifted=True, introduces noticeable shift in amount distribution and velocity.
        """
        start_time = datetime.utcnow() - timedelta(days=days_back)
        num_senders = max(num_transactions // 15, 20)
        senders = [f"CUST_{i:04d}" for i in range(1, num_senders + 1)]
        receivers = [f"MERCH_{j:04d}" for j in range(1, 100)]

        # Base customer habits: each customer has a typical average spend
        if is_drifted:
            # Shifted distribution: 2.5x higher mean amounts, more night transactions
            customer_baseline = {
                s: float(np.random.lognormal(mean=5.2, sigma=0.8)) for s in senders
            }
        else:
            customer_baseline = {
                s: float(np.random.lognormal(mean=4.0, sigma=0.6)) for s in senders
            }

        records = []
        cur_time = start_time

        num_anomalies = int(num_transactions * anomaly_rate)
        anomaly_indices = set(random.sample(range(num_transactions), num_anomalies))

        # We keep track of customer last transaction time for natural sequence
        customer_last_time = {}

        for idx in range(num_transactions):
            sender = random.choice(senders)
            receiver = random.choice(receivers)
            is_anomaly = idx in anomaly_indices

            # Natural time stepping
            step_seconds = random.randint(30, 900)
            cur_time += timedelta(seconds=step_seconds)
            customer_last_time[sender] = cur_time

            tx_type = random.choice(self.TYPES)
            category = random.choice(self.CATEGORIES)
            channel = random.choice(self.CHANNELS)
            location = "US" if random.random() < 0.85 else random.choice(self.LOCATIONS)

            base_amt = customer_baseline[sender]

            # Injected anomaly behaviors
            if is_anomaly:
                pattern = random.choice(["large_spike", "velocity_burst", "night_transfer", "geo_hop"])
                if pattern == "large_spike":
                    # 8x to 25x of baseline amount
                    amount = round(base_amt * random.uniform(8.0, 25.0) + 1500.0, 2)
                    category = "crypto" if random.random() < 0.6 else "travel"
                elif pattern == "velocity_burst":
                    # Rapid repeated transactions
                    amount = round(random.uniform(5.0, 45.0), 2)
                    tx_type = "pos"
                elif pattern == "night_transfer":
                    # Force time into 02:00 - 04:00 AM
                    cur_time = cur_time.replace(hour=3, minute=random.randint(5, 55))
                    amount = round(base_amt * random.uniform(4.0, 9.0), 2)
                    tx_type = "transfer"
                else: # geo_hop
                    amount = round(base_amt * random.uniform(2.0, 6.0), 2)
                    location = random.choice(["RU", "NG", "KY", "PA"])
                    channel = "web"
                
                label = 1 if include_labels else None
            else:
                # Normal transaction: small variance around customer baseline
                amount = round(max(float(np.random.normal(base_amt, base_amt * 0.25)), 2.50), 2)
                label = 0 if include_labels else None

            records.append({
                "transaction_id": f"TX_{uuid.uuid4().hex[:12].upper()}",
                "timestamp": cur_time.strftime("%Y-%m-%d %H:%M:%S"),
                "amount": amount,
                "currency": "USD",
                "sender_id": sender,
                "receiver_id": receiver,
                "transaction_type": tx_type,
                "merchant_category": category,
                "location": location,
                "device_channel": channel,
                "is_fraud_ground_truth": label,
                "is_synthetic": True,
                "batch_id": "drifted_batch" if is_drifted else "baseline_batch"
            })

        df = pd.DataFrame(records)
        # Sort chronologically
        df["timestamp"] = pd.to_datetime(df["timestamp"])
        df = df.sort_values(by="timestamp").reset_index(drop=True)
        df["timestamp"] = df["timestamp"].dt.strftime("%Y-%m-%d %H:%M:%S")
        return df

    def generate_standard_files(self, output_dir: str):
        """Generates the four standard synthetic CSV files in data directory."""
        os.makedirs(output_dir, exist_ok=True)

        # 1. Labelled dataset for supervised training & PR curve evaluation
        df_labelled = self.generate_dataset(num_transactions=2000, anomaly_rate=0.06, include_labels=True, is_drifted=False)
        df_labelled.to_csv(os.path.join(output_dir, "synthetic_transactions_labelled.csv"), index=False)

        # 2. Unlabelled realistic stream for pure unsupervised monitoring
        df_unlabelled = self.generate_dataset(num_transactions=1500, anomaly_rate=0.05, include_labels=False, is_drifted=False)
        df_unlabelled.to_csv(os.path.join(output_dir, "synthetic_transactions_unlabelled.csv"), index=False)

        # 3. Clean Reference Baseline
        df_ref = self.generate_dataset(num_transactions=1500, anomaly_rate=0.04, include_labels=True, is_drifted=False)
        df_ref.to_csv(os.path.join(output_dir, "reference_baseline.csv"), index=False)

        # 4. Drifted Monitoring Stream (distribution shift: amounts higher, higher night transfers)
        df_drifted = self.generate_dataset(num_transactions=1500, anomaly_rate=0.12, include_labels=True, is_drifted=True)
        df_drifted.to_csv(os.path.join(output_dir, "synthetic_transactions_drifted.csv"), index=False)
        
        return {
            "labelled_path": os.path.join(output_dir, "synthetic_transactions_labelled.csv"),
            "unlabelled_path": os.path.join(output_dir, "synthetic_transactions_unlabelled.csv"),
            "reference_path": os.path.join(output_dir, "reference_baseline.csv"),
            "drifted_path": os.path.join(output_dir, "synthetic_transactions_drifted.csv"),
        }
