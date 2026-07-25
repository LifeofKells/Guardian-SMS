/**
 * StepIndicator Component
 * Progress indicator for multi-step workflows
 */

import React from 'react';
import { Check, ChevronRight } from 'lucide-react';
import { cn } from './ui';

interface Step {
  id: string;
  label: string;
  description?: string;
  optional?: boolean;
}

interface StepIndicatorProps {
  steps: Step[];
  currentStep: number;
  onStepClick?: (stepIndex: number) => void;
  className?: string;
  orientation?: 'horizontal' | 'vertical';
  size?: 'sm' | 'md' | 'lg';
}

export function StepIndicator({
  steps,
  currentStep,
  onStepClick,
  className,
  orientation = 'horizontal',
  size = 'md'
}: StepIndicatorProps) {
  const isVertical = orientation === 'vertical';
  
  const sizeClasses = {
    sm: {
      container: 'gap-2',
      step: 'w-6 h-6 text-xs',
      label: 'text-xs',
      description: 'text-[10px]',
      line: 'h-0.5'
    },
    md: {
      container: 'gap-3',
      step: 'w-8 h-8 text-sm',
      label: 'text-sm',
      description: 'text-xs',
      line: 'h-1'
    },
    lg: {
      container: 'gap-4',
      step: 'w-10 h-10 text-base',
      label: 'text-base',
      description: 'text-sm',
      line: 'h-1.5'
    }
  };

  const classes = sizeClasses[size];

  return (
    <div
      className={cn(
        isVertical ? 'flex-col' : 'flex-row items-center',
        'flex',
        classes.container,
        className
      )}
    >
      {steps.map((step, index) => {
        const isCompleted = index < currentStep;
        const isCurrent = index === currentStep;
        const isUpcoming = index > currentStep;
        const isClickable = onStepClick && (isCompleted || index === currentStep);

        return (
          <React.Fragment key={step.id}>
            {/* Step indicator */}
            <div
              className={cn(
                'flex items-center gap-3',
                isVertical && 'w-full'
              )}
            >
              {/* Step number/checkmark circle */}
              <button
                onClick={() => isClickable && onStepClick(index)}
                disabled={!isClickable}
                className={cn(
                  'rounded-full flex items-center justify-center font-semibold transition-all duration-200 shrink-0',
                  classes.step,
                  isCompleted && 'bg-primary text-primary-foreground',
                  isCurrent && 'bg-primary text-primary-foreground ring-4 ring-primary/20',
                  isUpcoming && 'bg-muted text-muted-foreground border-2 border-muted',
                  isClickable && 'cursor-pointer hover:scale-105'
                )}
              >
                {isCompleted ? (
                  <Check className={cn(
                    size === 'sm' ? 'h-3 w-3' : size === 'md' ? 'h-4 w-4' : 'h-5 w-5'
                  )} />
                ) : (
                  index + 1
                )}
              </button>

              {/* Label and description */}
              <div className={cn('text-left', isVertical && 'flex-1')}>
                <p
                  className={cn(
                    'font-medium transition-colors',
                    classes.label,
                    isCompleted && 'text-foreground',
                    isCurrent && 'text-foreground',
                    isUpcoming && 'text-muted-foreground'
                  )}
                >
                  {step.label}
                  {step.optional && (
                    <span className="text-muted-foreground font-normal ml-1">(optional)</span>
                  )}
                </p>
                {step.description && isCurrent && (
                  <p className={cn('text-muted-foreground mt-0.5', classes.description)}>
                    {step.description}
                  </p>
                )}
              </div>
            </div>

            {/* Connector line */}
            {index < steps.length - 1 && (
              <div
                className={cn(
                  'bg-muted rounded-full transition-colors duration-300',
                  classes.line,
                  isVertical ? 'w-0.5 h-8 ml-4' : 'flex-1',
                  isCompleted && 'bg-primary'
                )}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

interface StepContentProps {
  children: React.ReactNode;
  step: number;
  currentStep: number;
  direction?: 'forward' | 'backward';
}

export function StepContent({ children, step, currentStep }: StepContentProps) {
  if (step !== currentStep) return null;

  return (
    <div
      className="animate-in fade-in slide-in-from-right-4 duration-300"
      key={step}
    >
      {children}
    </div>
  );
}

interface MultiStepFormProps {
  steps: Step[];
  currentStep: number;
  onStepChange: (step: number) => void;
  children: React.ReactNode;
  className?: string;
  showStepIndicator?: boolean;
  orientation?: 'horizontal' | 'vertical';
}

export function MultiStepForm({
  steps,
  currentStep,
  onStepChange,
  children,
  className,
  showStepIndicator = true,
  orientation = 'horizontal'
}: MultiStepFormProps) {
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === steps.length - 1;
  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <div className={cn('space-y-6', className)}>
      {/* Progress bar */}
      <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
        <div
          className="bg-primary h-full transition-all duration-300 ease-out rounded-full"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Step indicator */}
      {showStepIndicator && (
        <StepIndicator
          steps={steps}
          currentStep={currentStep}
          onStepClick={(step) => step < currentStep && onStepChange(step)}
          orientation={orientation}
        />
      )}

      {/* Step content */}
      <div className="min-h-[200px]">
        {children}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4 border-t">
        <button
          onClick={() => onStepChange(currentStep - 1)}
          disabled={isFirstStep}
          className={cn(
            'text-sm font-medium transition-colors',
            isFirstStep
              ? 'text-muted-foreground cursor-not-allowed'
              : 'text-foreground hover:text-primary'
          )}
        >
          ← Back
        </button>

        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">
            Step {currentStep + 1} of {steps.length}
          </span>
          
          {!isLastStep ? (
            <button
              onClick={() => onStepChange(currentStep + 1)}
              className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Continue →
            </button>
          ) : (
            <button
              onClick={() => {}}
              className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Complete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default StepIndicator;
