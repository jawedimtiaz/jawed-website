import React, { useState, useEffect } from 'react';
import { HelpCircle, X, ChevronRight, ChevronLeft, Sparkles, CheckCircle2 } from 'lucide-react';

export interface TourStep {
  title: string;
  description: string;
  targetSelector?: string; // CSS selector if highlighting an element, or center modal if omitted
}

export interface ToolTourProps {
  toolId: string;
  toolName: string;
  steps: TourStep[];
  autoStartFirstTime?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
}

export const ToolTour: React.FC<ToolTourProps> = ({
  toolId,
  toolName,
  steps,
  autoStartFirstTime = true,
  isOpen: controlledIsOpen,
  onClose,
}) => {
  const storageKey = `jawed_tool_tour_completed_${toolId}`;
  const [internalIsOpen, setInternalIsOpen] = useState<boolean>(false);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);

  const isModalOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;

  useEffect(() => {
    if (autoStartFirstTime && controlledIsOpen === undefined) {
      try {
        const completed = localStorage.getItem(storageKey);
        if (!completed) {
          // Small delay for component mount
          const timer = setTimeout(() => {
            setInternalIsOpen(true);
          }, 600);
          return () => clearTimeout(timer);
        }
      } catch {
        // ignore
      }
    }
  }, [autoStartFirstTime, controlledIsOpen, storageKey]);

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      setInternalIsOpen(false);
    }
    try {
      localStorage.setItem(storageKey, 'true');
    } catch {
      // ignore
    }
  };

  const handleNext = () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    } else {
      handleClose();
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  const handleRestartTour = () => {
    setCurrentStepIndex(0);
    if (onClose) {
      // open if closed
    } else {
      setInternalIsOpen(true);
    }
  };

  if (!isModalOpen) {
    return (
      <button
        type="button"
        onClick={handleRestartTour}
        className="button button-secondary no-print"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '0.8rem',
          padding: '5px 10px',
          borderColor: 'rgba(56, 189, 248, 0.4)',
          color: 'var(--accent)',
          background: 'var(--surface)',
        }}
        title={`Take a quick interactive tour of ${toolName} key inputs and features`}
      >
        <Sparkles className="w-3.5 h-3.5 text-sky-400" />
        Tool Tour &amp; Guide
      </button>
    );
  }

  const currentStep = steps[currentStepIndex] || steps[0];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="tool-tour-title"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: 'rgba(2, 6, 23, 0.78)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 0.2s ease',
      }}
      onClick={handleClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '520px',
          background: 'var(--surface)',
          border: '1px solid var(--accent)',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 30px rgba(56, 189, 248, 0.2)',
          padding: '24px',
          position: 'relative',
          color: 'var(--text)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ display: 'inline-flex', padding: '6px', borderRadius: '8px', background: 'var(--surface-accent)', color: 'var(--accent)' }}>
              <Sparkles className="w-5 h-5" />
            </span>
            <div>
              <h3 id="tool-tour-title" style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: 'var(--text-heading)' }}>
                {toolName} — Tour
              </h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                Step {currentStepIndex + 1} of {steps.length}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="button button-secondary"
            style={{ padding: '4px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
            aria-label="Close tour"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Content */}
        <div style={{ marginBottom: '24px', minHeight: '110px' }}>
          <h4 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-heading)', margin: '0 0 8px', lineHeight: '1.3' }}>
            {currentStep.title}
          </h4>
          <p style={{ fontSize: '0.92rem', color: 'var(--text-muted)', margin: 0, lineHeight: '1.6' }}>
            {currentStep.description}
          </p>
        </div>

        {/* Progress bar */}
        <div style={{ width: '100%', height: '4px', background: 'var(--border)', borderRadius: '99px', marginBottom: '20px', overflow: 'hidden' }}>
          <div
            style={{
              width: `${((currentStepIndex + 1) / steps.length) * 100}%`,
              height: '100%',
              background: 'var(--accent)',
              transition: 'width 0.25s ease',
            }}
          />
        </div>

        {/* Footer controls */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button
            type="button"
            onClick={handleClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer',
              padding: '6px 10px',
            }}
          >
            Skip Tour
          </button>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {currentStepIndex > 0 && (
              <button
                type="button"
                onClick={handlePrev}
                className="button button-secondary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.84rem', padding: '6px 12px' }}
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </button>
            )}

            <button
              type="button"
              onClick={handleNext}
              className="button button-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.84rem', padding: '6px 16px', background: 'var(--accent)' }}
            >
              {currentStepIndex === steps.length - 1 ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Finish Tour
                </>
              ) : (
                <>
                  Next
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
