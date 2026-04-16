import {
  AIIcon,
  AnalyticsIcon,
  BacklogIcon,
  BoardIcon,
  BroadcastIcon,
  CalendarCheckIcon,
  CalendarIcon,
  DatabaseIcon,
  FocusIcon,
  GraphIcon,
  HandshakeIcon,
  HomeIcon,
  InboxIcon,
  NoteFilledIcon,
  PaletteIcon,
  ProjectFilledIcon,
  SearchIcon,
  SettingsIcon,
  SprintIcon,
  TaskIcon,
  TimelineIcon,
  TrophyIcon,
  UsersIcon,
  WorkflowIcon,
  ShieldIcon,
} from "../components/common/Icons";
import { CANONICAL_VERTICALS, normalizeSurfaceMode, normalizeVerticalKey } from "./verticals";

const normalizeSurfaceContext = (verticalOrContext = {}, surfaceModeArg = "operator") => {
  if (typeof verticalOrContext === "string") {
    return {
      vertical: normalizeVerticalKey(verticalOrContext),
      surfaceMode: normalizeSurfaceMode(surfaceModeArg),
    };
  }

  return {
    vertical: normalizeVerticalKey(verticalOrContext?.vertical, CANONICAL_VERTICALS.CORE),
    surfaceMode: normalizeSurfaceMode(verticalOrContext?.surfaceMode),
  };
};

const buildStudentGroups = () => [
  {
    label: "Study",
    items: [
      { to: "/today", Icon: CalendarCheckIcon, label: "Today", tip: "Tell me what to do today" },
      { to: "/notes", Icon: NoteFilledIcon, label: "Notes", tip: "Capture lectures and link ideas" },
      { to: "/calendar", Icon: CalendarIcon, label: "Calendar", tip: "Classes, deadlines, and exams" },
      { to: "/pomodoro", Icon: FocusIcon, label: "Focus", tip: "Study sessions and focus history" },
      { to: "/ai", Icon: AIIcon, label: "Study Helper", tip: "Summaries, plans, and explanations" },
    ],
  },
];

const buildOperatorGroups = () => [
  {
    label: "Main",
    items: [
      { to: "/dashboard", Icon: WorkflowIcon, label: "Execution Hub", tip: "Audience workflows, approvals, and sync" },
      { to: "/today", Icon: CalendarCheckIcon, label: "Today", tip: "Daily note + tasks due today" },
      { to: "/inbox", Icon: InboxIcon, label: "Inbox", tip: "Notifications & mentions", badge: true },
      { to: "/search", Icon: SearchIcon, label: "Search", tip: "Full-text search  (Ctrl+K)" },
    ],
  },
  {
    label: "Agency",
    items: [
      { to: "/agency/dashboard", Icon: WorkflowIcon, label: "Agency Ops", tip: "From client request to approved delivery to report" },
      { to: "/agency/clients", Icon: UsersIcon, label: "Clients", tip: "Profiles, retainers, and account health" },
      { to: "/agency/campaigns", Icon: ProjectFilledIcon, label: "Campaigns", tip: "Campaign execution and status" },
      { to: "/agency/content", Icon: PaletteIcon, label: "Content Calendar", tip: "Draft, review, approve, and schedule" },
      { to: "/agency/reports", Icon: AnalyticsIcon, label: "Reports", tip: "Performance summaries and exports" },
      { to: "/agency/approvals", Icon: ShieldIcon, label: "Approval Center", tip: "Prevent wrong sends before they happen" },
    ],
  },
  {
    label: "Real Estate",
    items: [
      { to: "/real-estate/dashboard", Icon: WorkflowIcon, label: "Deal Ops", tip: "From lead to viewing to settlement without losing the thread" },
      { to: "/real-estate/leads", Icon: UsersIcon, label: "Leads", tip: "Lead intake, routing, and follow-up" },
      { to: "/real-estate/properties", Icon: HomeIcon, label: "Properties", tip: "Inventory and owner-linked properties" },
      { to: "/real-estate/deals", Icon: HandshakeIcon, label: "Deals", tip: "Track money, follow-ups, and operations in one flow" },
      { to: "/real-estate/viewings", Icon: CalendarIcon, label: "Viewings", tip: "Scheduling and showing pipeline" },
      { to: "/real-estate/settlements", Icon: TrophyIcon, label: "Settlements", tip: "Owner payouts and financial review" },
    ],
  },
  {
    label: "Work",
    items: [
      { to: "/tasks", Icon: TaskIcon, label: "Tasks", tip: "Kanban board + task list" },
      { to: "/boards", Icon: BoardIcon, label: "Boards", tip: "Trello-style project boards" },
      { to: "/sprints", Icon: SprintIcon, label: "Sprints", tip: "Scrum sprints + burndown" },
      { to: "/backlog", Icon: BacklogIcon, label: "Backlog", tip: "Sprint backlog & planning" },
      { to: "/timeline", Icon: TimelineIcon, label: "Timeline", tip: "Gantt / roadmap view" },
      { to: "/projects", Icon: ProjectFilledIcon, label: "Projects", tip: "Project workspaces" },
      { to: "/calendar", Icon: CalendarIcon, label: "Calendar", tip: "Due dates & reminders" },
    ],
  },
  {
    label: "Knowledge",
    items: [
      { to: "/notes", Icon: NoteFilledIcon, label: "Notes", tip: "Notes with auto-backlinks" },
      { to: "/daily/today", Icon: CalendarCheckIcon, label: "Daily Notes", tip: "Journal by date" },
      { to: "/graph", Icon: GraphIcon, label: "Graph", tip: "Knowledge graph view" },
      { to: "/databases", Icon: DatabaseIcon, label: "Databases", tip: "Custom structured tables" },
    ],
  },
  {
    label: "Insights",
    items: [
      { to: "/pomodoro", Icon: FocusIcon, label: "Focus Timer", tip: "Pomodoro + ambient sounds" },
      { to: "/analytics", Icon: AnalyticsIcon, label: "Analytics", tip: "Focus, task & note stats" },
      { to: "/ai", Icon: AIIcon, label: "AI Assistant", tip: "Workspace AI and drafting tools" },
    ],
  },
  {
    label: "Team",
    items: [
      { to: "/integrations", Icon: BroadcastIcon, label: "Integrations", tip: "Connected systems and writeback coverage" },
      { to: "/pricing", Icon: TrophyIcon, label: "Upgrade Plan", tip: "View plans & pricing" },
      { to: "/settings", Icon: SettingsIcon, label: "Settings", tip: "Preferences and profile" },
    ],
  },
];

export const getNavigationGroups = (verticalOrContext = {}, surfaceModeArg = "operator") => {
  const { surfaceMode } = normalizeSurfaceContext(verticalOrContext, surfaceModeArg);
  return surfaceMode === CANONICAL_VERTICALS.STUDENT ? buildStudentGroups() : buildOperatorGroups();
};
