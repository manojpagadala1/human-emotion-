from flask import Flask, request, jsonify
from flask_cors import CORS
import sqlite3
from pathlib import Path
from datetime import datetime, timezone

app = Flask(__name__)
CORS(app)
DB_PATH = Path(__file__).with_name("emotions.db")
ALLOWED = {"happy", "sad", "crying", "angry", "fearful", "disgusted", "surprised", "neutral"}

def connect_db():
    db = sqlite3.connect(DB_PATH)
    db.row_factory = sqlite3.Row
    return db

def init_db():
    with connect_db() as db:
        db.execute("""CREATE TABLE IF NOT EXISTS emotion_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            emotion TEXT NOT NULL,
            confidence REAL NOT NULL,
            created_at TEXT NOT NULL
        )""")

@app.get("/api/health")
def health():
    return jsonify({"status": "ok", "message": "Emotion API is running"})

@app.get("/api/history")
def get_history():
    with connect_db() as db:
        rows = db.execute("SELECT id, emotion, confidence, created_at FROM emotion_history ORDER BY id DESC LIMIT 50").fetchall()
    return jsonify([dict(row) for row in rows])

@app.post("/api/history")
def save_history():
    data = request.get_json(silent=True) or {}
    emotion = str(data.get("emotion", "")).strip().lower()
    if emotion not in ALLOWED:
        return jsonify({"error": "Please provide a valid emotion label."}), 400
    try:
        confidence = float(data.get("confidence", 0))
    except (TypeError, ValueError):
        return jsonify({"error": "Confidence must be a number."}), 400
    confidence = max(0.0, min(1.0, confidence))
    created_at = datetime.now(timezone.utc).isoformat(timespec="seconds")
    with connect_db() as db:
        cur = db.execute("INSERT INTO emotion_history (emotion, confidence, created_at) VALUES (?, ?, ?)", (emotion, confidence, created_at))
        item_id = cur.lastrowid
    return jsonify({"id": item_id, "emotion": emotion, "confidence": confidence, "created_at": created_at}), 201

@app.delete("/api/history")
def clear_history():
    with connect_db() as db:
        db.execute("DELETE FROM emotion_history")
    return jsonify({"message": "History cleared"})

if __name__ == "__main__":
    init_db()
    app.run(host="127.0.0.1", port=5000, debug=True)
