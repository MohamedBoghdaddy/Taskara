import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SettingsPage from '../SettingsPage';
import {
  getOperationsOverview,
  runConnectorVerification,
  runWorkflowVerification,
  saveFirstUserCohort,
  saveLaunchCriterion,
} from '../../api/operations';

jest.mock('../../store/authStore', () => ({
  useAuthStore: () => ({
    user: { name: 'Amina Operator', email: 'amina@test.local', timezone: 'UTC' },
    updateUser: jest.fn(),
    preferences: { theme: 'system', defaultPomodoroMinutes: 25, defaultShortBreakMinutes: 5, defaultLongBreakMinutes: 15 },
  }),
}));

jest.mock('../../api/auth', () => ({
  updateProfile: jest.fn().mockResolvedValue({ user: { preferences: { theme: 'system' } } }),
}));

jest.mock('../../api/operations', () => ({
  getOperationsOverview: jest.fn(),
  runConnectorVerification: jest.fn(),
  runWorkflowVerification: jest.fn(),
  saveFirstUserCohort: jest.fn(),
  saveLaunchCriterion: jest.fn(),
}));

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { success: jest.fn(), error: jest.fn() },
}));

beforeEach(() => {
  jest.clearAllMocks();
  getOperationsOverview.mockResolvedValue({
    system: { mode: 'staging' },
    launchStatus: {
      go: false,
      status: 'red',
      blockers: ['slack is not ready'],
      warnings: ['connector failure rate is elevated'],
    },
    workerHealth: { status: 'healthy' },
    approvalSystem: { status: 'healthy' },
    checklist: [
      { key: 'system_mode', label: 'System mode', status: 'attention', detail: 'Running in staging.' },
      { key: 'workflow_tests', label: 'Workflow verification', status: 'blocked', detail: '2/4 audience workflow tests have passed.' },
    ],
    monitoring: {
      workflowSuccessRate: 82,
      failedExecutionPct: 11,
      connectorFailureRate: 17,
      workerJobs: { errorCount: 1 },
    },
    connectorReadiness: [
      { provider: 'slack', writebackReady: false, connected: true, status: 'connected_needs_mapping', details: ['Slack webhook is missing.'] },
      { provider: 'email', writebackReady: true, connected: true, status: 'connected', details: ['Email transport is configured.'] },
    ],
    workflowTests: [
      { key: 'startups', label: 'Startups', status: 'passed', passed: true, lastRunAt: '2026-04-16T10:00:00.000Z', reasons: [], logs: ['Created 2 workflow item(s).'] },
    ],
    connectorTests: [
      { key: 'slack', label: 'slack', status: 'failed', passed: false, lastRunAt: '2026-04-16T09:00:00.000Z', reasons: ['Slack webhook is missing.'], logs: [] },
    ],
    recoverability: {
      stuckJobs: 1,
      retryQueue: 2,
      lastWorkerRunAt: '2026-04-16T11:00:00.000Z',
      lastRetryAt: '2026-04-16T11:05:00.000Z',
      failedJobsRecentWindow: 1,
      skippedJobsRecentWindow: 3,
      currentMode: 'poller',
      lastFailureReason: 'Slack webhook is missing.',
    },
    feedbackSummary: {
      correctCount: 2,
      incorrectCount: 1,
      topCategories: [{ key: 'wrong_assignment', count: 1 }],
    },
    firstUsers: [
      {
        key: 'users_1_3',
        label: 'Users 1-3',
        description: 'Friends or known users.',
        sessionCount: 1,
        timeToFirstSuccessMinutes: 12,
        trustAutoSend: 'hesitant',
        confusionPoints: ['Did not understand the approval stop'],
        failedFirstRunMoments: ['Stopped before connecting Slack'],
        notes: 'Needed a nudge.',
      },
    ],
    launchCriteria: {
      trust: { label: 'They approve actions without hesitation', status: 'at_risk', notes: 'Still hesitant' },
      behavior: { label: 'Users run 2+ workflows without help', status: 'unknown', notes: '' },
    },
  });
  runWorkflowVerification.mockResolvedValue({ result: { passed: true } });
  runConnectorVerification.mockResolvedValue({ result: { passed: false } });
  saveFirstUserCohort.mockResolvedValue({ firstUsers: [] });
  saveLaunchCriterion.mockResolvedValue({ launchCriteria: {} });
});

test('settings page shows production readiness and lets operators run verification', async () => {
  render(<SettingsPage />);

  expect(await screen.findByText(/Production Readiness/i)).toBeInTheDocument();
  expect(screen.getByText('NO-GO')).toBeInTheDocument();
  expect(screen.getByText(/slack is not ready/i)).toBeInTheDocument();
  expect(screen.getByText(/Connector Readiness/i)).toBeInTheDocument();
  expect(screen.getByText(/Worker Recoverability/i)).toBeInTheDocument();
  expect(screen.getByText(/First Users Simulation/i)).toBeInTheDocument();
  expect(screen.getByText(/Real Launch Criteria/i)).toBeInTheDocument();

  userEvent.click(screen.getAllByRole('button', { name: /Run workflow test/i })[0]);
  await waitFor(() => expect(runWorkflowVerification).toHaveBeenCalled());

  userEvent.click(screen.getByRole('button', { name: /Send test message/i }));
  await waitFor(() => expect(runConnectorVerification).toHaveBeenCalledWith('slack'));

  userEvent.click(screen.getAllByRole('button', { name: /Save cohort notes/i })[0]);
  await waitFor(() => expect(saveFirstUserCohort).toHaveBeenCalled());

  userEvent.click(screen.getAllByRole('button', { name: /Save criterion/i })[0]);
  await waitFor(() => expect(saveLaunchCriterion).toHaveBeenCalled());
});
