const SIZES = {
  xs: { w: 36, h: 36, font: 14 },
  sm: { w: 120, h: 160, font: 36 },
  lg: { w: 180, h: 240, font: 56 },
}

export default function Portrait({ char, size = 'sm', imageUrl = null }) {
  const { w, h, font } = SIZES[size] || SIZES.sm
  if (!imageUrl) {
    return (
      <div className="flex items-center justify-center bg-[#332922] text-[#666] font-bold flex-shrink-0" style={{ width: w, height: h }}>
        <span style={{ fontSize: font }}>{char.name?.[0]?.toUpperCase() || '?'}</span>
      </div>
    )
  }
  return (
    <div className="overflow-hidden flex-shrink-0 relative" style={{ width: w, height: h }}>
      <img src={imageUrl} alt={char.name} draggable={false} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }} />
    </div>
  )
}
