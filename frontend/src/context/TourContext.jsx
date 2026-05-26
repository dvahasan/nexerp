import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Joyride, STATUS, ACTIONS, EVENTS } from 'react-joyride';
import { useNavigate, useLocation } from 'react-router-dom';
import { systemTourSteps, pageTours } from '../config/tourConfig';
import { useAppContext } from './AppContext';
import { T } from '../theme';
import { TourContext } from './TourContextObj';

// ── Waits for a CSS selector to appear in the DOM (up to `timeout` ms) ──────
const waitForTarget = (selector, timeout = 2000) => new Promise(resolve => {
  if (!selector) { resolve(true); return; }
  if (document.querySelector(selector)) { resolve(true); return; }

  const startedAt = Date.now();
  const tick = () => {
    if (document.querySelector(selector)) { resolve(true); return; }
    if (Date.now() - startedAt >= timeout) { resolve(false); return; }
    window.requestAnimationFrame(tick);
  };
  tick();
});

export function TourProvider({ children }) {
  const [run,       setRun]       = useState(false);
  const [steps,     setSteps]     = useState([]);
  const [stepIndex, setStepIndex] = useState(0);

  const navigate   = useNavigate();
  const location   = useLocation();
  const { theme, company } = useAppContext();
  const primaryColor = company?.primaryColor || '#3b82f6';
  const tok = T[theme] || T.light;

  const resumeTimerRef = useRef(null);
  const tourRunIdRef   = useRef(0);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const clearTimer = useCallback(() => {
    if (resumeTimerRef.current) {
      clearTimeout(resumeTimerRef.current);
      resumeTimerRef.current = null;
    }
  }, []);

  const removeJoyrideArtifacts = useCallback(() => {
    document
      .querySelectorAll('#react-joyride-portal, .react-joyride__overlay, .react-joyride__spotlight')
      .forEach(el => el.remove());
    document.body.style.overflow  = '';
    document.body.style.pointerEvents = '';
  }, []);

  // ── Stop tour ──────────────────────────────────────────────────────────────
  const stopTour = useCallback((markComplete = true) => {
    tourRunIdRef.current += 1;
    clearTimer();
    setRun(false);
    setStepIndex(0);
    setSteps([]);
    if (markComplete) localStorage.setItem('nexerp_tour_completed', 'true');
    setTimeout(removeJoyrideArtifacts, 200);
  }, [clearTimer, removeJoyrideArtifacts]);

  // ── Begin a tour sequence ──────────────────────────────────────────────────
  const beginTour = useCallback((nextSteps, _type) => {
    if (!nextSteps?.length) return;

    tourRunIdRef.current += 1;
    const runId = tourRunIdRef.current;

    clearTimer();
    setRun(false);
    removeJoyrideArtifacts();
    setSteps(nextSteps);
    setStepIndex(0);

    resumeTimerRef.current = setTimeout(async () => {
      await waitForTarget(nextSteps[0]?.target);
      if (tourRunIdRef.current !== runId) return;
      setRun(true);
      resumeTimerRef.current = null;
    }, 100);
  }, [clearTimer, removeJoyrideArtifacts]);

  // ── Navigate to a specific step (handles route changes) ───────────────────
  const goToStep = useCallback((targetIndex) => {
    if (targetIndex < 0 || targetIndex >= steps.length) {
      stopTour(true);
      return;
    }

    const step    = steps[targetIndex];
    const runId   = tourRunIdRef.current;
    const needNav = step?.route && step.route !== location.pathname;

    clearTimer();
    setRun(false);
    setStepIndex(targetIndex);

    if (needNav) navigate(step.route);

    resumeTimerRef.current = setTimeout(async () => {
      await waitForTarget(step?.target, 3000);
      if (tourRunIdRef.current !== runId) return;
      setRun(true);
      resumeTimerRef.current = null;
    }, needNav ? 600 : 80);
  }, [clearTimer, location.pathname, navigate, steps, stopTour]);

  // ── Public API ─────────────────────────────────────────────────────────────
  const startSystemTour = useCallback(() => {
    beginTour(systemTourSteps, 'system');
  }, [beginTour]);

  const startPageTour = useCallback(() => {
    const currentSteps = pageTours[location.pathname];
    if (currentSteps?.length) {
      beginTour(currentSteps, 'page');
    } else {
      alert('No specific tour available for this page.');
    }
  }, [beginTour, location.pathname]);

  // ── Joyride event handler (v3: prop is `onEvent`, not `callback`) ─────────
  const handleEvent = useCallback((data) => {
    const { action, index, status, type } = data;

    // Tour finished / skipped / closed
    if (
      [STATUS.FINISHED, STATUS.SKIPPED].includes(status) ||
      action === ACTIONS.CLOSE ||
      action === ACTIONS.SKIP
    ) {
      stopTour(true);
      return;
    }

    // Step completed → advance (or go back)
    if (type === EVENTS.STEP_AFTER) {
      const delta = action === ACTIONS.PREV ? -1 : 1;
      goToStep(index + delta);
      return;
    }

    // Target not found → skip forward
    if (type === EVENTS.TARGET_NOT_FOUND) {
      goToStep(index + 1);
    }
  }, [goToStep, stopTour]);

  // ── Auto-start on first visit ──────────────────────────────────────────────
  useEffect(() => {
    if (!localStorage.getItem('nexerp_tour_completed')) {
      localStorage.setItem('nexerp_tour_completed', 'true');
      const t = setTimeout(startSystemTour, 1800);
      return () => clearTimeout(t);
    }
  }, [startSystemTour]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Cleanup on unmount ────────────────────────────────────────────────────
  useEffect(() => () => {
    tourRunIdRef.current += 1;
    clearTimer();
    removeJoyrideArtifacts();
  }, [clearTimer, removeJoyrideArtifacts]);

  return (
    <TourContext.Provider value={{ startSystemTour, startPageTour, stopTour }}>
      <Joyride
        steps={steps}
        run={run}
        stepIndex={stepIndex}
        continuous
        onEvent={handleEvent}
        options={{
          arrowColor:         tok.elev,
          backgroundColor:    tok.elev,
          overlayColor:       'rgba(0,0,0,0.45)',
          primaryColor,
          textColor:          tok.fg,
          zIndex:             10000,
          overlayClickAction: false,   /* don't close tour on overlay click */
          targetWaitTimeout:  3000,
          showProgress:       true,
          spotlightPadding:   4,
          skipScroll:         true,    /* v3: was disableScrolling in v2 */
          skipBeacon:         true,    /* v3: was disableBeacon per-step in v2 */
          buttons:            ['back', 'primary', 'skip'],
        }}
        styles={{
          tooltip: {
            fontFamily: 'ui-sans-serif, system-ui, sans-serif',
            borderRadius: 8,
            border: `1px solid ${tok.border}`,
          },
          tooltipContainer: { textAlign: 'left' },
          buttonNext: { borderRadius: 4, fontWeight: 600 },
          buttonBack: { marginRight: 10, color: tok.fgMuted },
          buttonSkip: { color: tok.fgMuted },
        }}
        locale={{ last: 'Finish', skip: 'Skip Tour', next: 'Next →', back: '← Back' }}
      />
      {children}
    </TourContext.Provider>
  );
}
