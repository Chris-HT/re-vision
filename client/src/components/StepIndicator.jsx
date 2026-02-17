/**
 * Compact horizontal step tracker for multi-step flows.
 * Props: { steps: string[], currentStep: number (0-indexed) }
 */
export default function StepIndicator({ steps, currentStep }) {
  return (
    <div className="flex items-center justify-center gap-1 py-3">
      {steps.map((label, i) => {
        const isCompleted = i < currentStep;
        const isCurrent = i === currentStep;

        return (
          <div key={label} className="flex items-center">
            {/* Step circle + label */}
            <div className="flex flex-col items-center">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  isCompleted
                    ? 'bg-green-600 text-white'
                    : isCurrent
                    ? 'bg-blue-600 text-white'
                    : ''
                }`}
                style={!isCompleted && !isCurrent ? {
                  backgroundColor: 'var(--bg-input)',
                  color: 'var(--text-muted)'
                } : undefined}
              >
                {isCompleted ? '\u2713' : i + 1}
              </div>
              <span
                className={`text-xs mt-1 font-medium ${
                  isCurrent ? 'text-blue-400' : isCompleted ? 'text-green-400' : ''
                }`}
                style={!isCompleted && !isCurrent ? { color: 'var(--text-muted)' } : undefined}
              >
                {label}
              </span>
            </div>

            {/* Connector line */}
            {i < steps.length - 1 && (
              <div
                className={`w-8 h-0.5 mx-1 mt-[-16px] ${
                  i < currentStep ? 'bg-green-600' : ''
                }`}
                style={i >= currentStep ? { backgroundColor: 'var(--border-color)' } : undefined}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
