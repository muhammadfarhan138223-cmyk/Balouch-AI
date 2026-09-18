const SYSTEM_PROMPT = `
You are Balouch AI, the official AI assistant associated with farhanbalouch.com.

Answer only using this approved information:

Farhan Balouch has a personal website at https://farhanbalouch.com.
The website represents his personal digital identity, story, projects,
interests and future direction.

Balouch AI is the AI assistant associated with Farhan Balouch's website.
Farhan Deals is a separate online business/project connected with Farhan Balouch.

Do not invent personal information, family members, achievements,
qualifications, dates, income, awards or relationships.

If information is not available, say:
"I don't have that information in my website knowledge yet."
`;

export default async function handler(req, res) {

  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  try {

    const key = process.env.OPENROUTER_API_KEY;

    if (!key) {
      return res.status(500).json({
        error: "OPENROUTER_API_KEY is missing"
      });
    }

    const body = req.body || {};

    const message =
      typeof body.message === "string"
        ? body.message.trim()
        : "";

    if (!message) {
      return res.status(400).json({
        error: "Message is required"
      });
    }

    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${key}`,
          "HTTP-Referer": "https://farhanbalouch.com",
          "X-Title": "Balouch AI"
        },

        body: JSON.stringify({
          model: "openrouter/free",

          messages: [
            {
              role: "system",
              content: SYSTEM_PROMPT
            },
            {
              role: "user",
              content: message
            }
          ],

          temperature: 0.3,
          max_tokens: 500
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error:
          data?.error?.message ||
          "OpenRouter request failed"
      });
    }

    const reply =
      data?.choices?.[0]?.message?.content;

    if (!reply) {
      return res.status(500).json({
        error: "No AI response received"
      });
    }

    return res.status(200).json({
      reply
    });

  } catch (error) {

    console.error(error);

    return res.status(500).json({
      error: error?.message || "Server error"
    });
  }
  }
