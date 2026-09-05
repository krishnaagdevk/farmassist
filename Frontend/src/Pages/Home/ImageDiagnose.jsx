import { useState } from "react";
import axios from "axios";

export default function ImageDiagnose() {
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const uploadImage = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const form = new FormData();
      form.append("image", file);
      const res = await axios.post("/api/image/diagnose", form, {
        headers: { "Content-Type": "multipart/form-data" },
        Authorization: `Bearer ${localStorage.getItem("token")}`, 
      });
      setResult(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 bg-white rounded-2xl shadow-md">
      <h2 className="text-lg font-semibold mb-2">🌱 Diagnose Crop</h2>
      <input
        type="file"
        accept="image/*"
        onChange={(e) => setFile(e.target.files[0])}
        className="mb-2"
      />
      <button
        onClick={uploadImage}
        className="px-3 py-1 bg-green-600 text-white rounded-md"
      >
        {loading ? "Uploading..." : "Upload & Diagnose"}
      </button>
      {result && (
        <div className="mt-3 text-sm">
          <pre>{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
