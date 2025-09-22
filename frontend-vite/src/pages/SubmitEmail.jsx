import React, {useState} from "react";
import Header from "../components/Header"
import client from "../api";

export default function SubmitEmail(){
  const [sender, setSender] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [result, setResult] = useState(null);

  async function submit(){
    try{
      const userToken = localStorage.getItem('phish_token');
      // decode simple token for user id (demo only)
      let user_id = 1;
      try {
        const decoded = JSON.parse(atob(userToken));
        user_id = decoded.user_id || 1;
      } catch (_) {}

      const res = await client.post('/classify', {
        sender, subject, body, user_id
      });
      setResult(res.data);
    }catch(err){
      console.error(err);
      alert('submit failed');
    }
  }

  return (
    <>
      <Header />
      <div className="max-w-3xl mx-auto p-6">
        <div className="bg-white p-6 rounded shadow">
          <h2 className="text-xl font-semibold mb-4">Submit email for scanning</h2>
          <input placeholder="sender" value={sender} onChange={e=>setSender(e.target.value)} className="w-full border p-2 rounded mb-3" />
          <input placeholder="subject" value={subject} onChange={e=>setSubject(e.target.value)} className="w-full border p-2 rounded mb-3" />
          <textarea placeholder="body" value={body} onChange={e=>setBody(e.target.value)} className="w-full border p-2 rounded mb-3" rows={8}/>
          <button onClick={submit} className="btn bg-phishblue-500 text-white">Scan</button>

          {result && (
            <div className="mt-4">
              <pre className="bg-gray-50 p-3 rounded text-sm">{JSON.stringify(result, null, 2)}</pre>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
