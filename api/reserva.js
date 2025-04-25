export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Sólo POST permitido' });
  }

  const { nombre, fechaInicio, fechaFin } = req.body;
  const token = process.env.NOTION_TOKEN;
  const db    = process.env.NOTION_DB_ID;

  // 🔍 LOG TEMPORAL: Verifica que el token llegue bien
  console.log("🔐 TOKEN USADO:", token);
  console.log("📘 DB ID USADO:", db);

  // Consulta a Notion
  const q = await fetch(`https://api.notion.com/v1/databases/${db}/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({})
  });

  const data = await q.json();

  // Manejo de errores
  if (!data || !Array.isArray(data.results)) {
    console.error("❌ Error de Notion:", data);
    return res.status(502).json({ error: "Error en consulta a Notion", details: data });
  }

  // Comprobación de conflicto de fechas
  const conflicto = data.results.some(p => {
    const ini = p.properties['Fecha inicio'].date.start;
    const fin = p.properties['Fecha fin'].date.start;
    return (
      (fechaInicio >= ini && fechaInicio <= fin) ||
      (fechaFin    >= ini && fechaFin    <= fin) ||
      (fechaInicio <= ini && fechaFin    >= fin)
    );
  });

  if (conflicto) {
    return res.status(200).json({ disponible: false });
  }

  // Crear reserva
  await fetch('https://api.notion.com/v1/pages', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      parent: { database_id: db },
      properties: {
        'Nombre':       { title: [{ text: { content: nombre } }] },
        'Fecha inicio': { date:  { start: fechaInicio } },
        'Fecha fin':    { date:  { start: fechaFin    } }
      }
    })
  });

  return res.status(200).json({ disponible: true });
}
