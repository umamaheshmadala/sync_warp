// src/components/onboarding/ProgressIndicator.tsx
import { Check } from 'lucide-react'

interface ProgressIndicatorProps {
  currentStep: number
  totalSteps: number
  onStepClick?: (step: number) => void
}

const stepLabels = [
  'Basic Info',
  'Location', 
  'Interests'
]

export default function ProgressIndicator({ 
  currentStep, 
  totalSteps, 
  onStepClick 
}: ProgressIndicatorProps) {
  return (
    <div className="w-full">
      {/* Progress Bar */}
      <div className="relative">
        <div className="absolute top-4 left-0 w-full h-0.5 bg-gray-200">
          <div 
            className="h-full bg-indigo-600 transition-all duration-500 ease-out"
            style={{ width: `${((currentStep - 1) / (totalSteps - 1)) * 100}%` }}
          />
        </div>
        
        {/* Step Indicators */}
        <div className="relative flex justify-between">
          {Array.from({ length: totalSteps }, (_, index) => {
            const stepNumber = index + 1
            const isCompleted = stepNumber < currentStep
            const isCurrent = stepNumber === currentStep
            const isClickable = onStepClick && stepNumber <= currentStep

            return (
              <div 
                key={stepNumber}
                className="flex flex-col items-center"
              >
                <button
                  onClick={() => isClickable && onStepClick(stepNumber)}
                  disabled={!isClickable}
                  className={`
                    w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                    transition-all duration-200 ease-in-out
                    ${isCompleted 
                      ? 'bg-indigo-600 text-white' 
                      : isCurrent 
                        ? 'bg-indigo-600 text-white shadow-lg scale-110' 
                        : 'bg-gray-200 text-gray-500'
                    }
                    ${isClickable 
                      ? 'hover:bg-indigo-700 cursor-pointer' 
                      : 'cursor-default'
                    }
                  `}
                >
                  {isCompleted ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    stepNumber
                  )}
                </button>
                
                {/* Step Label */}
                <div className="mt-2 text-center">
                  <span className={`
                    text-xs font-medium
                    ${isCurrent 
                      ? 'text-indigo-600' 
                      : isCompleted 
                        ? 'text-gray-900' 
                        : 'text-gray-500'
                    }
                  `}>
                    {stepLabels[index]}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Step Counter */}
      <div className="mt-6 text-center">
        <span className="text-sm text-gray-600">
          Step {currentStep} of {totalSteps}
        </span>
      </div>
    </div>
  )
}