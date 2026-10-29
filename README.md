# ShieldAI — Intelligent Fraud & Anomaly Detection System

ShieldAI is an enterprise-grade full-stack financial transaction monitoring platform designed to detect unusual transactional behavior, assign normalized anomaly-risk scores, manage a multi-strategy alerting engine, and track statistical feature/model drift over time.

---

## 1. System Architecture

```
                                  [ Financial Transaction Streams / CSV Uploads ]
                                                        │
                                                        ▼
┌───────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                       INGESTION & DATA VALIDATION                                      │
│  • Schema checking (required vs optional columns)             • Duplicate transaction ID detection   │
│  • Missing value profiling & imputation                       • Demo benchmark generator (3 modes)    │
└───────────────────────────────────────────────────┬───────────────────────────────────────────────────┘
                                                    │
                                                    ▼
┌───────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                LEAK-FREE BEHAVIORAL FEATURE PIPELINE                                  │
│  • Causal rolling window statistics (1h & 24h count/sum)      • Strict past-only stats (t < t_i)      │
│  • Time delta velocity (time_since_prev_sec)                  • Cyclical diurnal hour (sin/cos hour)  │
│  • Historical baseline amount Z-score & ratio                 • Off-hours night window (00:00 - 05:00)│
│  • Novelty indicators (new location, new channel)             • Log-transformed skewed amount (log1p) │
└──────────────────────────┬────────────────────────┬─────────────────────────┬─────────────────────────┘
                           │                        │                         │
                           ▼                        ▼                         ▼
┌────────────────────────────────────┐  ┌───────────────────────┐  ┌────────────────────────────────────┐
│      ISOLATION FOREST (ML)         │  │   BASELINE MAD (STAT) │  │    SUPERVISED COMPARATOR (EVAL)    │
│  • Primary unsupervised detector   │  │ • Median Absolute Dev │  │ • Random Forest & Logistic Reg     │
│  • Score inverted & min-max scaled │  │ • Robust Z-score (0-1)│  │ • PR-AUC, F1, Precision, Recall    │
│  • Score in [0.0, 1.0] (high=anom) │  │ • Rule benchmark      │  │ • Full threshold trade-off matrix  │
└──────────────────┬─────────────────┘  └───────────┬───────────┘  └──────────────────┬─────────────────┘
                   │                                │                                 │
                   └────────────────────────────────┼─────────────────────────────────┘
                                                    │
                                                    ▼
┌───────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                        ALERTING ENGINE & TRIAGE                                       │
│  • 3 Strategies: Fixed Cutoffs, Quantile-derived (top 1%, 5%, 15%), or Target Daily Volume Budget    │
│  • Multi-criteria: Anomaly score + high amount rule + rapid velocity + customer sigma deviation       │
│  • Deduplication: Rapid bursts grouped into incident bundles (GRP-<sender>-<window>)                  │
│  • Workflow: New ➔ Under Review ➔ Escalated ➔ Resolved ➔ False Positive                               │
│  • Full audit trail with analyst notes, timestamps, and severity modifications                        │
└───────────────────────────────────────────────────┬───────────────────────────────────────────────────┘
                                                    │
                                                    ▼
┌───────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                       POPULATION DRIFT MONITORING                                     │
│  • Population Stability Index (PSI) on features & scores      • Stable (<0.10), Warn, Drift (>=0.25)  │
│  • Kolmogorov-Smirnov (KS) 2-sample tests & p-values          • Targeted data/model recommendations   │
│  • Data drift (covariate shift) vs Concept drift distinction  • One-click distribution shift injection│
└───────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Directory Structure

```
shieldai/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── endpoints/
│   │   │   │   ├── alerts.py            # Alert triage, audit trail, grouping
│   │   │   │   ├── dashboard.py         # KPI aggregations & distributions
│   │   │   │   ├── drift.py             # PSI & KS drift detection endpoints
│   │   │   │   ├── ingestion.py         # CSV validation & demo loading
│   │   │   │   ├── models_ml.py         # Model training & PR-curve evaluation
│   │   │   │   ├── thresholds.py        # Threshold sandbox & live update
│   │   │   │   └── transactions.py      # Transaction search & signal explainers
│   │   │   └── api_router.py
│   │   ├── core/
│   │   │   ├── config.py                # App configuration & default thresholds
│   │   │   └── database.py              # SQLAlchemy engine & session factory
│   │   ├── ml/
│   │   │   ├── baseline_statistical.py  # Robust Median Absolute Deviation (MAD)
│   │   │   ├── explainability.py        # Non-causal signal explanations
│   │   │   ├── feature_pipeline.py      # Leak-free causal behavioral pipeline
│   │   │   ├── isolation_forest.py      # Scikit-learn Isolation Forest detector
│   │   │   └── supervised_models.py     # Random Forest / Logistic Regression
│   │   ├── models/
│   │   │   └── schemas.py               # SQLAlchemy ORM & Pydantic models
│   │   ├── monitoring/
│   │   │   └── drift_detector.py        # PSI & Kolmogorov-Smirnov algorithms
│   │   ├── services/
│   │   │   ├── alerting_engine.py       # Multi-rule alerting & deduplication
│   │   │   ├── ingestion_service.py     # CSV parsing & schema validation
│   │   │   ├── ml_service.py            # ML pipeline coordinator
│   │   │   └── synthetic_data_generator.py # Rich synthetic financial stream
│   │   └── main.py                      # FastAPI application & startup lifecycle
│   ├── tests/                           # 23 Automated Pytest Unit & Integration tests
│   │   ├── conftest.py
│   │   ├── test_alerting_engine.py
│   │   ├── test_anomaly_models.py
│   │   ├── test_api_endpoints.py
│   │   ├── test_csv_ingestion.py
│   │   ├── test_drift_monitoring.py
│   │   └── test_feature_engineering.py
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── charts/                  # Recharts components (PR curves, Volume, Score, PSI)
│   │   │   ├── common/                  # Badges, Modals, Technical Tooltips
│   │   │   └── layout/                  # Sidebar, Header, Metric Cards
│   │   ├── pages/
│   │   │   ├── Alerts.tsx               # Alert Center & Triage
│   │   │   ├── Dashboard.tsx            # KPI telemetry & overview
│   │   │   ├── DriftMonitoring.tsx      # PSI & KS test telemetry
│   │   │   ├── Ingestion.tsx            # CSV file upload & demo generator
│   │   │   ├── ModelEvaluation.tsx      # Supervised PR-curves & threshold sandbox
│   │   │   ├── Settings.tsx             # Methodology documentation
│   │   │   ├── Thresholds.tsx           # Policy engine & impact simulator
│   │   │   └── Transactions.tsx         # Transaction explorer & signals
│   │   ├── services/api.ts              # Typed API client
│   │   ├── types/index.ts               # Shared TypeScript interfaces
│   │   ├── App.tsx                      # Root application router
│   │   └── index.css                    # Tailwind CSS styling
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.ts
├── data/                                # Standard synthetic benchmark CSV files
│   ├── reference_baseline.csv
│   ├── synthetic_transactions_drifted.csv
│   ├── synthetic_transactions_labelled.csv
│   └── synthetic_transactions_unlabelled.csv
└── README.md
```

---

## 3. Key Methodologies & Mathematical Principles

### 3.1 Feature Engineering Without Data Leakage
- Transactions are ordered strictly by timestamp $t_1 \le t_2 \le \dots \le t_n$.
- Historical averages $\mu_{\text{prior}}$ and variance $\sigma^2_{\text{prior}}$ for any customer are computed strictly from events at $t < t_i$.
- Rolling counts (1-hour and 24-hour windows) scan backwards only within $(t_i - \Delta t, t_i]$.
- Missing columns (e.g. absent location or sender) trigger graceful fallback to robust population medians with logged indicators.

### 3.2 Anomaly Scoring vs. Calibrated Probability
- Isolation Forest measures average tree depth needed to isolate an instance.
- The raw decision function $s_{\text{raw}}$ is normalized:
  $$S_{\text{norm}} = \frac{s_{\max} - s_{\text{raw}}}{s_{\max} - s_{\min}}$$
- **Important**: $S_{\text{norm}} \in [0.0, 1.0]$ represents behavioral anomaly/isolation distance. It is **not** a calibrated probability of financial fraud.

### 3.3 Alerting Strategies
1. **Fixed**: User-defined static thresholds ($T_{\text{low}}, T_{\text{med}}, T_{\text{high}}, T_{\text{crit}}$).
2. **Quantile-Based**: Automatically aligned to score percentiles (e.g. 70th, 85th, 95th, 99th).
3. **Target Alert Volume**: Selects the threshold required to match analyst handling capacity (e.g. max 50 alerts/day).

### 3.4 Population Stability Index (PSI)
$$PSI = \sum_{b=1}^{B} \left( \%_{\text{Actual}, b} - \%_{\text{Expected}, b} \right) \times \ln\left( \frac{\%_{\text{Actual}, b}}{\%_{\text{Expected}, b}} \right)$$
- **PSI < 0.10**: Stable (no action required)
- **0.10 ≤ PSI < 0.25**: Moderate shift (warning state)
- **PSI ≥ 0.25**: Significant Drift (investigation & retraining recommended)

---

## 4. Local Setup & Execution Instructions

### Prerequisites
- Python 3.10+ (Python 3.13 supported)
- Node.js 18+ & npm

### 4.1 Backend Setup & Pytest Execution

```bash
cd /home/dexter/.gemini/antigravity/scratch/shieldai/backend

# Create virtual environment and activate
python3 -m venv ../.venv
source ../.venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run the automated Pytest test suite (23 tests)
PYTHONPATH=. pytest -v

# Start the FastAPI backend server
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
The backend server runs on `http://localhost:8000` (Interactive Swagger docs: `http://localhost:8000/docs`).

### 4.2 Frontend Setup & Launch

```bash
cd /home/dexter/.gemini/antigravity/scratch/shieldai/frontend

# Install dependencies
npm install

# Build for production (verifies TypeScript types)
npm run build

# Start the Vite development server
npm run dev -- --host 0.0.0.0 --port 5173
```
The frontend user interface opens at `http://localhost:5173`.
All `/api/*` network requests automatically reverse-proxy to the FastAPI server at `http://localhost:8000`.

---

## 5. End-to-End Workflow Verification

1. **Dashboard (`/`)**: View real transaction volume trends, score density histograms, and drift status.
2. **Data Ingestion (`/ingestion`)**:
   - Upload any CSV or click **"Load Labelled Stream"** to generate 1,500 transactions with verified fraud labels.
   - Click **"Load Drifted Batch"** to simulate an inflation spike and nocturnal transaction surge.
3. **Transactions (`/transactions`)**: Search by sender or transaction ID, inspect contributing behavioral signals (e.g. 8.4x above historical mean, 45s burst velocity, night window).
4. **Alert Center (`/alerts`)**: Group repeated alerts by sender, triage alerts to 'Under Review', 'Escalated', 'Resolved', or 'False Positive', and append audit notes.
5. **Threshold Sandbox (`/thresholds`)**: Test fixed, quantile, and target volume strategies. Run real-time simulation previews to project daily alert counts before committing.
6. **Drift Monitor (`/drift`)**: View feature PSI and KS statistics. Click **"Simulate Data Shift"** to observe live state transitions to "Significant Drift".
7. **Model Evaluation (`/evaluation`)**: Analyze Precision-Recall curves, PR-AUC, and interactively slide decision thresholds to view the trade-off between caught fraud (TP) and analyst alert noise (FP).
