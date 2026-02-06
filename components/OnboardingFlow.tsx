/**
 * OnboardingFlow Component
 * Guided tour for new users
 */

import React, { useState, useEffect, useCallback } from 'react';
import { X, ChevronRight, ChevronLeft, Sparkles, CheckCircle2 } from 'lucide-react';
import { Button, cn } from './ui';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  targetSelector?: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

interface OnboardingFlowProps {
  steps: OnboardingStep[];
  isOpen: boolean;
  onClose: () => void;
  onComplete?: () => void;
  storageKey?: string;
}

export function OnboardingFlow({
  steps,
  isOpen,
  onClose,
  onComplete,
  storageKey = 'guardian_onboarding_completed'
}: OnboardingFlowProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  const currentStepData = steps[currentStep];

  useEffect(() => {
    if (isOpen && currentStepData?.targetSelector) {
      const target = document.querySelector(currentStepData.targetSelector);
      if (target) {
        const rect = target.getBoundingClientRect();
        setTargetRect(rect);
      }
    } else {
      setTargetRect(null);
    }
  }, [isOpen, currentStep, currentStepData]);

  const handleNext = useCallback(() => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleComplete();
    }
  }, [currentStep, steps.length]);

  const handlePrev = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  const handleComplete = useCallback(() => {
    localStorage.setItem(storageKey, 'true');
    onComplete?.();
    onClose();
  }, [storageKey, onComplete, onClose]);

  const handleSkip = useCallback(() => {
    localStorage.setItem(storageKey, 'skipped');
    onClose();
  }, [storageKey, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm" onClick={handleSkip} />
      
      {/* Spotlight (if targeting an element) */}
      {targetRect && (
        <div
          className="fixed z-50 pointer-events-none"
          style={{
            top: targetRect.top - 8,
            left: targetRect.left - 8,
            width: targetRect.width + 16,
            height: targetRect.height + 16,
            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)',
            borderRadius: '8px'
          }}
        />
      )}

      {/* Tooltip Card */}
      <div
        className={cn(
          "fixed z-50 bg-background rounded-xl shadow-2xl border border-border p-6 w-[400px] max-w-[90vw]",
          "animate-in fade-in zoom-in-95 duration-300",
          targetRect && getPositionStyles(targetRect, currentStepData?.position || 'bottom')
        )}
        style={!targetRect ? { 
          top: '50%', 
          left: '50%', 
          transform: 'translate(-50%, -50%)' 
        } : undefined}
      >
        {/* Close Button */}
        <button
          onClick={handleSkip}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Progress */}
        <div className="flex items-center gap-1 mb-6">
          {steps.map((_, idx) => (
            <div
              key={idx}
              className={cn(
                "h-1 flex-1 rounded-full transition-colors",
                idx <= currentStep ? "bg-primary" : "bg-muted"
              )}
            />
          ))}
        </div>

        {/* Icon */}
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <Sparkles className="h-6 w-6 text-primary" />
        </div>

        {/* Content */}
        <h3 className="text-lg font-semibold mb-2">{currentStepData.title}</h3>
        <p className="text-muted-foreground text-sm leading-relaxed mb-6">
          {currentStepData.description}
        </p>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <button
            onClick={handleSkip}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Skip tour
          </button>
          
          <div className="flex items-center gap-2">
            {currentStep > 0 && (
              <Button variant="outline" size="sm" onClick={handlePrev}>
                <ChevronLeft className="h-4 w-4 mr-1" /> Back
              </Button>
            )}
            <Button size="sm" onClick={handleNext}>
              {currentStep === steps.length - 1 ? (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-1" /> Finish
                </>
              ) : (
                <>
                  Next <ChevronRight className="h-4 w-4 ml-1" />
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Step Counter */}
        <p className="text-xs text-muted-foreground text-center mt-4">
          Step {currentStep + 1} of {steps.length}
        </p>
      </div>
    </>
  );
}

function getPositionStyles(targetRect: DOMRect, position: string) {
  const spacing = 16;
  
  switch (position) {
    case 'top':
      return {
        bottom: `${window.innerHeight - targetRect.top + spacing}px`,
        left: `${targetRect.left + targetRect.width / 2}px`,
        transform: 'translateX(-50%)'
      };
    case 'bottom':
      return {
        top: `${targetRect.bottom + spacing}px`,
        left: `${targetRect.left + targetRect.width / 2}px`,
        transform: 'translateX(-50%)'
      };
    case 'left':
      return {
        top: `${targetRect.top + targetRect.height / 2}px`,
        right: `${window.innerWidth - targetRect.left + spacing}px`,
        transform: 'translateY(-50%)'
      };
    case 'right':
      return {
        top: `${targetRect.top + targetRect.height / 2}px`,
        left: `${targetRect.right + spacing}px`,
        transform: 'translateY(-50%)'
      };
    default:
      return {};
  }
}

// Hook to check if onboarding should be shown
export function useOnboarding(storageKey: string = 'guardian_onboarding_completed') {
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    const completed = localStorage.getItem(storageKey);
    if (!completed) {
      // Delay showing onboarding to allow UI to render
      const timer = setTimeout(() => {
        setShowOnboarding(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [storageKey]);

  const dismissOnboarding = useCallback(() => {
    setShowOnboarding(false);
    localStorage.setItem(storageKey, 'true');
  }, [storageKey]);

  return { showOnboarding, dismissOnboarding };
}

// Contextual tip component
interface ContextualTipProps {
  title: string;
  description: string;
  onDismiss: () => void;
  className?: string;
}

export function ContextualTip({ title, description, onDismiss, className }: ContextualTipProps) {
  return (
    <div className={cn(
      "bg-amber-50 border border-amber-200 rounded-lg p-4 relative",
      className
    )}>
      <button
        onClick={onDismiss}
        className="absolute top-2 right-2 text-amber-600 hover:text-amber-800"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="flex items-start gap-3">
        <Sparkles className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
        <div>
          <h4 className="font-semibold text-amber-900 text-sm">{title}</h4>
          <p className="text-amber-800 text-xs mt-1">{description}</p>
        </div>
      </div>
    </div>
  );
}

export default OnboardingFlow;
