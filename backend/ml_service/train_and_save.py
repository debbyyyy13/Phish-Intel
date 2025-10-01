"""
train_and_save.py
- Hybrid training: first from CSVs, later from DB (TrainingEmail table)
"""

import os
import re
import joblib
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.preprocessing import StandardScaler
from imblearn.over_sampling import RandomOverSampler
from xgboost import XGBClassifier
from sklearn.metrics import classification_report
import nltk

nltk.download("punkt", quiet=True)
nltk.download("stopwords", quiet=True)
nltk.download("wordnet", quiet=True)

from nltk.tokenize import word_tokenize
from nltk.corpus import stopwords
from nltk.stem import WordNetLemmatizer

# ----------------------------
# TEXT PREPROCESSING
# ----------------------------
def clean_text(text):
    if not isinstance(text, str):
        return ""
    text = re.sub(r"http\S+|www\S+|https\S+", " ", text)
    text = re.sub(r"\S*@\S*\s?", " ", text)
    text = re.sub(r"[^a-zA-Z\s]", " ", text)
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

# ----------------------------
# LOAD DATA
# ----------------------------
def load_from_csv(files):
    dfs = []
    for f in files:
        try:
            df = pd.read_csv(f, on_bad_lines="skip", engine="python")
            text_col = next((c for c in ["body","text","message","email"] if c in df.columns), None)
            label_col = next((c for c in ["label","category","class","target"] if c in df.columns), None)
            if text_col and label_col:
                df = df[[text_col, label_col]].rename(columns={text_col:"text", label_col:"label"})
                dfs.append(df)
        except Exception as e:
            print(f"[WARN] could not load {f}: {e}")
    if not dfs:
        raise ValueError("No valid datasets found")
    return pd.concat(dfs, ignore_index=True)

def load_from_db(db, TrainingEmail):
    logs = TrainingEmail.query.all()
    if not logs:
        raise ValueError("No labeled samples in DB")
    data = [{"text": log.body, "label": log.label} for log in logs]
    return pd.DataFrame(data)

# ----------------------------
# TRAINING PIPELINE
# ----------------------------
def train_and_save(input_data, model_dir="ml_models", max_features=5000, from_db=False):
    os.makedirs(model_dir, exist_ok=True)

    if from_db:
        db, TrainingEmail = input_data
        print("[*] Loading from DB...")
        df = load_from_db(db, TrainingEmail)
    else:
        print("[*] Loading from CSVs...")
        df = load_from_csv(input_data)

    df["text"] = df["text"].fillna("").astype(str)
    df["cleaned"] = df["text"].apply(clean_text).apply(preprocess_text)
    df["label"] = df["label"].astype(int)

    tfidf = TfidfVectorizer(max_features=max_features, ngram_range=(1,2))
    X = tfidf.fit_transform(df["cleaned"])
    scaler = StandardScaler(with_mean=False)
    X_scaled = scaler.fit_transform(X)

    y = df["label"].values
    ros = RandomOverSampler(random_state=42)
    X_bal, y_bal = ros.fit_resample(X_scaled, y)

    X_train, X_test, y_train, y_test = train_test_split(X_bal, y_bal, test_size=0.2, stratify=y_bal)
    model = XGBClassifier(use_label_encoder=False, eval_metric="logloss", n_estimators=300, max_depth=6, learning_rate=0.08)
    model.fit(X_train.toarray(), y_train)

    preds = model.predict(X_test.toarray())
    print(classification_report(y_test, preds, digits=4))

    joblib.dump(model, os.path.join(model_dir,"xgb_model.pkl"))
    joblib.dump(tfidf, os.path.join(model_dir,"tfidf.pkl"))
    joblib.dump(scaler, os.path.join(model_dir,"scaler.pkl"))
    print(f"[OK] Saved models to {model_dir}")

    return model, tfidf, scaler

# ----------------------------
# ENTRYPOINT
# ----------------------------
if __name__ == "__main__":
    # Initial training from CSV
    files = [
        r"C:/Users/debby/OneDrive/Desktop/final year project/datasets/Phishing_validation_emails.csv",
        r"C:/Users/debby/OneDrive/Desktop/final year project/datasets/SpamAssasin.csv",
        # ... add the rest here ...
    ]
    train_and_save(files, model_dir="ml_models")
