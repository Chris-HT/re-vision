const PRESETS = [
  { id: 'blue-cyan', gradient: 'from-blue-500 to-cyan-500', label: 'Ocean' },
  { id: 'purple-pink', gradient: 'from-purple-500 to-pink-500', label: 'Berry' },
  { id: 'green-emerald', gradient: 'from-green-500 to-emerald-500', label: 'Forest' },
  { id: 'orange-amber', gradient: 'from-orange-500 to-amber-500', label: 'Sunset' },
  { id: 'indigo-blue', gradient: 'from-indigo-500 to-blue-500', label: 'Sapphire' },
  { id: 'rose-red', gradient: 'from-rose-500 to-red-500', label: 'Ruby' },
  { id: 'teal-cyan', gradient: 'from-teal-500 to-cyan-500', label: 'Lagoon' },
  { id: 'violet-purple', gradient: 'from-violet-500 to-purple-500', label: 'Amethyst' },
  { id: 'yellow-orange', gradient: 'from-yellow-500 to-orange-500', label: 'Amber' },
  { id: 'sky-indigo', gradient: 'from-sky-500 to-indigo-500', label: 'Twilight' },
];

export default function ColorPresets({ selected, onSelect }) {
  return (
    <div className="grid grid-cols-5 gap-2">
      {PRESETS.map(preset => (
        <button
          key={preset.id}
          onClick={() => onSelect(preset.gradient)}
          className={`h-10 rounded-lg bg-gradient-to-r ${preset.gradient} transition-all ${
            selected === preset.gradient
              ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-800 scale-105'
              : 'hover:scale-105 opacity-80 hover:opacity-100'
          }`}
          title={preset.label}
        />
      ))}
    </div>
  );
}
