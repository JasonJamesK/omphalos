import { useRef, useState, useCallback } from 'react'

export default function PortraitCrop({ imageData, panX = 0, panY = 0, onChange }) {
  const [boxHeight, setBoxHeight] = useState(null)
  const [dragging, setDragging] = useState(false)
  const [start, setStart] = useState({ x: 0, y: 0 })
  const [offset, setOffset] = useState({ x: panX, y: panY })

  function handleLoad(e) {
    const img = e.target
    const scaled = Math.round(150 * img.naturalHeight / img.naturalWidth)
    setBoxHeight(scaled)
    setOffset({ x: 0, y: 0 })
    onChange?.({ panX: 0, panY: 0 })
  }

  const onMouseDown = useCallback(e => {
    e.preventDefault()
    setDragging(true)
    setStart({ x: e.clientX - offset.x, y: e.clientY - offset.y })
  }, [offset])

  const onMouseMove = useCallback(e => {
    if (!dragging) return
    const nx = e.clientX - start.x
    const ny = e.clientY - start.y
    setOffset({ x: nx, y: ny })
    onChange?.({ panX: nx, panY: ny })
  }, [dragging, start, onChange])

  const onMouseUp = useCallback(() => setDragging(false), [])

  const h = boxHeight ?? 200

  return (
    <div className="space-y-1">
      <div
        className="relative overflow-hidden rounded select-none"
        style={{ width: 150, height: h, cursor: dragging ? 'grabbing' : 'default', background: '#1a1a1a' }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
      >
        <img
          src={imageData}
          alt="Portrait preview"
          draggable={false}
          onLoad={handleLoad}
          style={{
            position: 'absolute',
            width: '100%',
            height: 'auto',
            top: 0,
            left: 0,
            userSelect: 'none',
          }}
        />
      </div>
      <p className="text-xs text-[#666]">Full image preview</p>
    </div>
  )
}
