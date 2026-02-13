export default function ProfileSelector({ profiles, onSelectProfile }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6">
      {profiles.map(profile => (
        <button
          key={profile.id}
          onClick={() => onSelectProfile(profile)}
          className="group relative overflow-hidden bg-slate-800 hover:bg-slate-700 rounded-xl p-8 transition-all duration-300 transform hover:scale-105 hover:shadow-xl border border-slate-700"
        >
          <div className="flex flex-col items-center space-y-4">
            <span className="text-6xl group-hover:scale-110 transition-transform">
              {profile.icon}
            </span>
            <h3 className="text-xl font-bold text-white">
              {profile.name}
            </h3>
            <span className="text-sm text-slate-400 capitalize">
              {profile.ageGroup}
            </span>
          </div>
          
          <div className="absolute inset-0 bg-gradient-to-t from-blue-600/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
        </button>
      ))}
    </div>
  );
}