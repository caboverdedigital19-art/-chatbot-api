export default async function handler(req, res) {
  try {
    const {                                                                                                             
      full_name,
      email,
      phone,
      company,
      interest,
      message,
      source
    } = req.body;

    // validação básica
    if (!full_name || !email) {
      return res.status(400).json({
        error: "Nome e email são obrigatórios"
      });
    }

    // 👉 Guardar no Supabase
    const supabaseResponse = await fetch(
      `${process.env.SUPABASE_URL}/rest/v1/chatbot_leads`,
      {
        method: "POST",
        headers: {
          "apikey": process.env.SUPABASE_SERVICE_ROLE_KEY,
          "Authorization": `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          "Content-Type": "application/json",
          "Prefer": "return=representation"
        },
        body: JSON.stringify({
          full_name,
          email,
          phone,
          company,
          interest,
          message,
          source: source || "webflow_chatbot"
        })
      }
    );

    const supabaseData = await supabaseResponse.json();

    // 👉 Enviar para Airtable
    await fetch(
      `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/${process.env.AIRTABLE_TABLE_NAME}`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.AIRTABLE_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          fields: {
            "Nome completo": full_name,
            "Email": email,
            "Telefone": phone,
            "Empresa": company,
            "Interesse": interest,
            "Mensagem": message,
            "Fonte": source || "webflow_chatbot",
            "Estado": "Novo"
          }
        })
      }
    );

    return res.status(200).json({
      success: true,
      data: supabaseData
    });

  } catch (error) {
    return res.status(500).json({
      error: "Erro ao guardar lead",
      details: error.message
    });
  }
}
