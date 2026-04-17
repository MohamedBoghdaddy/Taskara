import React from "react";
import { MemoryRouter } from "react-router-dom";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TodayPage from "../TodayPage";
import AIPage from "../AIPage";
import { aiAnswer, aiCommandCenter, aiPlanToday, aiWorkspaceSummary, getDashboardStats, search } from "../../api";
import { generateDailyNote } from "../../api/notes";
import { createTask, getTodayTasks, updateTask } from "../../api/tasks";

jest.mock(
  "react-router-dom",
  () => ({
    __esModule: true,
    Link: ({ to, children, ...props }) => (
      <a href={to} {...props}>
        {children}
      </a>
    ),
    MemoryRouter: ({ children }) => <>{children}</>,
  }),
  { virtual: true },
);

jest.mock("../../api", () => ({
  aiAnswer: jest.fn(),
  aiCommandCenter: jest.fn(),
  aiPlanToday: jest.fn(),
  aiWorkspaceSummary: jest.fn(),
  getDashboardStats: jest.fn(),
  search: jest.fn(),
}));

jest.mock("../../api/notes", () => ({
  generateDailyNote: jest.fn(),
}));

jest.mock("../../api/tasks", () => ({
  createTask: jest.fn(),
  getTodayTasks: jest.fn(),
  updateTask: jest.fn(),
}));

jest.mock("react-hot-toast", () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

const renderWithRouter = (ui) => render(<MemoryRouter>{ui}</MemoryRouter>);

beforeEach(() => {
  jest.clearAllMocks();
});

test("today page surfaces AI planning, focus metrics, and a clearer daily work rhythm", async () => {
  getTodayTasks.mockResolvedValue([
    { _id: "task-1", title: "Prepare client report", status: "todo", priority: "high", dueDate: "2026-04-17T09:00:00.000Z" },
    { _id: "task-2", title: "Check approvals", status: "done", priority: "medium" },
  ]);
  getDashboardStats.mockResolvedValue({ focusStats: { totalMinutes: 55 } });
  generateDailyNote.mockResolvedValue({ title: "Daily note - April 17" });
  aiPlanToday.mockResolvedValue({
    summary: "Start with the client report, then clear approvals before lower-value admin work.",
    plan: "Now: Prepare client report\nNext: Check approvals\nLater: Cleanup admin",
    confidence: 81,
    priorities: [{ title: "Prepare client report", reason: "Highest urgency.", priority: "high" }],
    schedule: [{ slot: "Now", title: "Prepare client report", focus: "Deep work block" }],
    risks: [{ title: "Prepare client report", risk: "The due time is close." }],
  });
  updateTask.mockImplementation(async (_id, patch) => ({ _id: "task-1", title: "Prepare client report", priority: "high", ...patch }));
  createTask.mockResolvedValue({ _id: "task-3", title: "Send follow-up", status: "todo", priority: "medium" });

  renderWithRouter(<TodayPage />);

  expect(await screen.findByText(/What needs attention today/i)).toBeInTheDocument();
  expect(screen.getByText(/Prepare client report/i)).toBeInTheDocument();
  expect(screen.getByText(/Focus mins/i)).toBeInTheDocument();
  expect(screen.getByText("55")).toBeInTheDocument();

  await userEvent.click(screen.getByRole("button", { name: /Plan with AI/i }));

  await waitFor(() => expect(aiPlanToday).toHaveBeenCalled());
  expect(await screen.findByText(/Start with the client report/i)).toBeInTheDocument();
  expect(screen.getByText(/AI planning details/i)).toBeInTheDocument();
  expect(screen.getByText(/Deep work block/i)).toBeInTheDocument();
});

test("ai page renders structured workspace answers and review-aware day plans", async () => {
  aiAnswer.mockResolvedValue({
    answer: "The workspace changed most in the campaign notes and the approvals queue.",
    confidence: 74,
    sources: [{ noteId: "note-1", title: "Weekly campaign note", relevance: 3 }],
  });
  getTodayTasks.mockResolvedValue([{ _id: "task-1", title: "Prepare client report", status: "todo", priority: "high" }]);
  aiWorkspaceSummary.mockResolvedValue({
    headline: "High-priority work is active right now.",
    summary: "1 open task and recent notes are shaping the current workspace state.",
    confidence: 73,
    sources: [{ label: "Tasks", count: 1 }],
    whatMattersNow: [{ id: "attention-1", label: "Prepare client report", description: "Highest urgency.", state: "Priority", tone: "warning" }],
    recommendations: [{ id: "rec-1", label: "Start with the report", description: "Use the top task as the anchor.", state: "Next action", tone: "info" }],
    prediction: { headline: "Delivery risk is elevated.", confidence: 71, reasoning: "The queue is small but time-sensitive.", factors: ["1 overdue item"] },
  });
  search.mockResolvedValue({
    total: 1,
    results: [{ type: "note", item: { _id: "note-1", title: "Weekly campaign note", contentText: "Northwind next steps" }, score: 7 }],
  });
  aiCommandCenter.mockResolvedValue({
    intent: "create_campaign",
    intentLabel: "Create campaign workflow",
    confidence: 82,
    directAnswer: 'Taskara interprets this as "Create campaign workflow" for agency operations.',
    reasoning: ["Intent matched because campaign language was detected."],
    proposedActions: [{ id: "action-1", label: "Create campaign workflow", description: "Turn the request into a structured draft.", state: "Structured draft", tone: "info" }],
    recommendations: [{ id: "rec-1", label: "Add source context before execution", description: "Attach client context first.", state: "Context", tone: "info" }],
    executionPreview: { status: "review_before_run", requiresApproval: true, approvalReason: "This request affects external delivery.", suggestedRoute: "/agency/campaigns" },
  });
  aiPlanToday.mockResolvedValue({
    summary: "Start with the client report while the queue is small.",
    plan: "Now: Prepare client report\nNext: Clear approvals",
    confidence: 80,
    priorities: [{ title: "Prepare client report", reason: "Highest urgency.", priority: "high" }],
    schedule: [{ slot: "Now", title: "Prepare client report", focus: "Deep work block" }],
    risks: [{ title: "Clear approvals", risk: "Risk of client delay if review slips." }],
  });

  renderWithRouter(<AIPage />);

  expect(screen.getByText(/The operating brain for the workspace/i)).toBeInTheDocument();

  await userEvent.click(screen.getByRole("button", { name: /Ask AI/i }));

  await waitFor(() => expect(aiAnswer).toHaveBeenCalled());
  expect((await screen.findAllByText(/workspace changed most/i)).length).toBeGreaterThan(0);
  expect(screen.getByText(/Weekly campaign note/i)).toBeInTheDocument();

  await userEvent.click(screen.getByRole("button", { name: /Plan/i }));
  await userEvent.click(screen.getByRole("button", { name: /Build plan/i }));

  await waitFor(() => expect(aiPlanToday).toHaveBeenCalled());
  expect((await screen.findAllByText(/Start with the client report/i)).length).toBeGreaterThan(0);
  expect(screen.getByText(/Execution plan/i)).toBeInTheDocument();
  expect(screen.getByText(/Deep work block/i)).toBeInTheDocument();

  await userEvent.click(screen.getByRole("button", { name: /Summarize/i }));
  await userEvent.click(screen.getByRole("button", { name: /^Summarize$/i }));

  await waitFor(() => expect(aiWorkspaceSummary).toHaveBeenCalled());
  expect((await screen.findAllByText(/High-priority work is active right now/i)).length).toBeGreaterThan(0);
  expect(screen.getByText(/Predictive signal/i)).toBeInTheDocument();

  await userEvent.click(screen.getByRole("button", { name: /Search/i }));
  await userEvent.click(screen.getByRole("button", { name: /^Search$/i }));

  await waitFor(() => expect(search).toHaveBeenCalled());
  expect(await screen.findByText(/Search results/i)).toBeInTheDocument();

  await userEvent.click(screen.getByRole("button", { name: /Automate/i }));
  await userEvent.click(screen.getByRole("button", { name: /Preview actions/i }));

  await waitFor(() => expect(aiCommandCenter).toHaveBeenCalled());
  expect(await screen.findByText(/Automation preview/i)).toBeInTheDocument();
  expect(screen.getAllByText(/Create campaign workflow/i).length).toBeGreaterThan(0);
});
