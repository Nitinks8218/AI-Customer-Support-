import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import { StatusBadge, PriorityBadge } from './components/ui/Primitives';
import { LandingPage } from './pages/LandingPage';
import { AuthProvider } from './app/AuthContext';
import { ToastProvider } from './components/ui/Toast';

describe('Kestrel Care Frontend UI', () => {
  it('renders status and priority badges accurately', () => {
    render(
      <div>
        <StatusBadge status="ESCALATED" />
        <StatusBadge status="COMPLETED" />
        <PriorityBadge priority="URGENT" />
      </div>
    );
    expect(screen.getByText('Escalated')).toBeInTheDocument();
    expect(screen.getByText('Completed (Simulated)')).toBeInTheDocument();
    expect(screen.getByText('URGENT')).toBeInTheDocument();
  });

  it('renders editorial landing page with policy guardrails', () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <ToastProvider>
            <LandingPage />
          </ToastProvider>
        </AuthProvider>
      </MemoryRouter>
    );
    expect(
      screen.getByText(/Customer resolution with verifiable policy guardrails/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/₹5,000\.00 Escalation Threshold/i)).toBeInTheDocument();
  });
});
