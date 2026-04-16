import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AgencyDashboardPage from "../AgencyDashboardPage";
import RealEstateDashboardPage from "../RealEstateDashboardPage";
import { getAgencyAiSuggestions, getAgencyDashboard } from "../../api/agencies";
import { getRealEstateDashboard } from "../../api/realEstate";

jest.mock("../../api/agencies", () => ({
  getAgencyAiSuggestions: jest.fn(),
  getAgencyDashboard: jest.fn(),
}));

jest.mock("../../api/realEstate", () => ({
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

test("agency dashboard renders trust-first delivery visibility and AI suggestions", async () => {
  getAgencyDashboard.mockResolvedValue({
    summary: {
      activeClients: 4,
      contentQueue: 9,
      pendingApprovals: 2,
      reportReadiness: 3,
    },
    trustSummary: {
      wrongSendRisk: 2,
      explanation: "Client-facing sends or scheduled outputs still need approval coverage.",
    },
    clients: [{ _id: "client-1", clientName: "Northwind" }],
    campaigns: [
      { _id: "campaign-1", name: "Q3 Growth Sprint", status: "active", channels: ["linkedin", "email"] },
    ],
    contentItems: [
      { _id: "content-1", title: "Launch week post", channel: "linkedin", status: "scheduled", approvalState: "pending" },
    ],
    approvals: [
      { _id: "approval-1", actionLabel: "Send monthly report", reason: "Wrong report recipient risk." },
    ],
  });
  getAgencyAiSuggestions.mockResolvedValue({
    ideas: ["Lead with one proof point from the latest campaign data."],
    calendar: [{ title: "Northwind weekly proof point", channel: "linkedin" }],
  });

  render(<AgencyDashboardPage />);

  expect(await screen.findByText(/Agency execution control center/i)).toBeInTheDocument();
  expect(await screen.findByText(/Q3 Growth Sprint/i)).toBeInTheDocument();
  expect(screen.getByText(/Launch week post/i)).toBeInTheDocument();
  expect(screen.getByText(/Send monthly report/i)).toBeInTheDocument();
  expect(screen.getByText(/Outputs that still need approval coverage/i)).toBeInTheDocument();

  await userEvent.click(screen.getByRole("button", { name: /Generate AI ideas/i }));

  await waitFor(() =>
    expect(getAgencyAiSuggestions).toHaveBeenCalledWith({
      clientName: "Northwind",
      campaignGoal: "growth",
      channels: ["linkedin", "email"],
    }),
  );
  expect(await screen.findByText(/Lead with one proof point/i)).toBeInTheDocument();
});

test("real-estate dashboard renders deal flow, viewing visibility, and settlement review context", async () => {
  getRealEstateDashboard.mockResolvedValue({
    summary: {
      newLeads: 2,
      settlementsDue: 1,
      moneyAtRisk: 175000,
      maintenanceBacklog: 1,
    },
    trustSummary: {
      explanation: "Owner settlements still need review before release.",
    },
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
  });

  render(<RealEstateDashboardPage />);

  expect(await screen.findByText(/Deal operations dashboard/i)).toBeInTheDocument();
  expect(await screen.findByText(/Palm Hills - Omar Adel/i)).toBeInTheDocument();
  expect(screen.getAllByText(/Palm Hills Villa/i).length).toBeGreaterThan(0);
  expect(screen.getByText(/Owner settlements waiting for review or release/i)).toBeInTheDocument();
  expect(screen.getByText(/Maya Hassan/i)).toBeInTheDocument();
  expect(screen.getByText(/Send pricing pack/i)).toBeInTheDocument();
  expect(screen.getByText("175000")).toBeInTheDocument();
});
