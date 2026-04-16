import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PricingPage from '../PricingPage';
import { getAllPlans, getCurrentPlan, upgradePlan } from '../../api';

jest.mock('../../api', () => ({
  getAllPlans: jest.fn(),
  getCurrentPlan: jest.fn(),
  upgradePlan: jest.fn(),
}));

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { success: jest.fn(), error: jest.fn() },
}));

beforeEach(() => {
  jest.clearAllMocks();
  getAllPlans.mockResolvedValue({
    plans: [
      { key: 'free', name: 'Workflow Free', billingPeriod: 'month', workflowLimit: 15, actionLimit: 60, integrationLimit: 1, autoExecution: false, manualApprovalsRequired: true, priceLabel: '$0', priceBasis: 'workspace / month', typicalUsage: ['1-2 workflows per day'] },
      { key: 'pro', name: 'Workflow Pro', billingPeriod: 'month', workflowLimit: 250, actionLimit: 1200, integrationLimit: 3, autoExecution: true, manualApprovalsRequired: false, priceLabel: '$24', priceBasis: 'workspace / month', operatorFit: 'One live team running real workflow execution every week', typicalUsage: ['3-5 workflows per day'] },
      { key: 'team', name: 'Workflow Team', billingPeriod: 'month', workflowLimit: 1500, actionLimit: 8000, integrationLimit: 8, autoExecution: true, manualApprovalsRequired: false, priceLabel: '$79', priceBasis: 'workspace / month', operatorFit: 'A multi-user ops team coordinating approvals, routing, and analytics', typicalUsage: ['8-15 workflows per day'] },
      { key: 'enterprise', name: 'Workflow Enterprise', billingPeriod: 'month', workflowLimit: -1, actionLimit: -1, integrationLimit: -1, autoExecution: true, manualApprovalsRequired: false, priceLabel: 'Custom', priceBasis: 'custom workspace agreement' },
    ],
  });
  getCurrentPlan.mockResolvedValue({
    effectivePlan: 'pro',
    planDef: { name: 'Workflow Pro', autoExecution: true, manualApprovalsRequired: false, operatorFit: 'One live team running real workflow execution every week', recommendedEgyptPriceLabel: 'EGP 900' },
    usage: {
      workflowsExecuted: { used: 12, limit: 250, remaining: 238, percent: 5, unlimited: false },
      actionsExecuted: { used: 80, limit: 1200, remaining: 1120, percent: 7, unlimited: false },
      integrationsConnected: { used: 2, limit: 3, remaining: 1, percent: 67, unlimited: false },
    },
    usageCounters: { workflowsExecuted: 12, actionsExecuted: 80, integrationsConnected: 2 },
    recommendations: ['Integration capacity is almost full.'],
    isPlatformAdmin: false,
  });
  upgradePlan.mockResolvedValue({
    effectivePlan: 'team',
    planDef: { name: 'Workflow Team', autoExecution: true, manualApprovalsRequired: false },
    usage: {
      workflowsExecuted: { used: 12, limit: 1500, remaining: 1488, percent: 1, unlimited: false },
      actionsExecuted: { used: 80, limit: 8000, remaining: 7920, percent: 1, unlimited: false },
      integrationsConnected: { used: 2, limit: 8, remaining: 6, percent: 25, unlimited: false },
    },
  });
});

test('pricing page renders workflow-based usage packaging and upgrades plans', async () => {
  render(<PricingPage />);

  expect(await screen.findByText(/Workflow-based pricing/i)).toBeInTheDocument();
  expect(screen.getByText(/Benchmarks reviewed from official pricing pages/i)).toBeInTheDocument();
  expect(await screen.findByText(/Integration capacity is almost full/i)).toBeInTheDocument();
  expect(screen.getAllByText(/Connected systems/i).length).toBeGreaterThan(0);
  expect(screen.getAllByText(/Workflow Team/i).length).toBeGreaterThan(0);
  expect(screen.getByText(/\$24/i)).toBeInTheDocument();
  expect(screen.getAllByText(/workspace \/ month/i).length).toBeGreaterThan(0);
  expect(screen.getAllByText(/Typical usage/i).length).toBeGreaterThan(0);
  userEvent.click(screen.getByRole('button', { name: /Upgrade to Workflow Team/i }));
  await waitFor(() => expect(upgradePlan).toHaveBeenCalledWith('team'));
});
