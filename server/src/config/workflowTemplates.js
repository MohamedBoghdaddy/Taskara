const { normalizeVerticalKey } = require("./verticals");

const BASE_TRUST_CONTROLS = [
  "Explainable assignment",
  "Approval mode for risky actions",
  "Audit trail for every AI decision",
  "Pause, cancel, and follow-up stop controls",
  "System-of-record safe sync",
];

const WORKFLOW_TEMPLATES = {
  recruiters: {
    key: "recruiters",
    audienceType: "recruiters",
    slug: "for-recruiters",
    label: "Recruiters",
    painPoint: "Too much admin between candidate touchpoints.",
    workflowChain: ["Email / ATS", "Outreach sent", "Interview booked", "ATS updated"],
    sourceTypes: ["email", "ats", "sourcing_export", "manual", "webhook"],
    readsFirst: "email",
    readsFrom: ["Recruiter inbox", "ATS pipeline", "Sourcing exports", "Manual intake"],
    automaticActions: [
      "Send outreach",
      "Send follow-ups if no reply",
      "Coordinate interview slots",
      "Update candidate stage",
      "Log candidate activity",
      "Trigger rejection and nurture flows",
    ],
    measuredResults: [
      "Response rate",
      "Time to first response",
      "Time to hire",
      "Stage drop-off rate",
    ],
    syncTargets: ["ats", "google_calendar", "email"],
    syncSummary: "ATS, Google Calendar, and email stay in sync with every touchpoint.",
    trustControls: BASE_TRUST_CONTROLS,
    onboarding: {
      requiredIntegration: "email",
      recommendedFallbackIntegration: "google_calendar",
      demoWorkflowType: "candidate_outreach",
      savedMinutesEstimate: 18,
    },
    stages: [
      { id: "sourced", label: "Sourced", color: "#94A3B8" },
      { id: "contacted", label: "Contacted", color: "#2563EB" },
      { id: "replied", label: "Replied", color: "#7C3AED" },
      { id: "interview", label: "Interview", color: "#F59E0B" },
      { id: "offer", label: "Offer", color: "#14B8A6" },
      { id: "hired", label: "Hired", color: "#16A34A" },
      { id: "rejected", label: "Rejected", color: "#EF4444" },
      { id: "nurture", label: "Nurture", color: "#64748B" },
    ],
    metrics: [
      { id: "response_rate", label: "Response Rate", unit: "%" },
      { id: "time_to_first_response", label: "Time to First Response", unit: "hrs" },
      { id: "time_to_hire", label: "Time to Hire", unit: "days" },
      { id: "stage_dropoff_rate", label: "Stage Drop-off", unit: "%" },
    ],
    followUpCadence: [
      { step: 1, delayDays: 2, actionId: "send_followup", maxAttempts: 3 },
      { step: 2, delayDays: 5, actionId: "send_followup", maxAttempts: 2 },
      { step: 3, delayDays: 10, actionId: "add_to_nurture", maxAttempts: 1 },
    ],
    stopConditions: [
      "candidate_replied",
      "stage_advanced",
      "manually_paused",
      "max_attempts_reached",
    ],
    escalationRules: [
      { afterDays: 7, label: "Escalate stalled candidate to hiring manager" },
      { afterDays: 14, label: "Escalate stale pipeline to recruiting lead" },
    ],
    migrationFields: ["candidate_name", "email", "stage", "notes", "history", "owner"],
    workflowTypes: {
      candidate_outreach: {
        label: "Candidate outreach",
        entityType: "candidate",
        stage: "contacted",
        actions: ["send_outreach", "send_followup", "update_stage", "log_activity"],
      },
      interview_coordination: {
        label: "Interview coordination",
        entityType: "candidate",
        stage: "interview",
        actions: ["schedule_interview", "collect_feedback", "update_stage", "log_activity"],
      },
      candidate_rejection: {
        label: "Rejection and nurture",
        entityType: "candidate",
        stage: "rejected",
        actions: ["send_rejection", "add_to_nurture", "log_activity"],
      },
    },
    actionCatalog: {
      send_outreach: {
        label: "Send outreach email",
        channel: "email",
        requiresApproval: true,
        risky: true,
      },
      send_followup: {
        label: "Send candidate follow-up",
        channel: "email",
        requiresApproval: false,
      },
      schedule_interview: {
        label: "Coordinate interview slots",
        channel: "calendar",
        requiresApproval: true,
        risky: true,
      },
      update_stage: {
        label: "Update candidate stage",
        channel: "ats",
        requiresApproval: false,
      },
      log_activity: {
        label: "Log candidate activity",
        channel: "internal",
        requiresApproval: false,
      },
      send_rejection: {
        label: "Send rejection email",
        channel: "email",
        requiresApproval: true,
        risky: true,
      },
      add_to_nurture: {
        label: "Add candidate to nurture flow",
        channel: "email",
        requiresApproval: false,
      },
      collect_feedback: {
        label: "Collect structured interview feedback",
        channel: "email",
        requiresApproval: false,
      },
    },
  },
  startups: {
    key: "startups",
    audienceType: "startups",
    slug: "for-startups",
    label: "Startups",
    painPoint: "Execution gets lost between Slack, docs, founders, ops, product, and engineering.",
    workflowChain: ["Slack thread", "Tasks created", "Owners assigned", "Status posted"],
    sourceTypes: ["slack", "notion", "email", "manual", "webhook"],
    readsFirst: "slack",
    readsFrom: ["Slack threads", "Docs and notes", "Founder inbox", "Ops messages"],
    automaticActions: [
      "Extract tasks from discussions",
      "Group work under an initiative",
      "Assign owners",
      "Create execution items",
      "Post status updates",
      "Sync status to GitHub and Notion",
    ],
    measuredResults: [
      "Execution velocity",
      "Idea to execution time",
      "Unowned task rate",
      "Weekly completion volume",
    ],
    syncTargets: ["slack", "github", "notion", "clickup"],
    syncSummary: "Slack, GitHub, and project docs stay aligned without manual updates.",
    trustControls: BASE_TRUST_CONTROLS,
    onboarding: {
      requiredIntegration: "slack",
      recommendedFallbackIntegration: "github",
      demoWorkflowType: "issue_routing",
      savedMinutesEstimate: 22,
    },
    stages: [
      { id: "captured", label: "Captured", color: "#94A3B8" },
      { id: "triaged", label: "Triaged", color: "#2563EB" },
      { id: "assigned", label: "Assigned", color: "#7C3AED" },
      { id: "in_progress", label: "In progress", color: "#F59E0B" },
      { id: "blocked", label: "Blocked", color: "#EF4444" },
      { id: "done", label: "Done", color: "#16A34A" },
    ],
    metrics: [
      { id: "execution_velocity", label: "Execution Velocity", unit: "items/wk" },
      { id: "idea_to_execution_time", label: "Idea to Execution", unit: "hrs" },
      { id: "unowned_task_rate", label: "Unowned Task Rate", unit: "%" },
      { id: "weekly_completion_volume", label: "Weekly Completion Volume", unit: "items" },
    ],
    followUpCadence: [
      { step: 1, delayDays: 1, actionId: "escalate_unowned", maxAttempts: 2 },
      { step: 2, delayDays: 3, actionId: "post_status_slack", maxAttempts: 10 },
      { step: 3, delayDays: 7, actionId: "post_weekly_report", maxAttempts: null },
    ],
    stopConditions: ["owner_assigned", "task_completed", "manually_paused"],
    escalationRules: [
      { afterDays: 2, label: "Escalate ownerless work to team lead" },
      { afterDays: 5, label: "Escalate stalled initiative to founder or GM" },
    ],
    migrationFields: ["thread_url", "initiative", "owner", "status", "repo", "history"],
    workflowTypes: {
      thread_breakdown: {
        label: "Slack thread breakdown",
        entityType: "initiative",
        stage: "triaged",
        actions: ["extract_tasks", "group_initiative", "assign_owner", "post_status_slack"],
      },
      spec_handoff: {
        label: "Spec to engineering handoff",
        entityType: "initiative",
        stage: "assigned",
        actions: ["group_initiative", "assign_owner", "create_github_issue", "sync_notion"],
      },
      issue_routing: {
        label: "Bug triage and routing",
        entityType: "initiative",
        stage: "assigned",
        actions: ["assign_owner", "create_github_issue", "post_status_slack"],
      },
    },
    actionCatalog: {
      extract_tasks: {
        label: "Extract tasks from discussion",
        channel: "internal",
        requiresApproval: false,
      },
      group_initiative: {
        label: "Group under initiative",
        channel: "internal",
        requiresApproval: false,
      },
      assign_owner: {
        label: "Assign owner",
        channel: "internal",
        requiresApproval: false,
      },
      post_status_slack: {
        label: "Post status update to Slack",
        channel: "slack",
        requiresApproval: false,
      },
      create_github_issue: {
        label: "Create GitHub issue",
        channel: "github",
        requiresApproval: true,
        risky: true,
      },
      sync_notion: {
        label: "Sync status to Notion",
        channel: "notion",
        requiresApproval: false,
      },
      escalate_unowned: {
        label: "Escalate unowned work",
        channel: "slack",
        requiresApproval: false,
      },
      post_weekly_report: {
        label: "Post weekly execution report",
        channel: "slack",
        requiresApproval: false,
      },
    },
  },
  agencies: {
    key: "agencies",
    audienceType: "agencies",
    slug: "for-agencies",
    label: "Agencies",
    painPoint: "Coordination overhead kills margins.",
    workflowChain: ["Client brief", "Deliverables created", "Approvals chased", "Client updated"],
    sourceTypes: ["client_brief", "email", "slack", "whatsapp", "manual", "webhook"],
    readsFirst: "client_brief",
    readsFrom: ["Client briefs", "Email threads", "Slack or WhatsApp messages", "Manual intake"],
    automaticActions: [
      "Break briefs into deliverables",
      "Assign internal owners",
      "Chase approvals",
      "Flag blockers and delays",
      "Send client updates",
      "Maintain account health visibility",
    ],
    measuredResults: [
      "On-time delivery rate",
      "Client approval turnaround",
      "Delay count",
      "Throughput and utilization",
    ],
    syncTargets: ["email", "slack", "whatsapp", "clickup", "notion"],
    syncSummary: "Client comms and project systems stay current without account managers chasing updates.",
    trustControls: BASE_TRUST_CONTROLS,
    onboarding: {
      requiredIntegration: "email",
      recommendedFallbackIntegration: "slack",
      demoWorkflowType: "approval_chase",
      savedMinutesEstimate: 20,
    },
    stages: [
      { id: "brief_received", label: "Brief received", color: "#94A3B8" },
      { id: "scoped", label: "Scoped", color: "#2563EB" },
      { id: "in_progress", label: "In progress", color: "#7C3AED" },
      { id: "pending_client", label: "Pending on client", color: "#F59E0B" },
      { id: "revision", label: "Revision", color: "#F97316" },
      { id: "delivered", label: "Delivered", color: "#16A34A" },
      { id: "blocked", label: "Blocked", color: "#EF4444" },
    ],
    metrics: [
      { id: "on_time_delivery_rate", label: "On-time Delivery", unit: "%" },
      { id: "client_approval_turnaround", label: "Approval Turnaround", unit: "hrs" },
      { id: "delay_count", label: "Delay Count", unit: "items" },
      { id: "throughput_utilization", label: "Throughput / Utilization", unit: "%" },
    ],
    followUpCadence: [
      { step: 1, delayDays: 1, actionId: "chase_approval", maxAttempts: 4 },
      { step: 2, delayDays: 2, actionId: "flag_delay", maxAttempts: 2 },
      { step: 3, delayDays: 7, actionId: "send_status", maxAttempts: null },
    ],
    stopConditions: [
      "client_approved",
      "deliverable_completed",
      "manually_paused",
      "max_attempts_reached",
    ],
    escalationRules: [
      { afterDays: 3, label: "Escalate slow approvals to account manager" },
      { afterDays: 7, label: "Escalate delayed work to agency director" },
    ],
    migrationFields: ["account", "deliverable", "due_date", "approver", "status", "history"],
    workflowTypes: {
      brief_to_deliverables: {
        label: "Brief to deliverables",
        entityType: "account",
        stage: "scoped",
        actions: ["break_brief", "assign_internal", "send_status"],
      },
      approval_chase: {
        label: "Client approval chase",
        entityType: "account",
        stage: "pending_client",
        actions: ["chase_approval", "flag_delay", "send_status"],
      },
      revision_loop: {
        label: "Revision loop",
        entityType: "account",
        stage: "revision",
        actions: ["trigger_revision", "assign_internal", "send_status"],
      },
    },
    actionCatalog: {
      break_brief: {
        label: "Break brief into deliverables",
        channel: "internal",
        requiresApproval: false,
      },
      assign_internal: {
        label: "Assign internal owners",
        channel: "internal",
        requiresApproval: false,
      },
      chase_approval: {
        label: "Chase client approval",
        channel: "email",
        requiresApproval: false,
      },
      send_status: {
        label: "Send client status update",
        channel: "email",
        requiresApproval: true,
        risky: true,
      },
      flag_delay: {
        label: "Flag delay internally",
        channel: "slack",
        requiresApproval: false,
      },
      trigger_revision: {
        label: "Open revision loop",
        channel: "internal",
        requiresApproval: false,
      },
      collect_assets: {
        label: "Request missing assets",
        channel: "email",
        requiresApproval: false,
      },
      mark_delivered: {
        label: "Mark deliverable delivered",
        channel: "internal",
        requiresApproval: false,
      },
    },
  },
  realestate: {
    key: "realestate",
    audienceType: "realestate",
    slug: "for-real-estate",
    label: "Real Estate",
    painPoint: "Everything depends on follow-ups and documents.",
    workflowChain: ["Lead inquiry", "Follow-up sent", "Docs requested", "Milestone updated"],
    sourceTypes: ["crm", "lead_form", "whatsapp", "email", "manual", "webhook"],
    readsFirst: "crm",
    readsFrom: ["Lead forms", "CRM entries", "WhatsApp threads", "Email threads"],
    automaticActions: [
      "Send lead follow-up sequences",
      "Request missing documents",
      "Track next required action",
      "Update deal milestone",
      "Notify responsible parties",
      "Log communication history",
    ],
    measuredResults: [
      "Lead response time",
      "Conversion rate",
      "Deal completion time",
      "Missing document count",
    ],
    syncTargets: ["crm", "whatsapp", "email", "google_drive", "google_calendar"],
    syncSummary: "CRM records, document requests, and follow-up history stay aligned across the deal.",
    trustControls: BASE_TRUST_CONTROLS,
    onboarding: {
      requiredIntegration: "email",
      recommendedFallbackIntegration: "whatsapp",
      demoWorkflowType: "document_chase",
      savedMinutesEstimate: 25,
    },
    stages: [
      { id: "new_lead", label: "New lead", color: "#94A3B8" },
      { id: "contacted", label: "Contacted", color: "#2563EB" },
      { id: "qualified", label: "Qualified", color: "#7C3AED" },
      { id: "showing", label: "Showing", color: "#F59E0B" },
      { id: "offer", label: "Offer", color: "#F97316" },
      { id: "under_contract", label: "Under contract", color: "#14B8A6" },
      { id: "closing", label: "Closing", color: "#16A34A" },
      { id: "closed", label: "Closed", color: "#15803D" },
      { id: "lost", label: "Lost", color: "#EF4444" },
    ],
    metrics: [
      { id: "lead_response_time", label: "Lead Response Time", unit: "mins" },
      { id: "conversion_rate", label: "Conversion Rate", unit: "%" },
      { id: "deal_completion_time", label: "Deal Completion Time", unit: "days" },
      { id: "missing_document_count", label: "Missing Documents", unit: "items" },
    ],
    followUpCadence: [
      { step: 1, delayDays: 0.04, actionId: "send_initial_followup", maxAttempts: 1 },
      { step: 2, delayDays: 1, actionId: "send_sequence_followup", maxAttempts: 3 },
      { step: 3, delayDays: 3, actionId: "request_docs", maxAttempts: 4 },
      { step: 4, delayDays: 7, actionId: "send_sequence_followup", maxAttempts: 2 },
    ],
    stopConditions: [
      "lead_replied",
      "stage_advanced",
      "deal_closed",
      "lead_marked_lost",
      "manually_paused",
    ],
    escalationRules: [
      { afterDays: 1, label: "Escalate slow response to assigned agent" },
      { afterDays: 7, label: "Escalate stalled deal to broker" },
      { afterDays: 14, label: "Escalate long-unresponsive lead to team lead" },
    ],
    migrationFields: ["lead_name", "phone", "deal_stage", "documents", "next_action", "history"],
    workflowTypes: {
      lead_followup: {
        label: "Lead follow-up",
        entityType: "lead",
        stage: "contacted",
        actions: ["send_initial_followup", "send_sequence_followup", "update_stage", "log_communication"],
      },
      document_chase: {
        label: "Document chase",
        entityType: "lead",
        stage: "under_contract",
        actions: ["request_docs", "notify_parties", "log_communication"],
      },
      milestone_update: {
        label: "Milestone update",
        entityType: "lead",
        stage: "closing",
        actions: ["update_stage", "notify_parties", "log_communication"],
      },
    },
    actionCatalog: {
      send_initial_followup: {
        label: "Send initial lead follow-up",
        channel: "email",
        requiresApproval: false,
      },
      send_sequence_followup: {
        label: "Send lead sequence follow-up",
        channel: "email",
        requiresApproval: false,
      },
      request_docs: {
        label: "Request missing documents",
        channel: "email",
        requiresApproval: false,
      },
      update_stage: {
        label: "Update CRM milestone",
        channel: "crm",
        requiresApproval: false,
      },
      notify_parties: {
        label: "Notify responsible parties",
        channel: "email",
        requiresApproval: false,
      },
      log_communication: {
        label: "Log communication trail",
        channel: "internal",
        requiresApproval: false,
      },
      schedule_showing: {
        label: "Coordinate property showing",
        channel: "calendar",
        requiresApproval: true,
        risky: true,
      },
      send_contract: {
        label: "Send contract packet",
        channel: "email",
        requiresApproval: true,
        risky: true,
      },
    },
  },
};

const AUDIENCE_KEYS = Object.keys(WORKFLOW_TEMPLATES);

const resolveAudienceKey = (input) => {
  const normalized = normalizeVerticalKey(input);
  return normalized && WORKFLOW_TEMPLATES[normalized] ? normalized : null;
};

const normalizeAudienceKey = (input, fallback = "startups") => resolveAudienceKey(input) || fallback;

const getTemplate = (input) => {
  const key = normalizeAudienceKey(input);
  return WORKFLOW_TEMPLATES[key] || null;
};

const getWorkflowType = (audienceType, workflowType) => {
  const template = getTemplate(audienceType);
  if (!template) return null;
  if (workflowType && template.workflowTypes[workflowType]) {
    return template.workflowTypes[workflowType];
  }
  return Object.values(template.workflowTypes)[0] || null;
};

module.exports = {
  WORKFLOW_TEMPLATES,
  AUDIENCE_KEYS,
  resolveAudienceKey,
  normalizeAudienceKey,
  getTemplate,
  getWorkflowType,
};
