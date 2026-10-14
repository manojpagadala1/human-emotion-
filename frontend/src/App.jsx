import { useEffect, useRef, useState } from "react";
import * as faceapi from "@vladmandic/face-api";
import "./styles.css";

const API = "http://127.0.0.1:5000/api";
const MODELS = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model";
const LABELS = { happy: "Happy", sad: "Sad", crying: "Crying", angry: "Angry", fearful: "Fearful", disgusted: "Disgusted", surprised: "Surprised", neutral: "Neutral" };
const EMOJI = { happy: "😊", sad: "😢", crying: "😭", angry: "😠", fearful: "😨", disgusted: "😖", surprised: "😲", neutral: "😐" };

export default function App() {
  const video = useRef(null), stream = useRef(null), timer = useRef(null), busy = useRef(false);
  const [cameraOn, setCameraOn] = useState(false), [modelReady, setModelReady] = useState(false);
  const [loading, setLoading] = useState(false), [status, setStatus] = useState("Camera is off");
  const [prediction, setPrediction] = useState(null), [history, setHistory] = useState([]), [error, setError] = useState("");
  const [expressionScores, setExpressionScores] = useState(null);

  async function refreshHistory() {
    try { const r = await fetch(`${API}/history`); if (!r.ok) throw Error(); setHistory(await r.json()); }
    catch { setError("Start the Flask backend in the backend terminal to load/save history."); }
  }
  useEffect(() => { refreshHistory(); return () => stopCamera(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function startCamera() {
    setLoading(true); setError("");
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw Error("Camera access needs a modern browser and localhost or HTTPS.");
      setStatus("Loading expression model…");
      if (!modelReady) {
        await Promise.all([faceapi.nets.tinyFaceDetector.loadFromUri(MODELS), faceapi.nets.faceExpressionNet.loadFromUri(MODELS)]);
        setModelReady(true);
      }
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } }, audio: false });
      stream.current = s; video.current.srcObject = s; await video.current.play();
      setCameraOn(true); setStatus("Camera on — looking for a face");
      timer.current = window.setInterval(detect, 900);
    } catch (e) { setStatus("Camera could not start"); setError(e.message || "Allow camera permission and try again."); }
    finally { setLoading(false); }
  }
  function stopCamera() {
    if (timer.current) clearInterval(timer.current); timer.current = null;
    if (stream.current) stream.current.getTracks().forEach(t => t.stop()); stream.current = null;
    if (video.current) video.current.srcObject = null;
    setCameraOn(false); setStatus("Camera is off");
  }
  async function detect() {
    if (busy.current || !video.current || video.current.readyState < 2 || !video.current.videoWidth) return;
    busy.current = true;
    try {
      const result = await faceapi.detectSingleFace(video.current, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.45 })).withFaceExpressions();
      if (!result) { setPrediction(null); setExpressionScores(null); setStatus("No face detected — face the camera and improve lighting"); return; }
      setExpressionScores(result.expressions);
      const [emotion, confidence] = Object.entries(result.expressions).sort((a,b) => b[1]-a[1])[0];
      setPrediction({ emotion, confidence }); setStatus("Expression estimate updated");
    } catch { setStatus("Could not analyze this frame"); }
    finally { busy.current = false; }
  }
  async function saveSnapshot() {
    if (!prediction) return; setError("");
    try { const r = await fetch(`${API}/history`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(prediction) }); const data = await r.json(); if (!r.ok) throw Error(data.error || "Could not save result"); setHistory(old => [data, ...old].slice(0,50)); }
    catch { setError("Could not save. Check that the Flask backend is running."); }
  }
  async function clearHistory() {
    try { const r = await fetch(`${API}/history`, { method: "DELETE" }); if (!r.ok) throw Error(); setHistory([]); }
    catch { setError("Could not clear history. Check the backend."); }
  }
  const pct = prediction ? Math.round(prediction.confidence * 100) : 0;
  const counts = history.reduce((a, x) => ((a[x.emotion] = (a[x.emotion] || 0) + 1), a), {});
  const mostSaved = Object.entries(counts).sort((a,b) => b[1]-a[1])[0]?.[0];

  return <main className="app-shell">
    <header className="topbar"><div className="brand-mark">◎</div><div><span className="eyebrow">CAMERA • COMPUTER VISION</span><h1>Human Emotion <span>Prediction</span></h1></div><div className={`live-pill ${cameraOn ? "active" : ""}`}><i/>{cameraOn ? "CAMERA LIVE" : "CAMERA OFF"}</div></header>
    <section className="intro"><div><p className="eyebrow">YOUR EXPRESSION, ESTIMATED</p><h2>A little window into<br/>facial expressions.</h2><p className="intro-copy">Start your camera to estimate the facial expression visible in the frame. Results are approximate, not a diagnosis of how someone truly feels.</p></div><div className="privacy-note"><span>◈</span><div><strong>Privacy by design</strong><p>Video is processed in your browser. Camera frames are not sent to the server.</p></div></div></section>
    {error && <div className="error-banner" role="alert">{error}</div>}
    <section className="dashboard">
      <div className="camera-card panel"><div className="section-heading"><div><span className="step">01</span><h3>Live camera</h3></div><span className="small-status"><i className={cameraOn ? "green-dot" : ""}/>{status}</span></div>
        <div className={`video-frame ${cameraOn ? "is-live" : ""}`}><video ref={video} autoPlay muted playsInline/>{!cameraOn && <div className="camera-placeholder"><div className="camera-icon">⌾</div><strong>Your camera preview</strong><span>Allow camera access when your browser asks</span></div>}{cameraOn && <><div className="scan-corners"><b/><b/><b/><b/></div><div className="frame-label"><i/> LIVE ANALYSIS</div></>}</div>
        <div className="camera-actions">{!cameraOn ? <button className="primary-btn" onClick={startCamera} disabled={loading}>{loading ? "Preparing camera…" : "Start camera →"}</button> : <button className="secondary-btn" onClick={stopCamera}>Stop camera</button>}<span className="hint">Camera permission is required</span></div>
      </div>
      <div className="result-card panel"><div className="section-heading"><div><span className="step">02</span><h3>Expression estimate</h3></div><span className="model-chip">{modelReady ? "MODEL READY" : "AI MODEL"}</span></div>
        <div className="result-content"><div className={`emotion-emoji ${prediction ? "has-result" : ""}`}>{prediction ? EMOJI[prediction.emotion] : "◌"}</div><p className="result-label">{prediction ? "CURRENT ESTIMATE" : "WAITING FOR A FACE"}</p><h2>{prediction ? LABELS[prediction.emotion] : "No result yet"}</h2><p className="result-description">{prediction ? "This is the expression the model estimates from the current camera frame." : "Start the camera and look toward it. Your result will appear here."}</p><div className="confidence-row"><span>Model score</span><strong>{prediction ? `${pct}%` : "—"}</strong></div><div className="progress-track"><div style={{width:`${pct}%`}}/></div><p className="disclaimer">Model score is not the same as certainty about a person's real emotion.</p></div>
        <div className="expression-breakdown">
          <h4>Expression scores</h4>
          <div className="expression-grid">
            {Object.keys(LABELS).map(emotion => <div className="expression-item" key={emotion}>
              <span>{EMOJI[emotion]} {LABELS[emotion]}</span>
              <strong>{emotion === "crying" ? "Not detected by model" : expressionScores ? `${Math.round(expressionScores[emotion] * 100)}%` : "—"}</strong>
            </div>)}
          </div>
          <p>Crying is listed for reference, but this model does not detect it.</p>
        </div>
        <button className="primary-btn save-btn" onClick={saveSnapshot} disabled={!prediction}>Save snapshot to history ↓</button>
      </div>
    </section>
    <section className="history-section panel"><div className="section-heading history-heading"><div><span className="step">03</span><div><h3>Saved history</h3><p>Snapshots you chose to save</p></div></div><button className="text-btn" onClick={clearHistory} disabled={!history.length}>Clear history</button></div>
      <div className="stat-grid"><div className="stat-card"><span>Saved snapshots</span><strong>{history.length}</strong><small>Stored in SQLite</small></div><div className="stat-card"><span>Most saved label</span><strong>{mostSaved ? LABELS[mostSaved] : "—"}</strong><small>Based on saved estimates</small></div><div className="stat-card"><span>Available labels</span><strong>8</strong><small>Expression categories</small></div></div>
      {history.length ? <div className="history-list">{history.map(x => <div className="history-item" key={x.id}><div className="history-emoji">{EMOJI[x.emotion] || "😐"}</div><div className="history-name"><strong>{LABELS[x.emotion] || x.emotion}</strong><span>{new Date(x.created_at).toLocaleString()}</span></div><div className="history-score">{Math.round(x.confidence*100)}%<span>model score</span></div></div>)}</div> : <div className="empty-history"><span>▤</span><p>No saved snapshots yet.</p><small>Start the camera, wait for an estimate, then save it.</small></div>}
    </section><footer><span>HUMAN EMOTION PREDICTION SYSTEM</span><span>React · Face API · Flask · SQLite</span></footer>
  </main>;
}
