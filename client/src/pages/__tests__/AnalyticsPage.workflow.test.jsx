import React from "react";
import { render, screen } from "@testing-library/react";
import AnalyticsPage from "../AnalyticsPage";
import { getWorkflowAnalytics } from "../../api/workflows";

jest.mock("../../api/workflows", () => ({
  getWorkflowAnalytics: jest.fn(),
}));

jest.mock("react-hot-toast", () => ({
  __esModule: true,
  default: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

beforeEach(() => {
  jest.clearAllMocks();
});

test("analytics page renders seeded audience metrics and stays safe with partial data", async () => {
  getWorkflowAnalytics.mockResolvedValue({
    entries: [
      {
        audienceType: "recruiters",
        metrics: {
          response_rate: 54,
          time_to_first_response: 6.2,
        },
      },
      {
        audienceType: "startups",
        metrics: {},
      },
      {
        audienceType: "agencies",
        metrics: {
          on_time_delivery_rate: 88,
        },
      },
      {
        audienceType: "realestate",
        metrics: {
          missing_document_count: 3,
        },
      },
    ],
  });

  render(<AnalyticsPage />);

  expect(await screen.findByText(/Measure the workflow, not just activity volume/i)).toBeInTheDocument();
  expect(await screen.findByText(/No workflow data yet for this audience/i)).toBeInTheDocument();
  expect(await screen.findByText("54")).toBeInTheDocument();
  expect(screen.getByText("88")).toBeInTheDocument();
  expect(screen.getByText("3")).toBeInTheDocument();
});
