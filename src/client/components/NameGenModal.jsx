import { useState } from 'react'
import { generateName, RACES, GENDERS } from '../data/nameGen.js'

export default function NameGenModal({ onSelect, onClose }) {
  const [gender, setGender] = useState('M')
  const [race, setRace] = useState('Human')
  const [result, setResult] = useState(null)

  function generate() {
    setResult(generateName(gender, race))
  }

  const fullName = result ? `${result.first} ${result.last}` : null

  const inputCls = 'bg-[#1a1a1a] border border-[#3d3d3d] rounded px-3 py-2 text-[#f0f0f0] text-sm focus:outline-none focus:border-[#d4a574] w-full'

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70" onClick={onClose}>
      <div
        className="bg-[#2d2d2d] rounded-lg w-80 p-5 fade-in"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-[#d4a574]">Name Generator</h3>
          <button onClick={onClose} className="text-[#999999] hover:text-[#f0f0f0] text-xl leading-none">×</button>
        </div>

        <div className="space-y-3 mb-4">
          <div>
            <label className="block text-xs text-[#999999] mb-1">Gender</label>
            <div className="flex gap-2">
              {GENDERS.map(g => (
                <button
                  key={g.value}
                  onClick={() => setGender(g.value)}
                  className={`flex-1 py-1.5 rounded text-sm transition-colors ${
                    gender === g.value
                      ? 'bg-[#d4a574] text-[#1a1a1a] font-medium'
                      : 'bg-[#3d3d3d] text-[#f0f0f0] hover:bg-[#4d4d4d]'
                  }`}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs text-[#999999] mb-1">Race</label>
            <select className={inputCls} value={race} onChange={e => setRace(e.target.value)}>
              {RACES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        </div>

        <button
          onClick={generate}
          className="w-full py-2 bg-[#d4a574] text-[#1a1a1a] rounded font-medium hover:bg-[#c49464] transition-colors mb-3"
        >
          Generate
        </button>

        {fullName && (
          <div className="bg-[#1a1a1a] rounded p-3 mb-3 text-center">
            <div className="text-[#f0f0f0] text-lg font-semibold">{fullName}</div>
            <div className="text-[#999999] text-xs mt-0.5">{GENDERS.find(g => g.value === gender)?.label} {race}</div>
          </div>
        )}

        <div className="flex gap-2">
          {fullName && (
            <>
              <button
                onClick={generate}
                className="flex-1 py-1.5 bg-[#3d3d3d] text-[#f0f0f0] rounded text-sm hover:bg-[#4d4d4d] transition-colors"
              >
                Generate Another
              </button>
              <button
                onClick={() => onSelect(fullName)}
                className="flex-1 py-1.5 bg-[#6b8e6b] text-white rounded text-sm hover:bg-[#5a7a5a] transition-colors"
              >
                Use This Name
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
