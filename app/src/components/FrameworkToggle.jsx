const FRAMEWORKS = [
  { id: 'adkar', label: 'ADKAR' },
  { id: 'kotter', label: 'Kotter 8-Step' },
  { id: 'lewin', label: 'Lewin' },
  { id: 'custom', label: 'Custom' }
]

export default function FrameworkToggle({ active, onChange }) {
  return (
    <div className="inline-flex bg-white/5 border border-white/10 rounded-full p-1 gap-1">
      {FRAMEWORKS.map(f => (
        <button
          key={f.id}
          onClick={() => onChange(f.id)}
          className={`px-3 py-1.5 text-xs rounded-full transition ${
            active === f.id
              ? 'bg-teal-400/20 text-teal-200 border border-teal-300/30'
              : 'text-white/60 hover:text-white'
          }`}
        >
          {f.label}
        </button>
      ))}
    </div>
  )
}
