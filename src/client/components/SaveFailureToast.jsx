import { useApp } from '../context/AppContext'

export default function SaveFailureToast() {
  const { state, dispatch } = useApp()
  if (!state.saveError) return null

  return (
    <div className="fixed bottom-6 right-6 z-[100] max-w-sm bg-[#211b17] border-l-4 border-l-[#b24545] rounded-lg shadow-2xl p-4 fade-in">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-1 text-sm font-semibold text-[#b24545]">
            <span>⚠️</span>
            <span>Save failed</span>
          </div>
          <p className="text-sm text-[#999999] mt-2 leading-normal">
            Your last change wasn't saved. Edit again to retry, or check your connection.
          </p>
        </div>
        <button
          onClick={() => dispatch({ type: 'CLEAR_SAVE_ERROR' })}
          className="text-[#999999] hover:text-[#f0f0f0] text-2xl leading-none flex-shrink-0"
        >
          ×
        </button>
      </div>
    </div>
  )
}
