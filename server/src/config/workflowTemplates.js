/**
 * Workflow template definitions for each audience.
 *
 * These are pure config objects — no DB needed.
 * The workflowEngine reads these to know how to run each audience's workflow.
 *
 * Core engine: INPUT → EXTRACT → DECIDE → EXECUTE → TRACK → SYNC
 */

const WORKFLOW_TEMPLATES = {

  /* ═══════════════════════════════════════════════════════════════════
     RECRUITERS
     Pain: Too much admin between candidate touchpoints.
     Chain: Email / ATS  →  Outreach sent  →  Interview booked  →  ATS updated
  ═══════════════════════════════════════════════════════════════════ */
  recruiters: {
    audienceType:  'recruiter',
    label:         'Recruiters',
    tagline:       'Too much admin between candidate touchpoints.',
    sourceTypes:   ['email', 'ats', 'sourcing_export', 'manual'],
    primarySource: 'email',

    stages: [
      { id: 'sourced',    label: 'Sourced',         color: '#94A3B8' },
      { id: 'contacted',  label: 'Contacted',        color: '#3B82F6' },
      { id: 'replied',    label: 'Replied',          color: '#8B5CF6' },
      { id: 'interview',  label: 'Interview',        color: '#F59E0B' },
      { id: 'offer',      label: 'Offer',            color: '#10B981' },
      { id: 'hired',      label: 'Hired',            color: '#059669' },
      { id: 'rejected',   label: 'Rejected',         color: '#EF4444' },
      { id: 'nurture',    label: 'Nurture Pool',     color: '#6B7280' },
    ],

    workflowChain: ['Email / ATS', 'Outreach sent', 'Interview booked', 'ATS updated'],

    automatedActions: [
      { id: 'send_outreach',       label: 'Send outreach email',             requiresApproval: false, channel: 'email' },
      { id: 'send_followup',       label: 'Send follow-up on no reply',      requiresApproval: false, channel: 'email' },
      { id: 'schedule_interview',  label: 'Coordinate interview slots',      requiresApproval: true,  channel: 'calendar' },
      { id: 'update_stage',        label: 'Update candidate stage in ATS',   requiresApproval: false, channel: 'ats' },
      { id: 'log_activity',        label: 'Log candidate activity',          requiresApproval: false, channel: 'internal' },
      { id: 'send_rejection',      label: 'Send rejection email',            requiresApproval: true,  channel: 'email' },
      { id: 'add_to_nurture',      label: 'Add to nurture sequence',         requiresApproval: false, channel: 'email' },
      { id: 'collect_feedback',    label: 'Request interviewer feedback',    requiresApproval: false, channel: 'email' },
    ],

    followUpCadence: [
      { delayDays: 2,  action: 'send_followup',  subjectTemplate: 'Following up on your application',  maxAttempts: 3 },
      { delayDays: 5,  action: 'send_followup',  subjectTemplate: 'Checking in — {{role}}',             maxAttempts: 2 },
      { delayDays: 10, action: 'add_to_nurture', subjectTemplate: 'Keeping you in mind',                maxAttempts: 1 },
    ],

    stopConditions: ['candidate_replied', 'stage_advanced', 'manually_stopped', 'max_attempts_reached'],

    escalationRules: [
      { triggerDays: 7,  escalateTo: 'hiring_manager', message: 'Candidate has not responded in 7 days' },
      { triggerDays: 14, escalateTo: 'recruiter',       message: 'Candidate pipeline stalled' },
    ],

    metrics: [
      { id: 'response_rate',       label: 'Response Rate',       unit: '%',    icon: '📬', description: 'Candidates who replied to outreach' },
      { id: 'time_to_first_reply', label: 'Time to First Reply', unit: 'hrs',  icon: '⚡', description: 'Hours from outreach to first candidate reply' },
      { id: 'time_to_hire',        label: 'Time to Hire',        unit: 'days', icon: '📅', description: 'Days from sourced to hired' },
      { id: 'stage_dropoff',       label: 'Stage Drop-off',      unit: '%',    icon: '📉', description: 'Candidates lost per pipeline stage' },
    ],

    syncTargets:  ['gmail', 'google_calendar', 'greenhouse', 'lever', 'ashby'],
    integrations: 'Gmail · Google Calendar · Greenhouse / Lever',
  },

  /* ═══════════════════════════════════════════════════════════════════
     STARTUPS
     Pain: Execution gets lost between Slack, docs, and context switches.
     Chain: Slack / Docs  →  Tasks extracted  →  Owner assigned  →  Status sent
  ═══════════════════════════════════════════════════════════════════ */
  startups: {
    audienceType:  'startup',
    label:         'Startups',
    tagline:       'Execution gets lost between Slack, docs, and context switches.',
    sourceTypes:   ['slack', 'notion', 'email', 'voice_memo', 'manual'],
    primarySource: 'slack',

    stages: [
      { id: 'captured',    label: 'Captured',     color: '#94A3B8' },
      { id: 'extracted',   label: 'Extracted',    color: '#3B82F6' },
      { id: 'assigned',    label: 'Assigned',     color: '#8B5CF6' },
      { id: 'in_progress', label: 'In Progress',  color: '#F59E0B' },
      { id: 'done',        label: 'Done',         color: '#059669' },
      { id: 'blocked',     label: 'Blocked',      color: '#EF4444' },
    ],

    workflowChain: ['Slack / Docs', 'Tasks extracted', 'Owner assigned', 'Status sent'],

    automatedActions: [
      { id: 'extract_tasks',      label: 'Extract tasks from thread',     requiresApproval: false, channel: 'internal' },
      { id: 'group_initiative',   label: 'Group under initiative',        requiresApproval: false, channel: 'internal' },
      { id: 'assign_owner',       label: 'Auto-assign owner',             requiresApproval: false, channel: 'internal' },
      { id: 'post_status_slack',  label: 'Post status update to Slack',   requiresApproval: false, channel: 'slack' },
      { id: 'create_github_issue',label: 'Create GitHub issue',           requiresApproval: true,  channel: 'github' },
      { id: 'sync_notion',        label: 'Sync tasks to Notion',          requiresApproval: false, channel: 'notion' },
      { id: 'escalate_unowned',   label: 'Escalate ownerless tasks',      requiresApproval: false, channel: 'slack' },
      { id: 'post_weekly_report', label: 'Post weekly execution report',  requiresApproval: false, channel: 'slack' },
    ],

    followUpCadence: [
      { delayDays: 1,  action: 'escalate_unowned',  subjectTemplate: 'Unowned task: {{title}}', maxAttempts: 2 },
      { delayDays: 3,  action: 'post_status_slack',  subjectTemplate: 'Status update: {{initiative}}', maxAttempts: 10 },
      { delayDays: 7,  action: 'post_weekly_report', subjectTemplate: 'Weekly execution summary', maxAttempts: null },
    ],

    stopConditions: ['owner_assigned', 'task_completed', 'manually_stopped'],

    escalationRules: [
      { triggerDays: 2,  escalateTo: 'team_lead',   message: 'Task has no owner after 2 days' },
      { triggerDays: 5,  escalateTo: 'founder',     message: 'Initiative stalled — no progress in 5 days' },
    ],

    metrics: [
      { id: 'completion_rate',   label: 'Completion Rate',   unit: '%',      icon: '✅', description: 'Tasks completed vs created this week' },
      { id: 'idea_to_execution', label: 'Idea → Execution',  unit: 'hrs',    icon: '🚀', description: 'Hours from discussion captured to task assigned' },
      { id: 'unowned_rate',      label: 'Unowned Task Rate', unit: '%',      icon: '⚠️', description: 'Percentage of tasks with no assigned owner' },
      { id: 'weekly_velocity',   label: 'Weekly Velocity',   unit: 'tasks',  icon: '📈', description: 'Tasks closed per week, 4-week rolling average' },
    ],

    syncTargets:  ['slack', 'github', 'notion', 'clickup', 'linear'],
    integrations: 'Slack · GitHub · Notion / ClickUp',
  },

  /* ═══════════════════════════════════════════════════════════════════
     AGENCIES
     Pain: Coordination overhead kills margins.
     Chain: Client brief  →  Tasks created  →  Client updated  →  Delay flagged
  ═══════════════════════════════════════════════════════════════════ */
  agencies: {
    audienceType:  'agency',
    label:         'Agencies',
    tagline:       'Coordination overhead kills your margins.',
    sourceTypes:   ['email', 'client_brief', 'slack', 'whatsapp', 'manual'],
    primarySource: 'email',

    stages: [
      { id: 'brief_received',   label: 'Brief Received',   color: '#94A3B8' },
      { id: 'scoped',           label: 'Scoped',           color: '#3B82F6' },
      { id: 'in_progress',      label: 'In Progress',      color: '#8B5CF6' },
      { id: 'pending_approval', label: 'Pending Approval', color: '#F59E0B' },
      { id: 'revision',         label: 'In Revision',      color: '#F97316' },
      { id: 'delivered',        label: 'Delivered',        color: '#059669' },
      { id: 'blocked',          label: 'Blocked',          color: '#EF4444' },
    ],

    workflowChain: ['Client brief', 'Tasks created', 'Client updated', 'Delay flagged'],

    automatedActions: [
      { id: 'break_brief',       label: 'Break brief into deliverables',   requiresApproval: false, channel: 'internal' },
      { id: 'assign_internal',   label: 'Assign internal owners',          requiresApproval: false, channel: 'internal' },
      { id: 'chase_approval',    label: 'Chase client for approval',       requiresApproval: false, channel: 'email' },
      { id: 'send_status',       label: 'Send client status update',       requiresApproval: true,  channel: 'email' },
      { id: 'flag_delay',        label: 'Flag delay to account manager',   requiresApproval: false, channel: 'slack' },
      { id: 'trigger_revision',  label: 'Open revision loop',              requiresApproval: false, channel: 'internal' },
      { id: 'collect_assets',    label: 'Request assets from client',      requiresApproval: false, channel: 'email' },
      { id: 'mark_delivered',    label: 'Mark deliverable as delivered',   requiresApproval: false, channel: 'internal' },
    ],

    followUpCadence: [
      { delayDays: 1,  action: 'chase_approval', subjectTemplate: 'Awaiting your approval — {{deliverable}}', maxAttempts: 4 },
      { delayDays: 2,  action: 'flag_delay',      subjectTemplate: 'Delay alert: {{project}}',                maxAttempts: 2 },
      { delayDays: 7,  action: 'send_status',     subjectTemplate: 'Weekly status: {{project}}',              maxAttempts: null },
    ],

    stopConditions: ['client_approved', 'deliverable_marked_done', 'manually_stopped', 'max_attempts_reached'],

    escalationRules: [
      { triggerDays: 3,  escalateTo: 'account_manager', message: 'Client has not approved after 3 days' },
      { triggerDays: 7,  escalateTo: 'director',         message: 'Project delayed over 7 days' },
    ],

    metrics: [
      { id: 'on_time_delivery',    label: 'On-time Delivery',    unit: '%',       icon: '📦', description: 'Deliverables completed on or before deadline' },
      { id: 'approval_turnaround', label: 'Approval Turnaround', unit: 'hrs',     icon: '✍️', description: 'Hours from submission to client approval' },
      { id: 'delay_count',         label: 'Active Delays',       unit: '',        icon: '🚨', description: 'Open items flagged as delayed right now' },
      { id: 'throughput',          label: 'Team Throughput',     unit: 'tasks/wk', icon: '⚙️', description: 'Deliverables closed per week' },
    ],

    syncTargets:  ['gmail', 'slack', 'whatsapp', 'clickup', 'notion'],
    integrations: 'Email · Slack / WhatsApp · ClickUp / Notion',
  },

  /* ═══════════════════════════════════════════════════════════════════
     REAL ESTATE
     Pain: Everything depends on follow-ups and documents.
     Chain: Lead / CRM  →  Follow-up sent  →  Docs requested  →  Stage updated
  ═══════════════════════════════════════════════════════════════════ */
  realestate: {
    audienceType:  'realestate',
    label:         'Real Estate',
    tagline:       'Everything depends on follow-ups and documents.',
    sourceTypes:   ['crm', 'whatsapp', 'email', 'lead_form', 'manual'],
    primarySource: 'crm',

    stages: [
      { id: 'new_lead',       label: 'New Lead',        color: '#94A3B8' },
      { id: 'contacted',      label: 'Contacted',       color: '#3B82F6' },
      { id: 'qualified',      label: 'Qualified',       color: '#8B5CF6' },
      { id: 'showing',        label: 'Showing',         color: '#F59E0B' },
      { id: 'offer',          label: 'Offer Stage',     color: '#F97316' },
      { id: 'under_contract', label: 'Under Contract',  color: '#10B981' },
      { id: 'closing',        label: 'Closing',         color: '#059669' },
      { id: 'closed',         label: 'Closed',          color: '#16A34A' },
      { id: 'lost',           label: 'Lost',            color: '#EF4444' },
    ],

    workflowChain: ['Lead / CRM', 'Follow-up sent', 'Docs requested', 'Stage updated'],

    automatedActions: [
      { id: 'send_initial_followup', label: 'Send initial lead follow-up',    requiresApproval: false, channel: 'email' },
      { id: 'send_sequence_followup',label: 'Send sequence follow-up',        requiresApproval: false, channel: 'email' },
      { id: 'request_docs',          label: 'Request missing documents',      requiresApproval: false, channel: 'email' },
      { id: 'update_stage',          label: 'Update deal stage in CRM',       requiresApproval: false, channel: 'crm' },
      { id: 'notify_parties',        label: 'Notify all relevant parties',    requiresApproval: false, channel: 'email' },
      { id: 'log_communication',     label: 'Log communication trail',        requiresApproval: false, channel: 'internal' },
      { id: 'schedule_showing',      label: 'Coordinate property showing',    requiresApproval: true,  channel: 'calendar' },
      { id: 'send_contract',         label: 'Send contract for e-signature',  requiresApproval: true,  channel: 'email' },
    ],

    followUpCadence: [
      { delayDays: 0.04, action: 'send_initial_followup',  subjectTemplate: 'Your inquiry about {{property}}',      maxAttempts: 1 },
      { delayDays: 1,    action: 'send_sequence_followup', subjectTemplate: 'Following up on {{property}}',         maxAttempts: 3 },
      { delayDays: 3,    action: 'request_docs',           subjectTemplate: 'Documents needed to move forward',     maxAttempts: 4 },
      { delayDays: 7,    action: 'send_sequence_followup', subjectTemplate: 'Still interested in {{property}}?',    maxAttempts: 2 },
    ],

    stopConditions: ['lead_replied', 'stage_advanced', 'deal_closed', 'lead_marked_lost', 'manually_stopped'],

    escalationRules: [
      { triggerDays: 1,  escalateTo: 'agent',      message: 'New lead has not been contacted within 1 hour' },
      { triggerDays: 7,  escalateTo: 'broker',     message: 'Deal stalled for 7 days — broker review needed' },
      { triggerDays: 14, escalateTo: 'team_lead',  message: 'Lead unresponsive after 14 days — consider archiving' },
    ],

    metrics: [
      { id: 'lead_response_time', label: 'Lead Response Time', unit: 'min',  icon: '⚡', description: 'Minutes from lead capture to first contact' },
      { id: 'conversion_rate',    label: 'Conversion Rate',    unit: '%',    icon: '🎯', description: 'Leads that reach under-contract stage' },
      { id: 'deal_completion',    label: 'Deal Completion',    unit: 'days', icon: '📋', description: 'Average days from new lead to closed deal' },
      { id: 'missing_docs',       label: 'Missing Docs',       unit: '',     icon: '📄', description: 'Active deals with outstanding document requests' },
    ],

    syncTargets:  ['gmail', 'whatsapp', 'hubspot', 'google_drive', 'google_calendar'],
    integrations: 'WhatsApp · Gmail · HubSpot / CRM · Google Drive',
  },
};

/**
 * Get a template by audienceType key.
 * @param {string} key - one of: recruiters | startups | agencies | realestate
 */
const getTemplate = (key) => WORKFLOW_TEMPLATES[key] || null;

/**
 * All audience keys.
 */
const AUDIENCE_KEYS = Object.keys(WORKFLOW_TEMPLATES);

module.exports = { WORKFLOW_TEMPLATES, getTemplate, AUDIENCE_KEYS };
