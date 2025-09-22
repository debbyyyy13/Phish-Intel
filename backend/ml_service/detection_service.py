"""
detection_service.py
- Library functions for runtime classification and quarantine-first flow.
- Designed to be used inside Flask app context (so SQLAlchemy `db` is available).
"""

import os
import joblib
import logging
from math import ceil
from datetime import datetime
from config import Config
from models import db, Email, Quarantine, User

MODEL_DIR = os.getenv("MODEL_DIR", Config.MODEL_DIR)
PRED_BATCH_SIZE = int(os.getenv("PRED_BATCH_SIZE", Config.PRED_BATCH_SIZE))

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# lazy-loaded artifacts
_model = None
_tfidf = None
_scaler = None

def load_artifacts():
    global _model, _tfidf, _scaler
    if _model is None:
        _model = joblib.load(os.path.join(MODEL_DIR, "xgb_model.pkl"))
        logger.info("Loaded xgb_model.pkl")
    if _tfidf is None:
        _tfidf = joblib.load(os.path.join(MODEL_DIR, "tfidf.pkl"))
        logger.info("Loaded tfidf.pkl")
    if _scaler is None:
        _scaler = joblib.load(os.path.join(MODEL_DIR, "scaler.pkl"))
        logger.info("Loaded scaler.pkl")
    return _model, _tfidf, _scaler

def _sanitize(e):
    return {
        "sender": (e.get("sender") or "")[:255],
        "subject": (e.get("subject") or "")[:500],
        "body": (e.get("body") or ""),
        "user_id": e.get("user_id")
    }

def _batch_predict(texts):
    """
    Predict on a list of texts, return list of (label_int, score)
    label_int: 1 -> phishing, 0 -> legit
    score: probability for class 1 (None if unavailable)
    """
    model, tfidf, scaler = load_artifacts()
    results = []
    n = len(texts)
    if n == 0:
        return results

    for start in range(0, n, PRED_BATCH_SIZE):
        block = texts[start:start + PRED_BATCH_SIZE]
        X = tfidf.transform(block)  # sparse
        # scale (StandardScaler with_mean=False supports sparse)
        Xs = scaler.transform(X)
        # XGBoost needs dense array
        if hasattr(Xs, "toarray"):
            Xp = Xs.toarray()
        else:
            Xp = Xs
        if hasattr(model, "predict_proba"):
            proba = model.predict_proba(Xp)
            preds = model.predict(Xp)
            for p, prob in zip(preds, proba):
                score = float(prob[1]) if len(prob) > 1 else None
                results.append((int(p), score))
        else:
            preds = model.predict(Xp)
            for p in preds:
                results.append((int(p), None))
    return results

def classify_emails(payload):
    """
    payload: either:
      - {'sender':..., 'subject':..., 'body':..., 'user_id':...}
      - or {'emails': [ {...}, {...} , ... ]}
    Returns: {'count': n, 'results': [ { 'quarantine_id'|'email_id', 'prediction', 'score' }, ... ]}
    Side effect: writes to DB. Must be called inside Flask app context.
    """
    if payload is None:
        raise ValueError("payload is None")

    # normalize
    if isinstance(payload, dict) and "emails" in payload and isinstance(payload["emails"], list):
        inputs = [ _sanitize(e) for e in payload["emails"] ]
    else:
        # single message form
        inputs = [ _sanitize(payload if isinstance(payload, dict) else {}) ]

    texts = [i["body"] for i in inputs]
    preds = _batch_predict(texts)

    results = []
    for inp, (label_int, score) in zip(inputs, preds):
        user_id = inp.get("user_id")
        label_name = "phish" if label_int == 1 else "legit"

        if label_name == "phish":
            q = Quarantine(
                user_id = user_id,
                subject = inp.get("subject"),
                body = inp.get("body"),
                prediction = label_name,
                quarantined_at = datetime.utcnow(),
                released = False
            )
            db.session.add(q)
            db.session.commit()
            results.append({"quarantine_id": q.id, "prediction": label_name, "score": score})
        else:
            em = Email(
                user_id = user_id,
                subject = inp.get("subject"),
                body = inp.get("body"),
                prediction = label_name,
                created_at = datetime.utcnow()
            )
            db.session.add(em)
            db.session.commit()
            results.append({"email_id": em.id, "prediction": label_name, "score": score})

    return {"count": len(results), "results": results}

def release_from_quarantine(q_id):
    """
    Move quarantined row -> emails and mark released=True.
    Returns {"status":"released","email_id":...} or None if not found.
    Must be called inside Flask app context.
    """
    q = Quarantine.query.get(q_id)
    if q is None:
        return None

    # insert into emails as legit
    em = Email(
        user_id = q.user_id,
        subject = q.subject,
        body = q.body,
        prediction = "legit",
        created_at = datetime.utcnow()
    )
    db.session.add(em)
    q.released = True
    db.session.commit()
    return {"status": "released", "email_id": em.id}
