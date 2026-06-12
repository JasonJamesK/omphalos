import { useRef, useState, useCallback, useEffect } from 'react'

const MAX_W = 600
const MAX_H = 500

export default function CropModal({ imageData, onSave, onClose }) {
  const imgRef = useRef(null)
  const canvasRef = useRef(null)
  const containerRef = useRef(null)
  const [displaySize, setDisplaySize] = useState({ w: 0, h: 0 })
  const [naturalSize, setNaturalSize] = useState({ w: 0, h: 0 })
  const [crop, setCrop] = useState({ x: 0, y: 0, w: 0, h: 0 })
  const [dragging, setDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })

  function handleLoad(e) {
    const img = e.target
    const nw = img.naturalWidth
    const nh = img.naturalHeight
    setNaturalSize({ w: nw, h: nh })

    const scale = Math.min(MAX_W / nw, MAX_H / nh)
    const dw = Math.round(nw * scale)
    const dh = Math.round(nh * scale)
    setDisplaySize({ w: dw, h: dh })

    // Initial crop box: 3:4, ~80% of display height, centered
    const cropH = Math.round(Math.min(dh * 0.85, dw * 4 / 3))
    const cropW = Math.round(cropH * 3 / 4)
    const cx = Math.round((dw - cropW) / 2)
    const cy = Math.round((dh - cropH) / 2)
    setCrop({ x: cx, y: cy, w: cropW, h: cropH })
  }

  const getRelPos = useCallback(e => {
    const rect = containerRef.current.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }, [])

  const onMouseDown = useCallback(e => {
    const pos = getRelPos(e)
    if (pos.x >= crop.x && pos.x <= crop.x + crop.w && pos.y >= crop.y && pos.y <= crop.y + crop.h) {
      e.preventDefault()
      setDragging(true)
      setDragStart({ x: pos.x - crop.x, y: pos.y - crop.y })
    }
  }, [crop, getRelPos])

  const onMouseMove = useCallback(e => {
    if (!dragging) return
    const pos = getRelPos(e)
    const nx = Math.max(0, Math.min(displaySize.w - crop.w, pos.x - dragStart.x))
    const ny = Math.max(0, Math.min(displaySize.h - crop.h, pos.y - dragStart.y))
    setCrop(c => ({ ...c, x: nx, y: ny }))
  }, [dragging, dragStart, displaySize, crop.w, crop.h, getRelPos])

  const onMouseUp = useCallback(() => setDragging(false), [])

  // Touch support
  const onTouchStart = useCallback(e => {
    const t = e.touches[0]
    onMouseDown({ clientX: t.clientX, clientY: t.clientY, preventDefault: () => e.preventDefault() })
  }, [onMouseDown])

  const onTouchMove = useCallback(e => {
    const t = e.touches[0]
    onMouseMove({ clientX: t.clientX, clientY: t.clientY })
  }, [onMouseMove])

  function handleCrop() {
    const canvas = canvasRef.current
    const img = imgRef.current
    const scaleX = naturalSize.w / displaySize.w
    const scaleY = naturalSize.h / displaySize.h
    const sx = Math.round(crop.x * scaleX)
    const sy = Math.round(crop.y * scaleY)
    const sw = Math.round(crop.w * scaleX)
    const sh = Math.round(crop.h * scaleY)
    canvas.width = 300
    canvas.height = 400
    const ctx = canvas.getContext('2d')
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, 300, 400)
    onSave(canvas.toDataURL('image/jpeg', 0.92))
  }

  const ready = displaySize.w > 0

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/85 p-4" onClick={onClose}>
      <div className="bg-[#2d2d2d] rounded-lg p-5 fade-in max-w-full" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold text-[#d4a574]">Crop Portrait</h3>
          <button onClick={onClose} className="text-[#999999] hover:text-[#f0f0f0] text-xl leading-none">×</button>
        </div>
        <p className="text-xs text-[#999999] mb-3">Drag the highlighted box to select your 3:4 portrait area</p>

        <div
          ref={containerRef}
          className="relative select-none overflow-hidden rounded"
          style={{
            width: ready ? displaySize.w : MAX_W,
            height: ready ? displaySize.h : MAX_H,
            background: '#111',
            cursor: dragging ? 'grabbing' : 'default',
          }}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onMouseUp}
        >
          <img
            ref={imgRef}
            src={imageData}
            alt="crop source"
            draggable={false}
            onLoad={handleLoad}
            style={{ width: displaySize.w || '100%', height: displaySize.h || 'auto', display: 'block', userSelect: 'none' }}
          />

          {ready && (
            <>
              {/* Dark overlay — 4 panels surrounding the crop box */}
              <div style={{ position:'absolute', inset:0, top:0, left:0, right:0, height:crop.y, background:'rgba(0,0,0,0.65)' }} />
              <div style={{ position:'absolute', top:crop.y + crop.h, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.65)' }} />
              <div style={{ position:'absolute', top:crop.y, left:0, width:crop.x, height:crop.h, background:'rgba(0,0,0,0.65)' }} />
              <div style={{ position:'absolute', top:crop.y, left:crop.x + crop.w, right:0, height:crop.h, background:'rgba(0,0,0,0.65)' }} />

              {/* Crop box */}
              <div
                style={{
                  position:'absolute',
                  top:crop.y, left:crop.x,
                  width:crop.w, height:crop.h,
                  border:'2px solid #d4a574',
                  cursor:'move',
                  boxSizing:'border-box',
                  boxShadow:'0 0 0 1px rgba(212,165,116,0.3)',
                }}
              >
                {/* Rule-of-thirds grid */}
                {[33.33, 66.66].map(p => (
                  <div key={`h${p}`} style={{ position:'absolute', top:`${p}%`, left:0, right:0, height:1, background:'rgba(212,165,116,0.35)' }} />
                ))}
                {[33.33, 66.66].map(p => (
                  <div key={`v${p}`} style={{ position:'absolute', left:`${p}%`, top:0, bottom:0, width:1, background:'rgba(212,165,116,0.35)' }} />
                ))}
                {/* Corner handles */}
                {[[0,0],['auto',0],[0,'auto'],['auto','auto']].map(([t,l], i) => (
                  <div key={i} style={{
                    position:'absolute',
                    top: t === 0 ? -3 : t, bottom: t === 'auto' ? -3 : undefined,
                    left: l === 0 ? -3 : l, right: l === 'auto' ? -3 : undefined,
                    width:10, height:10,
                    background:'#d4a574',
                    borderRadius:1,
                  }} />
                ))}
              </div>

              {/* Size label */}
              <div style={{
                position:'absolute',
                top: crop.y + crop.h + 6,
                left: crop.x,
                fontSize:10,
                color:'#d4a574',
                background:'rgba(0,0,0,0.6)',
                padding:'1px 4px',
                borderRadius:3,
                pointerEvents:'none',
              }}>
                3:4
              </div>
            </>
          )}
        </div>

        <canvas ref={canvasRef} style={{ display:'none' }} />

        <div className="flex gap-3 justify-end mt-4">
          <button onClick={onClose} className="px-4 py-2 bg-[#3d3d3d] text-[#f0f0f0] rounded hover:bg-[#4d4d4d] transition-colors">
            Cancel
          </button>
          <button
            onClick={handleCrop}
            disabled={!ready}
            className="px-5 py-2 bg-[#d4a574] text-[#1a1a1a] rounded font-bold hover:bg-[#c49464] transition-colors disabled:opacity-40"
          >
            Crop & Save
          </button>
        </div>
      </div>
    </div>
  )
}
