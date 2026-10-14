# Human Emotion Prediction System — Camera Edition

A React + JavaScript camera interface estimates visible facial expressions with the pre-trained `@vladmandic/face-api` model. A Python Flask REST API stores only user-selected emotion labels, model scores, and timestamps in SQLite.

## Features
- Click **Start camera** and grant camera permission.
- Live webcam preview with scores for the model's seven expressions: Happy, Sad, Angry, Fearful, Disgusted, Surprised, and Neutral. Crying is shown as a reference label but is not detected by this model.
- Save a prediction to SQLite history, view prior saved estimates, and clear history.
- Camera frames are processed in the browser and are not uploaded to the backend.

## Requirements
Python 3.10+, Node.js/npm, a modern browser. Camera access works on `localhost` or HTTPS. Model files are loaded from jsDelivr, so internet access is required.

## Start the backend
In VS Code terminal 1:
```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
python app.py
```
If PowerShell blocks activation, run `python -m pip install -r requirements.txt` and then `python app.py` in the same terminal.

## Start the frontend
In VS Code terminal 2:
```powershell
cd frontend
npm install
npm run dev
```
Open the local URL printed by Vite, usually `http://localhost:5173`.

## Honest project explanation
This version uses a pre-trained facial-expression model, not a model trained by the student. Facial-expression software cannot reliably know a person's actual inner feelings; treat the displayed category as an estimate. Get permission before using a camera. No face identity recognition is performed.
