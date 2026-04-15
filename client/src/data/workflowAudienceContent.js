export const AUDIENCE_CONTENT = {
  recruiters: {
    key: "recruiters",
    slug: "/for-recruiters",
    label: "Recruiters",
    hero: "email/ATS -> outreach sent -> interview booked -> stage updated",
    headline: "Recruiting ops without the candidate chase",
    subheadline:
      "Taskara reads inbox and pipeline signals, decides the next candidate action, executes it safely, and syncs every outcome back to your ATS.",
    painPoint: "Too much admin between candidate touchpoints.",
    readsFirst: "Email and ATS pipeline activity",
    automaticActions: [
      "Send outreach and no-reply follow-ups",
      "Coordinate interview slots with calendar awareness",
      "Update stage and activity history in the ATS",
      "Trigger rejection and nurture flows with approval controls",
    ],
    measuredResults: [
      "Response rate",
      "Time to first response",
      "Time to hire",
      "Stage drop-off rate",
    ],
    syncTargets: ["ATS", "Google Calendar", "Email"],
    workflowChain: ["Input", "Extract", "Decide", "Execute", "Track", "Sync"],
    fiveQuestions: {
      hateMost: "Chasing candidates, manual follow-ups, interview coordination, and ATS updates after every action.",
      readsFrom: "Email first, then ATS pipeline changes and sourcing exports when present.",
      automaticAction:
        "Outreach is sent, follow-ups stop on reply, interviews are coordinated, stages are updated, and every touchpoint is logged.",
      measuredResult:
        "Taskara reports response rate, first-response time, time to hire, and where candidates drop out of the funnel.",
      mustSync: "Greenhouse, Lever, Ashby-style ATSs, Google Calendar, and recruiter email.",
    },
    trustControls: [
      "Approval mode before candidate-facing emails",
      "Calendar conflict handling and interviewer coordination state",
      "Structured scorecards and activity audit trail",
      "Pause, cancel, and follow-up stop conditions",
    ],
    metricsPreview: [
      { label: "Response rate", value: "38%", note: "Measured on recruiter-owned outreach" },
      { label: "First response", value: "6.4h", note: "Median from outreach to reply" },
      { label: "Time to hire", value: "23d", note: "Across active reqs" },
    ],
  },
  startups: {
    key: "startups",
    slug: "/for-startups",
    label: "Startups",
    hero: "Slack thread -> tasks created -> owners assigned -> status posted",
    headline: "Turn discussion into shipped work",
    subheadline:
      "Taskara reads Slack and docs, extracts execution items, routes ownership with explainable logic, posts status back to the team, and keeps GitHub and docs aligned.",
    painPoint: "Execution gets lost between Slack, docs, founders, ops, product, and engineering.",
    readsFirst: "Slack threads and docs",
    automaticActions: [
      "Extract tasks from messy discussions",
      "Group work under an initiative or project",
      "Assign owners with workload-aware routing",
      "Post async status updates and sync GitHub or Notion",
    ],
    measuredResults: [
      "Execution velocity",
      "Idea to execution time",
      "Unowned task rate",
      "Weekly completion volume",
    ],
    syncTargets: ["Slack", "GitHub", "Notion", "ClickUp"],
    workflowChain: ["Input", "Extract", "Decide", "Execute", "Track", "Sync"],
    fiveQuestions: {
      hateMost:
        "Turning conversations into tasks, assigning owners manually, writing status updates, and losing context between discussion and execution.",
      readsFrom: "Slack threads first, then docs, notes, founder inbox, and ops messages.",
      automaticAction:
        "Taskara extracts execution items, assigns owners, opens GitHub-aware work, posts updates back to Slack, and keeps initiatives grouped.",
      measuredResult:
        "Taskara tracks execution velocity, how long ideas sit before action, how much work is ownerless, and weekly completion volume.",
      mustSync: "Slack, GitHub, Notion, ClickUp, and release workflows.",
    },
    trustControls: [
      "Why this was assigned is visible on every item",
      "Owner override and route-to-me controls",
      "Approval before external actions like GitHub issue creation",
      "Audit log from thread capture to shipped outcome",
    ],
    metricsPreview: [
      { label: "Execution velocity", value: "42/wk", note: "Closed workflow items" },
      { label: "Idea to execution", value: "3.1h", note: "From capture to first action" },
      { label: "Unowned rate", value: "7%", note: "Across active initiatives" },
    ],
  },
  agencies: {
    key: "agencies",
    slug: "/for-agencies",
    label: "Agencies",
    hero: "client brief -> deliverables created -> approvals chased -> client updated",
    headline: "Protect margin by automating coordination",
    subheadline:
      "Taskara reads client briefs and message threads, breaks them into deliverables, chases approvals safely, flags blockers, and keeps client updates moving without account managers doing the glue work.",
    painPoint: "Coordination overhead kills margins.",
    readsFirst: "Client brief docs, email threads, and client messages",
    automaticActions: [
      "Break briefs into deliverables and assign internal owners",
      "Chase approvals and request missing assets",
      "Generate and send client status updates with approval mode",
      "Flag blockers and delay risk before deadlines slip",
    ],
    measuredResults: [
      "On-time delivery rate",
      "Client approval turnaround",
      "Delay count",
      "Throughput and utilization",
    ],
    syncTargets: ["Email", "Slack", "WhatsApp", "Project system"],
    workflowChain: ["Input", "Extract", "Decide", "Execute", "Track", "Sync"],
    fiveQuestions: {
      hateMost:
        "Client communication overhead, approval chasing, recurring workflow coordination, and deadline drift when the client goes silent.",
      readsFrom: "Briefs first, then email threads, Slack, and WhatsApp messages.",
      automaticAction:
        "Deliverables are created, owners are assigned, approvals are chased with stop conditions, blockers are flagged, and client updates are sent safely.",
      measuredResult:
        "Taskara measures on-time delivery, approval turnaround, delay count, and throughput versus team capacity.",
      mustSync: "Email, client comms, and the project system that runs delivery.",
    },
    trustControls: [
      "Approval mode before client-facing status emails",
      "Blocked and pending-on-client states",
      "Revision loop tracking and account health visibility",
      "Visible communication log for every account",
    ],
    metricsPreview: [
      { label: "On-time delivery", value: "91%", note: "Across active deliverables" },
      { label: "Approval turnaround", value: "14h", note: "Client response to first chase" },
      { label: "Delay count", value: "3", note: "Open risk flags this week" },
    ],
  },
  realestate: {
    key: "realestate",
    slug: "/for-real-estate",
    label: "Real Estate",
    hero: "lead inquiry -> follow-up sent -> docs requested -> milestone updated",
    headline: "Keep every deal moving without manual follow-up",
    subheadline:
      "Taskara reads leads from forms, CRM, WhatsApp, and email, automates the follow-up sequence, requests missing documents, tracks next required action, and updates the deal milestone trail.",
    painPoint: "Everything depends on follow-ups and documents.",
    readsFirst: "CRM and lead forms",
    automaticActions: [
      "Send lead follow-up sequences automatically",
      "Request missing docs and track checklist status",
      "Update deal milestones and notify responsible parties",
      "Maintain a compliance-friendly communication trail",
    ],
    measuredResults: [
      "Lead response time",
      "Conversion rate",
      "Deal completion time",
      "Missing document count",
    ],
    syncTargets: ["CRM", "WhatsApp", "Email", "Drive storage"],
    workflowChain: ["Input", "Extract", "Decide", "Execute", "Track", "Sync"],
    fiveQuestions: {
      hateMost:
        "Slow lead response, missed follow-ups, document chasing, and unclear stage progression across the deal.",
      readsFrom: "Lead forms and CRM first, then WhatsApp and email threads.",
      automaticAction:
        "Taskara sends follow-up sequences, requests missing docs, tracks the next required action, updates milestones, and logs every communication.",
      measuredResult:
        "Taskara measures response time, conversion rate, deal completion time, and how many active deals are blocked on missing docs.",
      mustSync: "CRM, WhatsApp, email, and document storage.",
    },
    trustControls: [
      "Stop conditions when a lead replies or a deal advances",
      "Document checklist state with reminder cadence",
      "Approval mode for contracts and risky external actions",
      "Multi-party communication trail for compliance-sensitive work",
    ],
    metricsPreview: [
      { label: "Lead response time", value: "18m", note: "Median from inquiry to first touch" },
      { label: "Conversion rate", value: "26%", note: "Leads moving to under contract" },
      { label: "Missing docs", value: "11", note: "Open document requests" },
    ],
  },
};

export const AUDIENCE_LIST = Object.values(AUDIENCE_CONTENT);

export const CORE_ENGINE_STEPS = [
  {
    label: "Input",
    text: "Taskara listens to the operational source that matters first: inboxes, Slack, briefs, lead forms, and webhooks.",
  },
  {
    label: "Extract",
    text: "It preserves context, prevents duplicates, groups related actions, and creates structured execution items.",
  },
  {
    label: "Decide",
    text: "Routing is explainable, workload-aware, and overrideable. Risky actions stop for approval.",
  },
  {
    label: "Execute",
    text: "Emails send, Slack updates post, follow-ups schedule, and action logs are captured as work happens.",
  },
  {
    label: "Track",
    text: "Every item carries status history, audit logs, approval state, and source-to-outcome traceability.",
  },
  {
    label: "Sync",
    text: "Taskara syncs back to systems of record with mapping previews, protected writes, and rollback-friendly controls.",
  },
];

export const TRUST_PILLARS = [
  {
    title: "Approval Before Risk",
    body: "Candidate comms, client updates, and other risky external actions stop for review automatically.",
  },
  {
    title: "Explainable Assignment",
    body: "Every routed item shows why it landed with that owner and lets operators override instantly.",
  },
  {
    title: "Visible Audit Trail",
    body: "AI decisions, action logs, sync events, and stop conditions are visible in the product, not hidden in the backend.",
  },
  {
    title: "Safe Migration",
    body: "Mapping previews, compatibility checks, preserved history, and rollback hooks make migration feel controlled.",
  },
];
