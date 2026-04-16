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

test("operator surface exposes agency and real-estate execution modules", () => {
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
      "Deal Ops",
      "Leads",
      "Properties",
      "Deals",
      "Settlements",
    ]),
  );
});

test("frontend vertical normalization matches canonical student and real-estate keys", () => {
  expect(normalizeVerticalKey("real_estate")).toBe("realestate");
  expect(normalizeVerticalKey("study")).toBe("student");
});
