import { useState } from 'react'
import { useApp } from '../../../context/AppContext'
import AddLocationModal from '../../location/AddLocationModal'

function LocationMiniCard({ loc, onRemove }) {
  return (
    <div className="flex gap-2 bg-[#161310] rounded p-2">
      <div className="w-16 h-12 rounded overflow-hidden flex-shrink-0 bg-[#332922] flex items-center justify-center text-[#666] font-bold">
        {loc.imageBase64 ? (
          <img src={loc.imageBase64} alt={loc.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <span>{loc.name?.[0]?.toUpperCase() || '?'}</span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1">
          <span className="text-sm font-medium text-[#f0f0f0] truncate">{loc.name || 'Unnamed Location'}</span>
          <button onClick={onRemove} className="text-[#b24545] hover:text-[#922b2b] text-xs flex-shrink-0">×</button>
        </div>
        {loc.type && <p className="text-xs text-[#d4a574]">{loc.type}</p>}
        {loc.description && <p className="text-xs text-[#999999] truncate">{loc.description}</p>}
      </div>
    </div>
  )
}

export default function LocationsBlock({ block, onChange }) {
  const { activeSession, state, dispatch } = useApp()
  const [showAdd, setShowAdd] = useState(false)

  const sessionLocations = activeSession?.locations || []
  const globalLocations = state.globalLocations ?? []
  const locationIds = block.locationIds || []
  const linked = locationIds.map(id => sessionLocations.find(l => l.id === id)).filter(Boolean)

  function handleAdd(locationData) {
    dispatch({ type: 'ADD_LOCATION', sessionId: activeSession.id, payload: locationData })
    onChange({ ...block, locationIds: [...locationIds, locationData.id] })
    setShowAdd(false)
  }

  function removeRef(id) {
    onChange({ ...block, locationIds: locationIds.filter(x => x !== id) })
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-[#999999] uppercase tracking-wide">Locations</span>
        <button onClick={() => setShowAdd(true)} className="text-xs text-[#d4a574] hover:underline">+ Add Location</button>
      </div>
      {linked.length === 0 && <p className="text-xs text-[#666] py-1">No locations linked yet.</p>}
      <div className="space-y-1.5">
        {linked.map(loc => (
          <LocationMiniCard key={loc.id} loc={loc} onRemove={() => removeRef(loc.id)} />
        ))}
      </div>

      {showAdd && (
        <AddLocationModal
          globalLocations={globalLocations}
          onAdd={handleAdd}
          onClose={() => setShowAdd(false)}
          dispatch={dispatch}
        />
      )}
    </div>
  )
}
