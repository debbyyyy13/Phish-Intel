"""
train_and_save.py
- Full preprocessing + training pipeline
- Saves artifacts: xgb_model.pkl, tfidf.pkl, scaler.pkl in models/
"""

import os
import re
import joblib
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.preprocessing import StandardScaler
from imblearn.over_sampling import RandomOverSampler
from xgboost import XGBClassifier
import nltk

from nltk.tokenize import word_tokenize
from nltk.corpus import stopwords
from nltk.stem import WordNetLemmatizer
from sklearn.metrics import classification_report

# ensure nltk datasets are present
nltk.download("punkt", quiet=True)
nltk.download("stopwords", quiet=True)
nltk.download("wordnet", quiet=True)

# ======================
# TEXT + LABEL HANDLING
# ======================

def map_to_binary_label(label):
    phishing_keywords = ["phishing", "spam", "fraud", "malicious", "attack", "1", 1]
    legit_keywords = ["legit", "ham", "safe", "nonspam", "0", 0]
    label_str = str(label).strip().lower()
    if label_str in [str(k) for k in phishing_keywords]:
        return 1
    elif label_str in [str(k) for k in legit_keywords]:
        return 0
    else:
        return -1

def clean_text(text):
    if not isinstance(text, str):
        return ""
    text = re.sub(r"http\S+|www\S+|https\S+", " ", text)  # strip urls
    text = re.sub(r"\S*@\S*\s?", " ", text)  # strip emails
    text = re.sub(r"[^a-zA-Z\s]", " ", text)  # keep only letters
    return text.lower().strip()

def preprocess_text(text):
    try:
        stop_words = set(stopwords.words("english"))
        lemmatizer = WordNetLemmatizer()
        tokens = word_tokenize(text)
        processed = [lemmatizer.lemmatize(w) for w in tokens if w not in stop_words]
        return " ".join(processed)
    except Exception:
        return text

# ======================
# DATA LOADING
# ======================

def load_and_concatenate(files):
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

        text_col = next((c for c in possible_text_cols if c in df.columns), None)
        label_col = next((c for c in possible_label_cols if c in df.columns), None)

        if text_col and label_col:
            df = df[[text_col, label_col]].rename(columns={text_col: "text", label_col: "label"})
            dfs.append(df)
        else:
            print(f"[WARN] {f} missing expected text/label columns, skipping.")

    if not dfs:
        raise ValueError("No valid datasets loaded.")
    return pd.concat(dfs, ignore_index=True)

# ======================
# TRAINING PIPELINE
# ======================

def train_and_save(zenodo_files, model_dir="models", max_features=5000):
    os.makedirs(model_dir, exist_ok=True)
    print("[*] Loading datasets...")
    df = load_and_concatenate(zenodo_files)

    print("[*] Cleaning and preprocessing text...")
    df["text"] = df["text"].fillna("").astype(str)
    df["label"] = df["label"].fillna("").apply(map_to_binary_label)
    df = df[df["label"].isin([0, 1])]
    df["cleaned"] = df["text"].apply(clean_text).apply(preprocess_text)

    print("[*] Vectorizing (TF-IDF)...")
    tfidf = TfidfVectorizer(max_features=max_features, ngram_range=(1, 2))
    X = tfidf.fit_transform(df["cleaned"])

    print("[*] Scaling features...")
    scaler = StandardScaler(with_mean=False)
    X_scaled = scaler.fit_transform(X).astype(np.float32)

    y = df["label"].values

    print("[*] Balancing with RandomOverSampler...")
    ros = RandomOverSampler(random_state=42)
    X_bal, y_bal = ros.fit_resample(X_scaled, y)

    print("[*] Train/test split...")
    X_train, X_test, y_train, y_test = train_test_split(
        X_bal, y_bal, test_size=0.2, random_state=42, stratify=y_bal
    )

    print("[*] Training XGBoost model...")
    model = XGBClassifier(
        use_label_encoder=False,
        eval_metric="logloss",
        n_estimators=300,
        max_depth=6,
        learning_rate=0.08,
        random_state=42
    )

    if hasattr(X_train, "toarray"):
        X_train_np = X_train.toarray()
        X_test_np = X_test.toarray()
    else:
        X_train_np = X_train
        X_test_np = X_test

    model.fit(X_train_np, y_train)

    print("[*] Evaluating on holdout...")
    preds = model.predict(X_test_np)
    print(classification_report(y_test, preds, digits=4))

    # Save artifacts
    joblib.dump(model, os.path.join(model_dir, "xgb_model.pkl"))
    joblib.dump(tfidf, os.path.join(model_dir, "tfidf.pkl"))
    joblib.dump(scaler, os.path.join(model_dir, "scaler.pkl"))

    print(f"[OK] Saved artifacts to {model_dir}")
    return model, tfidf, scaler

# ======================
# HARDCODED DATASETS
# ======================

if __name__ == "__main__":
    zenodo_files = [
        r"C:/Users/debby/OneDrive\Desktop/final year project/datasets/Phishing_validation_emails.csv",
        r"C:/Users/debby/OneDrive\Desktop/final year project/datasets/SpamAssasin.csv",
        r"C:/Users/debby/OneDrive\Desktop/final year project/datasets/Phishing_Email (2).csv",
        r"C:/Users/debby/OneDrive\Desktop/final year project/datasets/phishing_email.csv",
        r"C:/Users/debby/OneDrive\Desktop/final year project/datasets/TREC_05.csv",
        r"C:/Users/debby/OneDrive\Desktop/final year project/datasets/TREC_06.csv",
        r"C:/Users/debby/OneDrive\Desktop/final year project/datasets/TREC_07.csv",
        r"C:/Users/debby/OneDrive\Desktop/final year project/datasets/CEAS_08.csv",
        r"C:/Users/debby/OneDrive\Desktop/final year project/datasets/Enron.csv",
        r"C:/Users/debby/OneDrive\Desktop/final year project/datasets/Ling.csv",
        r"C:/Users/debby/OneDrive\Desktop/final year project/datasets/Nazario_5.csv",
        r"C:/Users/debby/OneDrive\Desktop/final year project/datasets/Nigerian_Fraud.csv"
    ]

    train_and_save(zenodo_files, model_dir="models", max_features=5000)
