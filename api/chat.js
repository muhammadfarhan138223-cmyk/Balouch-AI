export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "HTTP-Referer": "https://farhanbalouch.com",
          "X-Title": "Balouch AI"
        },
        body: JSON.stringify({
          model: "google/gemini-2.0-flash-exp:free",
          messages: [
            {
              role: "system",
              content: `You are Balouch AI, the official AI assistant for farhanbalouch.com.

Your job is to answer questions ONLY using approved information about Farhan Balouch and his website.

Do not invent personal information.
Do not pretend to know information that is not provided.
If the requested information is unavailable, say:
"I don't have that information in my website knowledge yet."

Be helpful, natural, concise and professional.`
            },
            {
              role: "user",
              content: message
            }
          ]
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data.error?.message || "AI request failed"
      });
    }

    const reply =
      data.choices?.[0]?.message?.content ||
      "I couldn't generate a response.";

    return res.status(200).json({ reply });

  } catch (error) {
    return res.status(500).json({
      error: "Server error"
    });
  }
          }
