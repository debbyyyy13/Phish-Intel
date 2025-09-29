import React, { useState } from "react";
import { api } from "../api";  // ✅ use named import

export default function SubmitEmail() {
  const [sender, setSender] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [result, setResult] = useState(null);

  async function submit() {
    try {
      const userToken = sessionStorage.getItem("phish_token"); // ✅ stay consistent with auth
      let user_id = 1;

      // ⚠️ NOTE: JWTs are not plain base64 JSON → you should decode with a lib like jwt-decode.
      // For now, fallback to static demo.
      try {
        const decoded = JSON.parse(atob(userToken.split(".")[1])); 
        user_id = decoded.sub || decoded.user_id || 1;
      } catch (_) {}

      const res = await api.post("/classify", {
        sender,
        subject,
        body,
        user_id,
      });

      setResult(res.data);
    } catch (err) {
      console.error("❌ Submit failed:", err);
      alert("Submit failed");
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="bg-white p-6 rounded shadow dark:bg-gray-900 dark:text-white">
        <h2 className="text-xl font-semibold mb-4">
          Submit email for scanning
        </h2>
        <input
          placeholder="Sender"
          value={sender}
          onChange={(e) => setSender(e.target.value)}
          className="w-full border p-2 rounded mb-3 dark:bg-gray-800 dark:border-gray-600"
        />
        <input
          placeholder="Subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="w-full border p-2 rounded mb-3 dark:bg-gray-800 dark:border-gray-600"
        />
        <textarea
          placeholder="Body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="w-full border p-2 rounded mb-3 dark:bg-gray-800 dark:border-gray-600"
          rows={8}
        />
        <button
          onClick={submit}
          className="btn bg-phishblue-500 text-white px-4 py-2 rounded"
        >
          Scan
        </button>

        {result && (
          <div className="mt-4">
            <pre className="bg-gray-50 dark:bg-gray-800 p-3 rounded text-sm">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
