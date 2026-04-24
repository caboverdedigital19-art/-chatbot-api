export default async function handler(req, res) {
  const { message, provider } = req.body;

  if (!message) {
    return res.status(400).json({ error: "Mensagem obrigatória" });
  }

  if (provider === "openai") {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        input: message
      })
    });

    const data = await response.json();

    return res.status(200).json({
      reply: data.output_text || "Erro ao gerar resposta"
    });
  }

  if (provider === "gemini") {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: message }] }]
        })
      }
    );

    const data = await response.json();

    return res.status(200).json({
      reply: data.candidates?.[0]?.content?.parts?.[0]?.text || "Erro ao gerar resposta"
    });
  }

  return res.status(400).json({ error: "Provider inválido" });
}
