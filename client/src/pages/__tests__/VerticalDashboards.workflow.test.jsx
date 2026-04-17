import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AgencyDashboardPage from "../AgencyDashboardPage";
import RealEstateDashboardPage from "../RealEstateDashboardPage";
import { getAgencyAiSuggestions, getAgencyDashboard } from "../../api/agencies";
import { getRealEstateAiSuggestions, getRealEstateDashboard } from "../../api/realEstate";

jest.mock(
  "react-router-dom",
  () => ({
    __esModule: true,
    Link: ({ to, children, ...props }) => (
      <a href={to} {...props}>
        {children}
      </a>
    ),
  }),
  { virtual: true },
);

jest.mock("../../api/agencies", () => ({
  getAgencyAiSuggestions: jest.fn(),
  getAgencyDashboard: jest.fn(),
}));

jest.mock("../../api/realEstate", () => ({
  getRealEstateAiSuggestions: jest.fn(),
  getRealEstateDashboard: jest.fn(),
}));

jest.mock("react-hot-toast", () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

beforeEach(() => {
  jest.clearAllMocks();
});

test("agency dashboard renders an AI brief, attention queue, and review-aware content kit", async () => {
  getAgencyDashboard.mockResolvedValue({
    summary: {
      activeClients: 4,
      contentQueue: 9,
      pendingApprovals: 2,
      reportReadiness: 3,
    },
    assistantBrief: {
      headline: "Client-facing work is waiting on review.",
      summary: "2 approvals are blocking live sends.",
      confidence: 74,
      mode: "review-aware",
      sources: [{ label: "Approvals", count: 2 }],
    },
    trustSummary: {
      wrongSendRisk: 2,
      explanation: "Client-facing sends or scheduled outputs still need approval coverage.",
    },
    attentionItems: [
      {
        id: "attention-1",
        label: "Review pending client-facing actions",
        description: "Live sends are waiting on review.",
        state: "2 queued",
        tone: "trust",
        requiresApproval: true,
      },
    ],
    recommendedActions: [
      {
        id: "rec-1",
        label: "Clear the approval queue",
        description: "Resolve the highest-risk client-facing sends before more work stacks behind them.",
        state: "Do now",
        tone: "trust",
      },
    ],
    clients: [{ _id: "client-1", clientName: "Northwind" }],
    campaigns: [
      { _id: "campaign-1", name: "Q3 Growth Sprint", status: "active", goal: "growth", channels: ["linkedin", "email"] },
    ],
    contentItems: [
      { _id: "content-1", title: "Launch week post", channel: "linkedin", status: "scheduled", approvalState: "pending", aiConfidence: 81 },
    ],
    approvals: [
      { _id: "approval-1", actionLabel: "Send monthly report", reason: "Wrong report recipient risk." },
    ],
    activityTimeline: [{ id: "act-1", label: "Launch week post", meta: "LinkedIn content moved to scheduled.", state: "Content", tone: "warning" }],
    setupChecklist: [{ id: "setup-1", label: "Create the first client profile", hint: "Clients unlock campaign context.", complete: true }],
  });
  getAgencyAiSuggestions.mockResolvedValue({
    ideas: ["Lead with one proof point from the latest campaign data."],
    calendar: [{ title: "Northwind weekly proof point", channel: "linkedin", theme: "Pipeline proof", status: "review" }],
    confidence: 78,
    rationale: "Generated from the current client, campaign goal, and selected channels.",
  });

  render(<AgencyDashboardPage />);

  expect(await screen.findByText(/Agency execution control center/i)).toBeInTheDocument();
  expect(await screen.findByText(/Client-facing work is waiting on review/i)).toBeInTheDocument();
  expect(screen.getByText(/What needs attention/i)).toBeInTheDocument();
  expect(screen.getByText(/Recommended next actions/i)).toBeInTheDocument();
  expect(await screen.findByText(/Q3 Growth Sprint/i)).toBeInTheDocument();
  expect(screen.getAllByText(/Launch week post/i).length).toBeGreaterThan(0);
  expect(screen.getByText(/Send monthly report/i)).toBeInTheDocument();
  expect(screen.getByText(/Outputs that still need approval coverage/i)).toBeInTheDocument();

  await userEvent.click(screen.getByRole("button", { name: /Generate AI brief/i }));

  await waitFor(() =>
    expect(getAgencyAiSuggestions).toHaveBeenCalledWith({
      clientName: "Northwind",
      campaignGoal: "growth",
      channels: ["linkedin", "email"],
    }),
  );
  expect(await screen.findByText(/Lead with one proof point/i)).toBeInTheDocument();
  expect(screen.getByText(/Generated from the current client/i)).toBeInTheDocument();
});

test("real-estate dashboard renders pipeline intelligence, trust review, and AI summary generation", async () => {
  getRealEstateAiSuggestions.mockResolvedValue({
    summary: "Pipeline summary: Maya Hassan needs a fast follow-up and the Palm Hills deal is still in contract review.",
  });
  getRealEstateDashboard.mockResolvedValue({
    summary: {
      newLeads: 2,
      settlementsDue: 1,
      moneyAtRisk: 175000,
      maintenanceBacklog: 1,
    },
    assistantBrief: {
      headline: "Money movement is waiting on review.",
      summary: "1 settlement still needs review before release.",
      confidence: 71,
      mode: "review-aware",
      sources: [{ label: "Settlements", count: 1 }],
    },
    trustSummary: {
      explanation: "Owner settlements still need review before release.",
    },
    attentionItems: [
      {
        id: "attention-1",
        label: "Owner settlements are waiting on review",
        description: "175000 is still tied up in draft or review-stage settlements.",
        state: "1 pending",
        tone: "trust",
      },
    ],
    recommendedActions: [
      {
        id: "rec-1",
        label: "Follow up with Maya Hassan",
        description: "Send pricing pack",
        state: "Lead flow",
        tone: "danger",
      },
    ],
    deals: [
      {
        _id: "deal-1",
        title: "Palm Hills - Omar Adel",
        stage: "under_contract",
        paymentStatus: "deposit_received",
        propertyId: { title: "Palm Hills Villa" },
      },
    ],
    viewings: [
      {
        _id: "viewing-1",
        propertyId: { title: "Palm Hills Villa" },
        leadId: { name: "Omar Adel" },
        scheduledFor: "2026-05-10T12:00:00.000Z",
        status: "scheduled",
      },
    ],
    leads: [
      {
        _id: "lead-1",
        name: "Maya Hassan",
        currentStage: "contacted",
        nextRequiredAction: "Send pricing pack",
      },
    ],
    settlements: [{ _id: "settlement-1", ownerId: { name: "Amina Mansour" }, status: "review" }],
    activityTimeline: [{ id: "act-1", label: "Palm Hills - Omar Adel", meta: "Deal moved into under contract.", state: "Deal", tone: "info" }],
    setupChecklist: [{ id: "setup-1", label: "Add an owner record", hint: "Owners unlock settlement review.", complete: true }],
  });

  render(<RealEstateDashboardPage />);

  expect(await screen.findByText(/Deal operations dashboard/i)).toBeInTheDocument();
  expect(await screen.findByText(/Money movement is waiting on review/i)).toBeInTheDocument();
  expect(screen.getByText(/What needs attention/i)).toBeInTheDocument();
  expect((await screen.findAllByText(/Palm Hills - Omar Adel/i)).length).toBeGreaterThan(0);
  expect(screen.getAllByText(/Palm Hills Villa/i).length).toBeGreaterThan(0);
  expect(screen.getByText(/Owner settlements waiting for review or release/i)).toBeInTheDocument();
  expect(screen.getAllByText(/Maya Hassan/i).length).toBeGreaterThan(0);
  expect(screen.getAllByText(/Send pricing pack/i).length).toBeGreaterThan(0);
  expect(screen.getByText("175000")).toBeInTheDocument();

  await userEvent.click(screen.getByRole("button", { name: /Generate AI brief/i }));

  await waitFor(() =>
    expect(getRealEstateAiSuggestions).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: "conversation_summary",
      }),
    ),
  );
  expect(await screen.findByText(/Pipeline summary:/i)).toBeInTheDocument();
});
