"""
train_and_save.py
- End-to-end: load raw emails, extract features, train XGBoost, save artifacts
"""

import os
import pandas as pd
import joblib
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report
import xgboost as xgb

from feature_extraction import extract_features

# ==========================
# FILE PATHS (your datasets)
# ==========================
ZENODO_FILES = [
    r"C:/Users/debby/OneDrive/Desktop/final year project/datasets/Phishing_validation_emails.csv",
    r"C:/Users/debby/OneDrive/Desktop/final year project/datasets/SpamAssasin.csv",
    r"C:/Users/debby/OneDrive/Desktop/final year project/datasets/Phishing_Email (2).csv",
    r"C:/Users/debby/OneDrive/Desktop/final year project/datasets/phishing_email.csv",
    r"C:/Users/debby/OneDrive/Desktop/final year project/datasets/TREC_05.csv",
    r"C:/Users/debby/OneDrive/Desktop/final year project/datasets/TREC_06.csv",
    r"C:/Users/debby/OneDrive/Desktop/final year project/datasets/TREC_07.csv",
    r"C:/Users/debby/OneDrive/Desktop/final year project/datasets/CEAS_08.csv",
    r"C:/Users/debby/OneDrive/Desktop/final year project/datasets/Enron.csv",
    r"C:/Users/debby/OneDrive/Desktop/final year project/datasets/Ling.csv",
    r"C:/Users/debby/OneDrive/Desktop/final year project/datasets/Nazario_5.csv",
    r"C:/Users/debby/OneDrive/Desktop/final year project/datasets/Nigerian_Fraud.csv"
]

MODEL_DIR = "ml_models"
MODEL_PATH = os.path.join(MODEL_DIR, "email_detector.json")

FEATURE_NAMES = [
    "has_suspicious_tld", "sender_domain_age", "has_display_name_mismatch",
    "subject_length", "body_length", "has_urgent_keywords", "has_financial_keywords",
    "num_links", "num_external_links", "has_shortened_urls", "has_suspicious_attachments",
    "html_to_text_ratio", "has_hidden_text", "num_images", "is_reply", "time_of_day",
    "has_spf_pass", "has_dkim_pass"
]


def load_and_preprocess(files):
    dfs = []
    possible_text_cols = ["body", "text", "message", "email"]
    possible_label_cols = ["category", "label", "class", "target"]

    for f in files:
        try:
            df = pd.read_csv(f, on_bad_lines="skip", engine="python")
        except Exception as e:
            print(f"[WARN] Failed to read {f}: {e}")
            continue

        if df.empty:
            continue

        # Try to locate email + label columns
        text_col = next((c for c in possible_text_cols if c in df.columns), None)
        label_col = next((c for c in possible_label_cols if c in df.columns), None)

        if text_col and label_col:
            subset = df[[text_col, label_col]].rename(
                columns={text_col: "email_raw", label_col: "label"}
            )
            dfs.append(subset)
        else:
            print(f"[WARN] {f} missing expected text/label columns, skipping.")

    if not dfs:
        raise ValueError("No valid datasets loaded.")
    return pd.concat(dfs, ignore_index=True)


def map_to_binary_label(label):
    """Normalize labels into 0=legit, 1=phishing"""
    phishing_keywords = ["phishing", "spam", "fraud", "malicious", "attack", "1", 1]
    legit_keywords = ["legit", "ham", "safe", "nonspam", "0", 0]
    label_str = str(label).strip().lower()
    if label_str in [str(k) for k in phishing_keywords]:
        return 1
    elif label_str in [str(k) for k in legit_keywords]:
        return 0
    else:
        return -1


def train_and_save():
    os.makedirs(MODEL_DIR, exist_ok=True)

    print("[*] Loading datasets...")
    df = load_and_preprocess(ZENODO_FILES)

    print("[*] Mapping labels...")
    df["label"] = df["label"].apply(map_to_binary_label)
    df = df[df["label"].isin([0, 1])]

    print(f"[*] Extracting features from {len(df)} emails...")
    feature_dicts, labels = [], []

    for _, row in df.iterrows():
        feats = extract_features(str(row["email_raw"]))
        feature_dicts.append(feats)
        labels.append(row["label"])

    X = pd.DataFrame(feature_dicts)[FEATURE_NAMES]
    y = labels

    print(f"[*] Train/test split on {len(X)} samples...")
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    print("[*] Training XGBoost...")
    dtrain = xgb.DMatrix(X_train, label=y_train, feature_names=FEATURE_NAMES)
    dtest = xgb.DMatrix(X_test, label=y_test, feature_names=FEATURE_NAMES)

    params = {
        "objective": "binary:logistic",
        "eval_metric": ["auc", "logloss"],
        "max_depth": 6,
        "learning_rate": 0.1,
        "subsample": 0.8,
        "colsample_bytree": 0.8,
        "seed": 42,
    }

    model = xgb.train(
        params, dtrain, num_boost_round=200,
        evals=[(dtrain, "train"), (dtest, "test")],
        early_stopping_rounds=20, verbose_eval=20
    )

    print("[*] Evaluating...")
    y_pred = (model.predict(dtest) > 0.5).astype(int)
    print(classification_report(y_test, y_pred, target_names=["Legit", "Phish"]))

    model.save_model(MODEL_PATH)
    print(f"[OK] Saved model to {MODEL_PATH}")


if __name__ == "__main__":
    train_and_save()
