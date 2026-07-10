import { useState } from 'react'
import { useApp } from '../../context/AppContext'
import PhaseCard from '../session/PhaseCard'

const inp = 'w-full bg-[#161310] border border-[#332922] rounded px-3 py-2 text-[#f0f0f0] text-sm focus:outline-none focus:border-[#d4a574] resize-none'

function phaseUid() { return `phase-${Date.now()}-${Math.random().toString(36).slice(2)}` }

function emptyPrep() {
  return { overview: '', phases: [] }
}

function emptyPhase(index) {
  return { id: phaseUid(), title: `Phase ${index + 1}`, summary: '', blocks: [] }
}

export default function SessionPrep() {
  const { activeSession, dispatch } = useApp()
  const [expanded, setExpanded] = useState(null)

  if (!activeSession) return null

  const prep = activeSession.prepData || emptyPrep()
  const phases = prep.phases || []

  function updatePrep(newPrep) {
    dispatch({ type: 'UPDATE_SESSION', payload: { ...activeSession, prepData: newPrep } })
  }

  function updateOverview(e) {
    updatePrep({ ...prep, overview: e.target.value })
  }

  function addPhase() {
    const phase = emptyPhase(phases.length)
    updatePrep({ ...prep, phases: [...phases, phase] })
    setExpanded(phase.id)
  }

  function updatePhase(i, newPhase) {
    const arr = [...phases]; arr[i] = newPhase
    updatePrep({ ...prep, phases: arr })
  }

  function deletePhase(i) {
    updatePrep({ ...prep, phases: phases.filter((_, j) => j !== i) })
  }

  return (
    <div className="p-4 space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-[#d4a574] uppercase tracking-wider mb-2">Adventure Overview & Hook</h2>
        <textarea
          className={inp}
          rows={4}
          value={prep.overview}
          onChange={updateOverview}
          placeholder="The setup, the hook that draws the party in, who wants what..."
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-[#d4a574] uppercase tracking-wider">
            Phases <span className="text-[#666] font-normal normal-case">({phases.length})</span>
          </h2>
          <button
            onClick={addPhase}
            className="px-3 py-1.5 bg-[#d4a574] text-[#161310] rounded text-xs font-medium hover:bg-[#c49464] transition-colors"
          >
            + New Phase
          </button>
        </div>

        {phases.length === 0 ? (
          <div className="text-center text-[#999999] py-10 bg-[#211b17]/40 rounded-lg border border-dashed border-[#332922]">
            <p className="text-sm">No phases yet. Break your session into phases — investigation, travel, dungeon, boss fight, epilogue...</p>
          </div>
        ) : (
          <div className="space-y-3">
            {phases.map((phase, i) => (
              <PhaseCard
                key={phase.id}
                phase={phase}
                expanded={expanded === phase.id}
                onToggle={() => setExpanded(expanded === phase.id ? null : phase.id)}
                onChange={p => updatePhase(i, p)}
                onDelete={() => deletePhase(i)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
