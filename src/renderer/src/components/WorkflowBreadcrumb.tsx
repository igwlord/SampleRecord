export type WorkflowStep = 'capture' | 'trim' | 'drag'

interface Props {
  step: WorkflowStep
}

const STEPS: { key: WorkflowStep; label: string }[] = [
  { key: 'capture', label: 'Capture' },
  { key: 'trim', label: 'Trim' },
  { key: 'drag', label: 'Drag to DAW' },
]

export function WorkflowBreadcrumb({ step }: Props) {
  const currentIdx = STEPS.findIndex((s) => s.key === step)

  return (
    <div className="workflow-breadcrumb" aria-label="Workflow steps">
      {STEPS.map((s, i) => (
        <div key={s.key} className="workflow-breadcrumb-row">
          <span
            className={`workflow-step ${
              i === currentIdx
                ? 'workflow-step--active'
                : i < currentIdx
                  ? 'workflow-step--done'
                  : 'workflow-step--pending'
            }`}
          >
            {s.label}
          </span>
          {i < STEPS.length - 1 && (
            <span className={`workflow-arrow ${i < currentIdx ? 'workflow-arrow--done' : ''}`}>
              →
            </span>
          )}
        </div>
      ))}
    </div>
  )
}
