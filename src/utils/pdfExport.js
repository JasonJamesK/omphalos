import { jsPDF } from 'jspdf'

function extractText(node) {
  if (!node) return ''
  if (node.type === 'text') return node.text || ''
  const children = (node.content || []).map(extractText).join('')
  if (node.type === 'paragraph' || node.type === 'heading') return children + '\n'
  if (node.type === 'listItem') return '• ' + children
  return children
}

function addSection(doc, title, y, pageH, margin) {
  if (y > pageH - 30) { doc.addPage(); y = 20 }
  doc.setFontSize(13)
  doc.setTextColor(212, 165, 116)
  doc.text(title, margin, y)
  y += 6
  doc.setDrawColor(212, 165, 116)
  doc.line(margin, y, doc.internal.pageSize.width - margin, y)
  y += 5
  doc.setTextColor(220, 220, 220)
  doc.setFontSize(9)
  return y
}

function addText(doc, text, y, pageH, margin, contentW) {
  if (!text) return y
  const lines = doc.splitTextToSize(text, contentW)
  for (const line of lines) {
    if (y > pageH - 15) { doc.addPage(); y = 20 }
    doc.text(line, margin, y)
    y += 4.5
  }
  return y + 2
}

export function exportToPDF(session) {
  const doc = new jsPDF()
  const pageH = doc.internal.pageSize.height
  const pageW = doc.internal.pageSize.width
  const margin = 15
  const contentW = pageW - margin * 2
  let y = 20

  // Title
  doc.setFillColor(26, 26, 26)
  doc.rect(0, 0, pageW, pageH, 'F')
  doc.setFontSize(22)
  doc.setTextColor(212, 165, 116)
  doc.text(session.title || 'Untitled Session', margin, y)
  y += 8

  doc.setFontSize(9)
  doc.setTextColor(153, 153, 153)
  const created = new Date(session.dateCreated).toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' })
  doc.text(`Created: ${created}`, margin, y)
  y += 10

  // Metadata
  const meta = session.metadata || {}
  const metaFields = [
    ['Location', meta.location],
    ['Date/Time', meta.dateTime],
    ['Weather', meta.weather],
    ['NPCs Met', meta.npcsMet],
    ['Treasure Acquired', meta.treasureAcquired],
    ['Plot Points', meta.plotPoints],
    ['Party Level Change', meta.partyLevelChange],
    ['Next Session Hooks', meta.nextSessionHooks],
  ].filter(([, v]) => v)

  if (metaFields.length) {
    y = addSection(doc, 'Session Metadata', y, pageH, margin)
    for (const [k, v] of metaFields) {
      if (y > pageH - 15) { doc.addPage(); y = 20 }
      doc.setFontSize(8)
      doc.setTextColor(153, 153, 153)
      doc.text(k + ':', margin, y)
      doc.setTextColor(220, 220, 220)
      const lines = doc.splitTextToSize(v, contentW - 30)
      doc.text(lines, margin + 30, y)
      y += lines.length * 4 + 2
    }
    y += 4
  }

  // Session
  if (session.sessionLog) {
    y = addSection(doc, 'Session', y, pageH, margin)
    const logText = extractText(session.sessionLog)
    y = addText(doc, logText, y, pageH, margin, contentW)
    y += 4
  }

  // Session Notes
  if (session.sessionNotes) {
    y = addSection(doc, 'Notes', y, pageH, margin)
    y = addText(doc, session.sessionNotes, y, pageH, margin, contentW)
    y += 4
  }

  // Characters
  const chars = session.characters || []
  if (chars.length) {
    y = addSection(doc, `Characters (${chars.length})`, y, pageH, margin)
    for (const c of chars) {
      if (y > pageH - 30) { doc.addPage(); y = 20 }
      doc.setFontSize(11)
      doc.setTextColor(212, 165, 116)
      doc.text(`${c.name} — ${c.race} ${c.class}, Level ${c.level}`, margin, y)
      y += 5
      doc.setFontSize(9)
      doc.setTextColor(220, 220, 220)
      if (c.tagline) { y = addText(doc, `"${c.tagline}"`, y, pageH, margin, contentW) }
      if (c.alignment) { y = addText(doc, `Alignment: ${c.alignment}`, y, pageH, margin, contentW) }
      if (c.personalityTraits) { y = addText(doc, `Personality: ${c.personalityTraits}`, y, pageH, margin, contentW) }
      if (c.flaw) { y = addText(doc, `Flaw: ${c.flaw}`, y, pageH, margin, contentW) }
      if (c.inventory) { y = addText(doc, `Inventory: ${c.inventory}`, y, pageH, margin, contentW) }
      if (c.questHooks) { y = addText(doc, `Quest Hooks: ${c.questHooks}`, y, pageH, margin, contentW) }
      if (c.relationships?.length) {
        y = addText(doc, `Relationships: ${c.relationships.map(r => `${r.name} (${r.type})`).join(', ')}`, y, pageH, margin, contentW)
      }
      y += 4
    }
  }

  // Locations
  const locs = session.locations || []
  if (locs.length) {
    y = addSection(doc, `Locations (${locs.length})`, y, pageH, margin)
    for (const l of locs) {
      if (y > pageH - 20) { doc.addPage(); y = 20 }
      doc.setFontSize(11)
      doc.setTextColor(107, 142, 107)
      doc.text(l.name, margin, y)
      y += 5
      doc.setFontSize(9)
      doc.setTextColor(220, 220, 220)
      if (l.description) { y = addText(doc, l.description, y, pageH, margin, contentW) }
      if (l.secretsAndHazards) { y = addText(doc, `Secrets/Hazards: ${l.secretsAndHazards}`, y, pageH, margin, contentW) }
      y += 3
    }
  }

  // Encounters
  const encs = session.encounters || []
  if (encs.length) {
    y = addSection(doc, `Encounters (${encs.length})`, y, pageH, margin)
    for (const e of encs) {
      if (y > pageH - 20) { doc.addPage(); y = 20 }
      doc.setFontSize(11)
      doc.setTextColor(178, 69, 69)
      doc.text(e.name, margin, y)
      y += 5
      doc.setFontSize(9)
      doc.setTextColor(220, 220, 220)
      if (e.enemies?.length) {
        const enemyStr = e.enemies.map(en => `${en.qty}× ${en.name}`).join(', ')
        y = addText(doc, `Enemies: ${enemyStr}`, y, pageH, margin, contentW)
      }
      if (e.notes) { y = addText(doc, `Notes: ${e.notes}`, y, pageH, margin, contentW) }
      y += 3
    }
  }

  doc.save(`${(session.title || 'session').replace(/[^a-z0-9]/gi, '_')}.pdf`)
}
