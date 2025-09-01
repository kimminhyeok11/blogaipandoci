// This is a Vercel Serverless Function that acts as a secure proxy for the Gemini API.
// It should be placed in the `api` directory of your project.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { type, payload } = req.body;
  // Get key securely from Vercel Environment Variables
  const apiKey = process.env.GEMINI_API_KEY; 

  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured on the server.' });
  }

  let apiUrl;
  let apiPayload;

  if (type === 'text') {
    apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;
    apiPayload = payload;
  } else if (type === 'image') {
    apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey}`;
    apiPayload = payload;
  } else {
    return res.status(400).json({ error: 'Invalid request type specified.' });
  }

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(apiPayload),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('Google AI API Error:', errorBody);
      return res.status(response.status).json({ error: `AI API error: ${response.statusText}` });
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    console.error('Proxy function error:', error);
    return res.status(500).json({ error: 'Internal Server Error in proxy function.' });
  }
}
