const VECTOR_STORE_ID = "vs_69bf0cbe65ac81918f52e9c764b42c27";

const SYSTEM_PROMPT = `
Você é um assistente virtual do Cabo Verde Digital.

Use sempre que possível os documentos da knowledge base para responder.
Responda de forma simples, clara, profissional e em português.

Regras:
- Se a resposta estiver nos documentos, responda com base neles.
- Se não encontrar informação suficiente, diga que não tem informação suficiente nos documentos.
- Não invente informações.
- Quando fizer sentido, sugira que o utilizador preencha o formulário ou fale com um humano.
`;

export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Use POST com JSON",
      example: {
        message: "Olá",
        provider: "openai"
      }
    });
  }

  const { message, provider = "openai" } = req.body || {};

  if (!message) {
    return res.status(400).json({
      error: "Mensagem obrigatória"
    });
  }

  try {
    // OPENAI + KNOWLEDGE BASE
    if (provider === "openai") {
      const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "gpt-4.1-mini",
          instructions: SYSTEM_PROMPT,
          input: message,
          tools: [
            {
              type: "file_search",
              vector_store_ids: [VECTOR_STORE_ID]
            }
          ]
        })
      });

      const data = await response.json();

      if (!response.ok) {
        return res.status(response.status).json({
          error: "Erro da OpenAI",
          details: data
        });
      }

      const reply =
        data.output_text ||
        data.output?.[0]?.content?.[0]?.text ||
        data.output?.[1]?.content?.[0]?.text ||
        "Não consegui gerar resposta.";

      return res.status(200).json({ reply });
    }

    // GEMINI SEM KNOWLEDGE BASE
    if (provider === "gemini") {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: `${SYSTEM_PROMPT}\n\nPergunta do utilizador: ${message}`
                  }
                ]
              }
            ]
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        return res.status(response.status).json({
          error: "Erro do Gemini",
          details: data
        });
      }

      const reply =
        data.candidates?.[0]?.content?.parts?.[0]?.text ||
        "Não consegui gerar resposta.";

      return res.status(200).json({ reply });
    }

    return res.status(400).json({
      error: "Provider inválido. Use 'openai' ou 'gemini'."
    });

  } catch (err) {
    return res.status(500).json({
      error: "Erro interno no servidor",
      details: err.message
    });
  }
}
