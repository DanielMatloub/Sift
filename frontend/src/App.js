import { useState, useRef, useCallback } from "react";

export default function App() {
  const [image, setImage] = useState(null);
  const [imageData, setImageData] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }
      });
      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      setCameraActive(true);
    } catch (err) {
      alert("Camera access denied. Please allow camera access and try again.");
    }
  }

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  }

  function capturePhoto() {
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext("2d").drawImage(videoRef.current, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg");
    setImage(dataUrl);
    setImageData(dataUrl.split(",")[1]);
    setResult(null);
    stopCamera();
  }

  function handleUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setImage(ev.target.result);
      setImageData(ev.target.result.split(",")[1]);
      setResult(null);
    };
    reader.readAsDataURL(file);
  }

  async function analyze() {
    if (!imageData) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("http://localhost:8000/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: imageData, media_type: "image/jpeg" })
      });
      const data = await res.json();
      setResult(data);
    } catch (err) {
      setResult({ error: "Something went wrong. Try again." });
    }
    setLoading(false);
  }

  function reset() {
    setImage(null);
    setImageData(null);
    setResult(null);
    stopCamera();
  }

  return (
    <div style={{
      minHeight: "100vh", background: "#f5f5f3", fontFamily: "sans-serif",
      display: "flex", flexDirection: "column", alignItems: "center"
    }}>
      {/* Header */}
      <div style={{
        width: "100%", padding: "16px 24px", background: "#fff",
        borderBottom: "1px solid #e5e5e5", display: "flex", alignItems: "center"
      }}>
        <span style={{ fontWeight: "700", fontSize: "20px" }}>Sift</span>
      </div>

      <div style={{ width: "100%", maxWidth: "480px", padding: "24px 16px" }}>

        {/* Camera or image preview */}
        <div style={{
          width: "100%", aspectRatio: "1", background: "#e5e5e5",
          borderRadius: "16px", overflow: "hidden", position: "relative",
          marginBottom: "16px", display: "flex", alignItems: "center", justifyContent: "center"
        }}>
          {cameraActive && (
            <video ref={videoRef} autoPlay playsInline style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          )}
          {image && !cameraActive && (
            <img src={image} alt="captured" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          )}
          {!image && !cameraActive && (
            <span style={{ color: "#aaa", fontSize: "14px" }}>No image selected</span>
          )}
        </div>

        {/* Result */}
        {result && !loading && (
          <div style={{
            background: result.recyclable ? "#e8f5e9" : "#fce4ec",
            borderRadius: "12px", padding: "16px", marginBottom: "16px", textAlign: "center"
          }}>
            {result.error ? (
              <p style={{ color: "#888" }}>{result.error}</p>
            ) : (
              <>
                <div style={{ fontSize: "48px", marginBottom: "8px" }}>
                  {result.recyclable ? "♻️" : "🗑️"}
                </div>
                <div style={{ fontWeight: "700", fontSize: "20px", marginBottom: "4px" }}>
                  {result.recyclable ? "Recyclable" : "Not Recyclable"}
                </div>
                <div style={{ fontSize: "14px", color: "#555", marginBottom: "4px" }}>
                  {result.item}
                </div>
                <div style={{ fontSize: "13px", color: "#777" }}>
                  {result.reason}
                </div>
              </>
            )}
          </div>
        )}

        {loading && (
          <div style={{ textAlign: "center", marginBottom: "16px", color: "#888" }}>
            Analyzing...
          </div>
        )}

        {/* Buttons */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {!cameraActive && !image && (
            <>
              <button
                onClick={startCamera}
                style={{
                  padding: "14px", borderRadius: "10px", background: "#222",
                  color: "#fff", border: "none", fontSize: "15px", cursor: "pointer"
                }}
              >
                Take a photo
              </button>
              <label style={{
                padding: "14px", borderRadius: "10px", background: "#fff",
                color: "#222", border: "1px solid #ddd", fontSize: "15px",
                cursor: "pointer", textAlign: "center"
              }}>
                Upload a photo
                <input type="file" accept="image/*" onChange={handleUpload} style={{ display: "none" }} />
              </label>
            </>
          )}

          {cameraActive && (
            <button
              onClick={capturePhoto}
              style={{
                padding: "14px", borderRadius: "10px", background: "#222",
                color: "#fff", border: "none", fontSize: "15px", cursor: "pointer"
              }}
            >
              Capture
            </button>
          )}

          {image && !cameraActive && !loading && (
            <>
              {!result && (
                <button
                  onClick={analyze}
                  style={{
                    padding: "14px", borderRadius: "10px", background: "#222",
                    color: "#fff", border: "none", fontSize: "15px", cursor: "pointer"
                  }}
                >
                  Analyze
                </button>
              )}
              <button
                onClick={reset}
                style={{
                  padding: "14px", borderRadius: "10px", background: "#fff",
                  color: "#222", border: "1px solid #ddd", fontSize: "15px", cursor: "pointer"
                }}
              >
                Try another
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}