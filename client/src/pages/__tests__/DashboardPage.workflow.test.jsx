import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DashboardPage from "../DashboardPage";
import {
  completeOnboarding,
  getOnboardingStatus,
  runOnboardingDemo,
  selectOnboardingAudience,
} from "../../api/operations";
import {
  approveWorkflowItem,
  assignWorkflowItem,
  controlWorkflowItem,
  executeWorkflowItem,
  getWorkflowDashboard,
  ingestWorkflowInput,
} from "../../api/workflows";
import { getCurrentPlan } from "../../api";

const mockUser = {
  _id: "user-1",
  name: "Sam Operator",
  email: "sam.operator@test.local",
};

jest.mock("../../store/authStore", () => ({
  useAuthStore: () => ({ user: mockUser }),
}));

jest.mock("../../api/workflows", () => ({
  approveWorkflowItem: jest.fn(),
  assignWorkflowItem: jest.fn(),
  controlWorkflowItem: jest.fn(),
  executeWorkflowItem: jest.fn(),
  getWorkflowDashboard: jest.fn(),
  ingestWorkflowInput: jest.fn(),
}));

jest.mock("../../api/operations", () => ({
  completeOnboarding: jest.fn(),
  getOnboardingStatus: jest.fn(),
  runOnboardingDemo: jest.fn(),
  selectOnboardingAudience: jest.fn(),
}));

jest.mock("../../api", () => ({
  getCurrentPlan: jest.fn(),
}));

jest.mock("react-hot-toast", () => ({
  __esModule: true,
  default: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

const buildDashboard = ({
  audienceType = "startups",
  items = [],
  approvals = [],
  integrationCoverage = [],
  migrationPreview = {},
  metrics = {},
  summary = {},
  runs = [],
} = {}) => ({
  audience: {
    key: audienceType,
    label: audienceType,
    painPoint: "Pain point",
    workflowChain: ["Input", "Action", "Outcome", "Sync"],
    sourceTypes: audienceType === "recruiters" ? ["email", "ats"] : audienceType === "agencies" ? ["client_brief", "email"] : audienceType === "realestate" ? ["lead_form", "email"] : ["slack", "manual"],
    metrics: [{ id: "primary_metric", label: "Primary Metric" }],
  },
  audiences: [],
  summary: {
    activeCount: 1,
    pendingApprovals: approvals.length,
    completedThisWeek: 0,
    scheduledFollowUps: items.filter((item) => item.followUp?.active).length,
    ...summary,
  },
  metrics: {
    primary_metric: 1,
    ...metrics,
  },
  items,
  approvals,
  runs,
  integrationCoverage,
  entitySummary: {},
  migrationPreview: {
    mappingPreview: [
      { sourceField: "owner", targetField: "assignee" },
      { sourceField: "status", targetField: "stage / status" },
    ],
    validation: {
      readyToImport: false,
      warnings: ["Some source fields are unsupported and will need manual handling before import."],
    },
    ...migrationPreview,
  },
  emptyStateExample: {
    sourceType: audienceType === "recruiters" ? "email" : "slack",
    title: "Example input",
    text: "Example workflow input",
  },
});

const baseItem = {
  _id: "item-1",
  title: "Workflow item",
  description: "Workflow description",
  workflowType: "thread_breakdown",
  audienceType: "startups",
  sourceType: "slack",
  status: "ready",
  stage: "triaged",
  executionPlan: [{ id: "extract_tasks", label: "Extract tasks", status: "done" }],
  assignee: {
    userId: "user-2",
    name: "Priya Product",
    reason: "Assigned because product engineering owns this workflow.",
    manualOverride: false,
  },
  traceability: { outcomeSummary: "Awaiting operator review." },
  followUp: { active: false, stopReason: "" },
  actionLogs: [],
  auditTrail: [{ at: "2026-04-15T10:00:00.000Z", type: "note", actorType: "system", message: "Workflow created." }],
  syncLogs: [],
};

beforeEach(() => {
  jest.clearAllMocks();
  approveWorkflowItem.mockResolvedValue({});
  assignWorkflowItem.mockResolvedValue({});
  controlWorkflowItem.mockResolvedValue({});
  executeWorkflowItem.mockResolvedValue({});
  ingestWorkflowInput.mockResolvedValue({});
  getOnboardingStatus.mockResolvedValue({
    onboarding: {
      audienceType: "startups",
      currentStep: 1,
      requiredIntegration: "slack",
      integrationReady: false,
      integrationStatus: { details: ["Slack webhook is missing."] },
      demoAvailable: true,
      resultSummary: "",
      savedMinutesEstimate: 22,
    },
  });
  selectOnboardingAudience.mockResolvedValue({
    onboarding: {
      audienceType: "startups",
      currentStep: 2,
      requiredIntegration: "slack",
      integrationReady: false,
      integrationStatus: { details: ["Slack webhook is missing."] },
      demoAvailable: true,
      resultSummary: "",
      savedMinutesEstimate: 22,
    },
  });
  runOnboardingDemo.mockResolvedValue({ onboarding: { currentStep: 4 } });
  completeOnboarding.mockResolvedValue({ onboarding: { completedAt: "2026-04-16T12:00:00.000Z" } });
  getCurrentPlan.mockResolvedValue({
    planDef: { name: "Workflow Pro" },
    usage: {
      workflowsExecuted: { used: 8, limit: 250, remaining: 242, percent: 3, unlimited: false },
      actionsExecuted: { used: 20, limit: 1200, remaining: 1180, percent: 2, unlimited: false },
      integrationsConnected: { used: 1, limit: 3, remaining: 2, percent: 33, unlimited: false },
    },
    recommendations: [],
  });
});

test("recruiter dashboard supports approve flow and refreshes safely", async () => {
  const recruiterPending = buildDashboard({
    audienceType: "recruiters",
    items: [
      {
        ...baseItem,
        _id: "recruiter-item",
        title: "Candidate outreach: Ada Lovelace",
        audienceType: "recruiters",
        workflowType: "candidate_outreach",
        sourceType: "email",
        status: "awaiting_approval",
        approvalStatus: "pending",
        actionLogs: [{ actionId: "send_outreach", label: "Send outreach", status: "awaiting_approval" }],
      },
    ],
    approvals: [
      {
        _id: "approval-1",
        executionItemId: "recruiter-item",
        actionLabel: "Send outreach email",
        reason: "Candidate comms require approval.",
      },
    ],
    integrationCoverage: [
      {
        provider: "ats",
        connected: false,
        ready: false,
        status: "mapping_required",
        details: ["ATS sync remains protected until stage, owner, and activity mappings are configured."],
      },
    ],
  });

  const recruiterApproved = {
    ...recruiterPending,
    summary: { ...recruiterPending.summary, pendingApprovals: 0 },
    approvals: [],
    items: [
      {
        ...recruiterPending.items[0],
        approvalStatus: "approved",
        status: "in_progress",
        actionLogs: [{ actionId: "send_outreach", label: "Send outreach", status: "executed" }],
        traceability: { outcomeSummary: "Send outreach email executed successfully." },
      },
    ],
  };

  let approved = false;
  getWorkflowDashboard.mockImplementation((audience) => {
    if (audience === "recruiters") {
      return Promise.resolve(approved ? recruiterApproved : recruiterPending);
    }
    return Promise.resolve(buildDashboard({ audienceType: "startups" }));
  });
  approveWorkflowItem.mockImplementation(() => {
    approved = true;
    return Promise.resolve({});
  });

  render(<DashboardPage />);

  userEvent.click(screen.getByRole("button", { name: /Recruiters/i }));
  expect(await screen.findByText("Candidate outreach: Ada Lovelace")).toBeInTheDocument();

  userEvent.click(screen.getAllByRole("button", { name: "Approve" })[0]);

  await waitFor(() => expect(approveWorkflowItem).toHaveBeenCalledWith("recruiter-item", "approve"));
  expect(await screen.findByText(/No approvals are waiting right now/i)).toBeInTheDocument();
  expect(screen.getByText(/Send outreach email executed successfully/i)).toBeInTheDocument();
});

test("startup dashboard shows linked task context and supports claim, stop-followup, and undo controls", async () => {
  getWorkflowDashboard.mockResolvedValue(
    buildDashboard({
      audienceType: "startups",
      items: [
        {
          ...baseItem,
          _id: "startup-item",
          title: "Slack thread breakdown: Launch blockers",
          linkedTaskId: "task-startup-1",
          status: "scheduled",
          followUp: {
            active: true,
            nextRunAt: "2026-04-16T09:00:00.000Z",
            stopReason: "",
          },
          actionLogs: [
            { actionId: "assign_owner", label: "Assign owner", status: "executed" },
            { actionId: "post_status_slack", label: "Post Slack update", status: "scheduled" },
          ],
          syncLogs: [
            {
              provider: "slack",
              status: "failed",
              details: { reason: "Slack webhook is missing." },
            },
          ],
        },
      ],
      integrationCoverage: [
        {
          provider: "github",
          connected: true,
          ready: false,
          status: "connected_needs_repo_mapping",
          details: ["GitHub is connected but no repo mapping has been selected."],
        },
      ],
    }),
  );

  render(<DashboardPage />);

  expect(await screen.findByText("Slack thread breakdown: Launch blockers")).toBeInTheDocument();
  expect(screen.getByText(/Linked task: task-startup-1/i)).toBeInTheDocument();
  expect(screen.getByText(/slack: failed/i)).toBeInTheDocument();
  expect(screen.getAllByText(/GitHub is connected but no repo mapping has been selected/i).length).toBeGreaterThan(0);
  expect(screen.getByText(/Preview found field warnings/i)).toBeInTheDocument();

  userEvent.click(screen.getByRole("button", { name: /Route to me/i }));
  userEvent.click(screen.getByRole("button", { name: /Stop follow-up/i }));
  userEvent.click(screen.getByRole("button", { name: /Undo last action/i }));

  await waitFor(() => expect(assignWorkflowItem).toHaveBeenCalledWith("startup-item", "user-1"));
  expect(controlWorkflowItem).toHaveBeenCalledWith("startup-item", "stop_followup");
  expect(controlWorkflowItem).toHaveBeenCalledWith("startup-item", "undo_last_action");
});

test("agency and real-estate audiences render partial, blocked, and connector-limited states without crashing", async () => {
  getWorkflowDashboard.mockImplementation((audience) => {
    if (audience === "agencies") {
      return Promise.resolve(
        buildDashboard({
          audienceType: "agencies",
          items: [
            {
              ...baseItem,
              _id: "agency-item",
              title: "Northwind - Landing page approvals",
              audienceType: "agencies",
              sourceType: "client_brief",
              workflowType: "approval_chase",
              status: "blocked",
              stage: "pending_client",
              description: "",
              auditTrail: [],
            },
          ],
          integrationCoverage: [
            {
              provider: "clickup",
              connected: false,
              ready: false,
              status: "not_connected",
              details: ["ClickUp API key is missing."],
            },
          ],
        }),
      );
    }

    if (audience === "realestate") {
      return Promise.resolve(
        buildDashboard({
          audienceType: "realestate",
          items: [
            {
              ...baseItem,
              _id: "lead-item",
              title: "Lead follow-up: Maya Hassan",
              audienceType: "realestate",
              sourceType: "lead_form",
              workflowType: "lead_followup",
              status: "scheduled",
              stage: "under_contract",
              syncLogs: [
                {
                  provider: "crm",
                  status: "awaiting_connector",
                  details: { reason: "CRM sync remains protected until milestone, owner, and record mappings are configured." },
                },
              ],
            },
          ],
          integrationCoverage: [
            {
              provider: "crm",
              connected: false,
              ready: false,
              status: "mapping_required",
              details: ["CRM sync remains protected until milestone, owner, and record mappings are configured."],
            },
          ],
        }),
      );
    }

    return Promise.resolve(buildDashboard({ audienceType: "startups", items: [] }));
  });

  render(<DashboardPage />);

  userEvent.click(screen.getByRole("button", { name: /Agencies/i }));
  expect(await screen.findByText("Northwind - Landing page approvals")).toBeInTheDocument();
  expect(screen.getByText(/No sync attempts recorded yet/i)).toBeInTheDocument();
  expect(screen.getAllByText(/ClickUp API key is missing/i).length).toBeGreaterThan(0);

  userEvent.click(screen.getAllByRole("button", { name: /Real Estate/i })[0]);
  expect(await screen.findByText("Lead follow-up: Maya Hassan")).toBeInTheDocument();
  expect(screen.getByText(/crm: awaiting connector/i)).toBeInTheDocument();
  expect(screen.getAllByText(/CRM sync remains protected/i).length).toBeGreaterThan(0);
});

test("dashboard surfaces guided onboarding and usage counters", async () => {
  getWorkflowDashboard.mockResolvedValue(buildDashboard({ audienceType: "startups", items: [] }));

  render(<DashboardPage />);

  expect(await screen.findByText(/Run one guided workflow before you go live/i)).toBeInTheDocument();
  expect(screen.getAllByText(/Current package/i).length).toBeGreaterThan(0);
  expect(screen.getAllByText(/Workflow Pro/i).length).toBeGreaterThan(0);
  expect(screen.getByText(/Workflows \/ month/i)).toBeInTheDocument();

  userEvent.click(screen.getByRole("button", { name: /Run guided demo/i }));
  await waitFor(() => expect(runOnboardingDemo).toHaveBeenCalledWith("startups"));
});
