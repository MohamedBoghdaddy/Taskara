import React from "react";
import { MemoryRouter } from "react-router-dom";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TodayPage from "../TodayPage";
import AIPage from "../AIPage";
import { aiAnswer, aiPlanToday, getDashboardStats } from "../../api";
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
  aiPlanToday: jest.fn(),
  getDashboardStats: jest.fn(),
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
  aiPlanToday.mockResolvedValue({
    summary: "Start with the client report while the queue is small.",
    plan: "Now: Prepare client report\nNext: Clear approvals",
    confidence: 80,
    priorities: [{ title: "Prepare client report", reason: "Highest urgency.", priority: "high" }],
    schedule: [{ slot: "Now", title: "Prepare client report", focus: "Deep work block" }],
    risks: [{ title: "Clear approvals", risk: "Risk of client delay if review slips." }],
  });

  renderWithRouter(<AIPage />);

  expect(screen.getByText(/AI assistant for real work/i)).toBeInTheDocument();

  await userEvent.click(screen.getByRole("button", { name: /Ask AI/i }));

  await waitFor(() => expect(aiAnswer).toHaveBeenCalled());
  expect(await screen.findByText(/workspace changed most/i)).toBeInTheDocument();
  expect(screen.getByText(/Weekly campaign note/i)).toBeInTheDocument();

  await userEvent.click(screen.getByRole("button", { name: /Plan today/i }));
  await userEvent.click(screen.getByRole("button", { name: /Build plan/i }));

  await waitFor(() => expect(aiPlanToday).toHaveBeenCalled());
  expect(await screen.findByText(/Start with the client report/i)).toBeInTheDocument();
  expect(screen.getByText(/Execution plan/i)).toBeInTheDocument();
  expect(screen.getByText(/Deep work block/i)).toBeInTheDocument();
});
