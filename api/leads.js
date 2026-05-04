export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Use POST com JSON" });
  }

  try {
    const {
      full_name,
      email,
      phone,
      company,
      interest,
      message,
      source,
      form_trigger,
      form_name
    } = req.body || {};

    if (!full_name || !email) {
      return res.status(400).json({
        error: "Nome completo e email são obrigatórios"
      });
    }

    // 1. Guardar no Supabase
    let supabaseData = null;

    if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const supabaseResponse = await fetch(
        `${process.env.SUPABASE_URL}/rest/v1/chatbot_leads`,
        {
          method: "POST",
          headers: {
            apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
            Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
            "Content-Type": "application/json",
            Prefer: "return=representation"
          },
          body: JSON.stringify({
            full_name,
            email,
            phone: phone || "",
            company: company || "",
            interest: interest || form_trigger || "",
            message: message || "",
            source: source || "webflow_chatbot",
            form_trigger: form_trigger || "",
            form_name: form_name || ""
          })
        }
      );

      supabaseData = await supabaseResponse.json();

      if (!supabaseResponse.ok) {
        console.error("Erro Supabase:", supabaseData);
      }
    }

    // 2. Guardar no Airtable
    const airtableResponse = await fetch(
      `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/${encodeURIComponent(process.env.AIRTABLE_TABLE_NAME)}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          fields: {
            "Nome completo": full_name,
            "Email": email,
            "Telefone": phone || "",
            "Empresa": company || "",
            "Interesse": interest || form_trigger || "",
            "Mensagem": message || "",
            "Fonte": source || "webflow_chatbot",
            "Estado": "Novo"
          }
        })
      }
    );

    const airtableData = await airtableResponse.json();

    if (!airtableResponse.ok) {
      return res.status(airtableResponse.status).json({
        error: "Erro ao guardar no Airtable",
        details: airtableData
      });
    }

    return res.status(200).json({
      success: true,
      message: "Lead guardado com sucesso",
      airtable: airtableData,
      supabase: supabaseData
    });
  } catch (error) {
    return res.status(500).json({
      error: "Erro ao guardar lead",
      details: error.message
    });
  }
}
