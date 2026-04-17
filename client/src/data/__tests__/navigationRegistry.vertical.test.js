import { getNavigationGroups } from "../navigationRegistry";
import { normalizeVerticalKey } from "../verticals";

const flattenLabels = (groups) => groups.flatMap((group) => group.items.map((item) => item.label));

test("student surface stays calm and does not inherit operator-heavy navigation", () => {
  const labels = flattenLabels(getNavigationGroups({ surfaceMode: "student" }));

  expect(labels).toEqual(
    expect.arrayContaining(["Today", "Notes", "Calendar", "Focus", "Study Helper"]),
  );
  expect(labels).not.toEqual(expect.arrayContaining(["Execution Hub", "Agency Ops", "Deal Ops"]));
});

test("agency operator surface exposes agency execution modules without unrelated real-estate modules", () => {
  const labels = flattenLabels(getNavigationGroups({ surfaceMode: "operator", vertical: "agencies" }));

  expect(labels).toEqual(
    expect.arrayContaining([
      "Execution Hub",
      "Agency Ops",
      "Clients",
      "Campaigns",
      "Content Calendar",
      "Reports",
      "Approval Center",
    ]),
  );
  expect(labels).not.toEqual(expect.arrayContaining(["Deal Ops", "Leads", "Properties", "Deals", "Settlements"]));
});

test("core operator surface still exposes both vertical launch points", () => {
  const labels = flattenLabels(getNavigationGroups({ surfaceMode: "operator", vertical: "core" }));

  expect(labels).toEqual(expect.arrayContaining(["Agency Ops", "Deal Ops", "Clients", "Properties"]));
});

test("frontend vertical normalization matches canonical student and real-estate keys", () => {
  expect(normalizeVerticalKey("real_estate")).toBe("realestate");
  expect(normalizeVerticalKey("study")).toBe("student");
});
