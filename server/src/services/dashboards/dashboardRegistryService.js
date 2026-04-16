const { getTemplate } = require("../../config/workflowTemplates");
const { normalizeVerticalKey } = require("../../config/verticals");

const normalizeDashboardVertical = (vertical = "", audienceType = "") =>
  normalizeVerticalKey(vertical || audienceType, "core");

const DASHBOARD_LAYOUTS = {
  operator: {
    agencies: [
      { id: "active_clients", label: "Active clients", type: "metric" },
      { id: "campaign_status", label: "Campaign status", type: "list" },
      { id: "content_queue", label: "Content queue", type: "metric" },
      { id: "pending_approvals", label: "Pending approvals", type: "metric" },
      { id: "report_readiness", label: "Report readiness", type: "metric" },
      { id: "wrong_send_risk", label: "Wrong-send prevention", type: "trust" },
    ],
    realestate: [
      { id: "new_leads", label: "New leads", type: "metric" },
      { id: "active_deals", label: "Deals by stage", type: "list" },
      { id: "viewing_schedule", label: "Viewing schedule", type: "list" },
      { id: "settlements_due", label: "Owner settlements due", type: "metric" },
      { id: "money_at_risk", label: "Money at risk", type: "metric" },
      { id: "maintenance_backlog", label: "Maintenance backlog", type: "metric" },
    ],
    startups: [
      { id: "backlog_health", label: "Backlog health", type: "metric" },
      { id: "sprint_goal_risk", label: "Sprint goal risk", type: "trust" },
      { id: "blocked_work", label: "Blocked work", type: "metric" },
    ],
    insurance: [
      { id: "claims_queue", label: "Claims queue", type: "metric" },
      { id: "sla_risk", label: "SLA risk", type: "trust" },
      { id: "pending_decisions", label: "Decision review queue", type: "metric" },
    ],
    core: [
      { id: "active_count", label: "Active workflows", type: "metric" },
      { id: "pending_approvals", label: "Pending approvals", type: "metric" },
      { id: "system_confidence", label: "System confidence", type: "trust" },
    ],
  },
  student: {
    student: [
      { id: "today_queue", label: "Today", type: "metric" },
      { id: "upcoming_deadlines", label: "Upcoming deadlines", type: "list" },
      { id: "exam_readiness", label: "Exam readiness", type: "trust" },
      { id: "focus_history", label: "Focus history", type: "metric" },
    ],
  },
};

const getDashboardLayout = ({ vertical = "core", surfaceMode = "operator", audienceType = "" } = {}) => {
  const resolvedSurface = surfaceMode === "student" ? "student" : "operator";
  const resolvedVertical = normalizeDashboardVertical(vertical && vertical !== "core" ? vertical : audienceType);
  return (
    DASHBOARD_LAYOUTS[resolvedSurface]?.[resolvedVertical] ||
    DASHBOARD_LAYOUTS[resolvedSurface]?.core ||
    []
  );
};

const buildDashboardWidgets = ({ vertical = "core", surfaceMode = "operator", audienceType = "", data = {} } = {}) => {
  const layout = getDashboardLayout({ vertical, surfaceMode, audienceType });
  const template = getTemplate(audienceType || vertical);

  return layout.map((widget) => ({
    ...widget,
    audienceLabel: template?.label || "",
    value:
      data[widget.id] ??
      data.metrics?.[widget.id] ??
      data.summary?.[widget.id] ??
      null,
  }));
};

module.exports = {
  buildDashboardWidgets,
  getDashboardLayout,
};
