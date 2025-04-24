// api/reserva.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Sólo POST permitido' });
  }
  const { nombre, fechaInicio, fechaFin } = req.body;
  const token = process.env.NOTION_TOKEN;
  const db    = process.env.NOTION_DB_ID;

  // 1) Consulta Notion
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

  // 2) Crear nueva página en Notion
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
