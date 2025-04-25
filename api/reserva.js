// api/reserva.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Sólo POST permitido' });
  }
  const { nombre, fechaInicio, fechaFin } = req.body;
  const token = process.env.NOTION_TOKEN;
  const db    = process.env.NOTION_DB_ID;

  // 1) Llama a Notion y parsea el JSON
  const q = await fetch(`https://api.notion.com/v1/databases/${db}/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({})  // sin filtros → trae todas las páginas
  });
  const data = await q.json();

  // 2) Si Notion devolvió un error, lo capturamos y devolvemos al cliente
  if (!data || !Array.isArray(data.results)) {
    console.error("Notion API error:", data);
    return res
      .status(502)
      .json({ error: "Error en consulta a Notion", details: data });
  }

  // 3) Si tenemos results, comprobamos conflictos
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

  // 4) Crear la página en Notion
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

