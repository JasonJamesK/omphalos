export default function DeleteConfirm({ name, message, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70" onClick={onCancel}>
      <div
        className="bg-[#2d2d2d] border border-[#b24545] rounded-lg p-6 w-96 fade-in"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold text-[#f0f0f0] mb-2">Confirm Delete</h3>
        <p className="text-[#999999] mb-6">
          {message || <>Are you sure you want to delete <span className="text-[#f0f0f0] font-medium">"{name}"</span>? This cannot be undone.</>}
        </p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-[#3d3d3d] text-[#f0f0f0] rounded hover:bg-[#4d4d4d] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-[#b24545] text-white rounded hover:bg-[#922b2b] transition-colors font-medium"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}
