import { useState } from "react";

export default function FileUpload({ onUpload }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleUpload = async () => {
    if (!file) return alert("Please select a file");

    const formData = new FormData();
    formData.append("file", file);

    setLoading(true);

    try {
      const res = await fetch("http://127.0.0.1:8000/upload", {
        method: "POST",
        body: formData,
        credentials: "include"
      });

      if (!res.ok) throw new Error("Upload failed");

      onUpload(); // refresh dashboard
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="upload-box">
      <input
        type="file"
        accept=".csv,.xlsx"
        onChange={(e) => setFile(e.target.files[0])}
      />
      <button onClick={handleUpload} disabled={loading}>
        {loading ? "Uploading..." : "Upload CSV"}
      </button>
    </div>
  );
}
