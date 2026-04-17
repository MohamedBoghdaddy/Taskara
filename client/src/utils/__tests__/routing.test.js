import { getDefaultAuthenticatedPath } from "../routing";

test("agency workspaces default to the agency dashboard", () => {
  expect(
    getDefaultAuthenticatedPath({
      workspaceContext: {
        surfaceMode: "operator",
        vertical: "agencies",
      },
    }),
  ).toBe("/agency/dashboard");
});

test("real-estate workspaces default to the deal dashboard", () => {
  expect(
    getDefaultAuthenticatedPath({
      workspaceContext: {
        surfaceMode: "operator",
        vertical: "real_estate",
      },
    }),
  ).toBe("/real-estate/dashboard");
});

test("student workspaces default to today", () => {
  expect(
    getDefaultAuthenticatedPath({
      workspaceContext: {
        surfaceMode: "student",
      },
    }),
  ).toBe("/today");
});

test("missing workspace context falls back to dashboard", () => {
  expect(getDefaultAuthenticatedPath(null)).toBe("/dashboard");
});
