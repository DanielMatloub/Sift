import { useState } from "react";

export default function App() {
  const [image, setImage] = useState(null);
  const [imageData, setImageData] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

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
      const res = await fetch("https://sift-production-ebf0.up.railway.app/analyze", {
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

  async function handleCheckout() {
    const res = await fetch("https://sift-production-ebf0.up.railway.app/create-checkout-session", {
      method: "POST"
    });
    const data = await res.json();
    window.location.href = data.url;
  }

  function reset() {
    setImage(null);
    setImageData(null);
    setResult(null);
  }

  const disposalColor = (disposal) => {
    if (disposal === "recycle") return "#388e3c";
    if (disposal === "compost") return "#f57f17";
    return "#c62828";
  };

  return (
    <div style={{
      minHeight: "100vh", background: "#f5f5f3", fontFamily: "sans-serif",
      display: "flex", flexDirection: "column", alignItems: "center"
    }}>
      <div style={{
        width: "100%", padding: "16px 24px", background: "#fff",
        borderBottom: "1px solid #e5e5e5", display: "flex", alignItems: "center"
      }}>
        <span style={{ fontWeight: "700", fontSize: "20px" }}>Sift</span>
      </div>

      <div style={{ width: "100%", maxWidth: "480px", padding: "24px 16px" }}>

        <div style={{
          width: "100%", aspectRatio: "1", background: "#e5e5e5",
          borderRadius: "16px", overflow: "hidden", position: "relative",
          marginBottom: "16px", display: "flex", alignItems: "center", justifyContent: "center"
        }}>
          {image ? (
            <>
              <img src={image} alt="captured" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              {result && result.items && result.items.map((item, i) => (
                item.bbox && (
                  <div key={i} style={{
                    position: "absolute",
                    top: `${item.bbox.top}%`,
                    left: `${item.bbox.left}%`,
                    width: `${item.bbox.width}%`,
                    height: `${item.bbox.height}%`,
                    border: `2px solid ${disposalColor(item.disposal)}`,
                    borderRadius: "4px",
                    boxSizing: "border-box"
                  }}>
                    <div style={{
                      position: "absolute", top: "-20px", left: "0",
                      background: disposalColor(item.disposal),
                      color: "#fff", fontSize: "10px", padding: "1px 5px",
                      borderRadius: "3px", whiteSpace: "nowrap"
                    }}>
                      {item.disposal === "recycle" ? "♻️" : item.disposal === "compost" ? "🌱" : "🗑️"} {item.item}
                    </div>
                  </div>
                )
              ))}
            </>
          ) : (
            <span style={{ color: "#aaa", fontSize: "14px" }}>No image selected</span>
          )}
        </div>

        {result && !loading && (
          result.error === "limit_reached" ? (
            <div style={{ textAlign: "center", padding: "16px", background: "#fff", borderRadius: "12px", marginBottom: "16px" }}>
              <div style={{ fontSize: "32px", marginBottom: "12px" }}>🔒</div>
              <p style={{ fontWeight: "600", fontSize: "16px", marginBottom: "8px" }}>You've used your 10 free analyses</p>
              <p style={{ color: "#666", fontSize: "14px", marginBottom: "20px" }}>Unlock unlimited analyses for a one-time payment of $3.</p>
              <button
                onClick={handleCheckout}
                style={{ background: "#222", color: "#fff", border: "none", padding: "12px 24px", borderRadius: "8px", fontSize: "15px", cursor: "pointer", width: "100%" }}
              >
                Unlock unlimited — $3
              </button>
            </div>
          ) : result.error ? (
            <div style={{ background: "#fce4ec", borderRadius: "12px", padding: "16px", marginBottom: "16px", textAlign: "center" }}>
              <p style={{ color: "#888" }}>{result.error}</p>
            </div>
          ) : (
            <div style={{ marginBottom: "16px" }}>
              {result.items.map((item, i) => (
                <div key={i} style={{
                  background: item.disposal === "recycle" ? "#e8f5e9" : item.disposal === "compost" ? "#fff8e1" : "#fce4ec",
                  borderRadius: "12px", padding: "14px 16px", marginBottom: "10px",
                  display: "flex", alignItems: "flex-start", gap: "12px"
                }}>
                  <div style={{ fontSize: "28px", flexShrink: 0 }}>
                    {item.disposal === "recycle" ? "♻️" : item.disposal === "compost" ? "🌱" : "🗑️"}
                  </div>
                  <div>
                    <div style={{ fontWeight: "700", fontSize: "15px", marginBottom: "2px" }}>{item.item}</div>
                    <div style={{ fontSize: "12px", color: "#555", textTransform: "capitalize", marginBottom: "4px" }}>{item.disposal}</div>
                    <div style={{ fontSize: "13px", color: "#777" }}>{item.reason}</div>
                  </div>
                </div>
              ))}
              {result.analyses_remaining !== undefined && result.analyses_remaining <= 3 && (
                <p style={{ color: "#888", fontSize: "12px", marginTop: "8px", textAlign: "center" }}>
                  {result.analyses_remaining} free {result.analyses_remaining === 1 ? "analysis" : "analyses"} remaining.
                </p>
              )}
            </div>
          )
        )}

        {loading && (
          <div style={{ textAlign: "center", marginBottom: "16px", color: "#888" }}>
            Analyzing...
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {!image && (
            <label style={{
              padding: "14px", borderRadius: "10px", background: "#222",
              color: "#fff", border: "none", fontSize: "15px",
              cursor: "pointer", textAlign: "center", display: "block"
            }}>
              Take or upload a photo
              <input type="file" accept="image/*" capture="environment" onChange={handleUpload} style={{ display: "none" }} />
            </label>
          )}

          {image && !loading && (
            <>
              {!result && (
                <button
                  onClick={analyze}
                  style={{ padding: "14px", borderRadius: "10px", background: "#222", color: "#fff", border: "none", fontSize: "15px", cursor: "pointer" }}
                >
                  Analyze
                </button>
              )}
              <button
                onClick={reset}
                style={{ padding: "14px", borderRadius: "10px", background: "#fff", color: "#222", border: "1px solid #ddd", fontSize: "15px", cursor: "pointer" }}
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