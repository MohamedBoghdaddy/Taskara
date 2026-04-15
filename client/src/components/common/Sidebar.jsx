import React, { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { getUnreadCount } from '../../api/inbox';
import Tooltip from './Tooltip';
import {
  TodayIcon, InboxIcon, NoteIcon, TaskIcon, ProjectIcon, KanbanIcon,
  CalendarIcon, TimerIcon, GraphIcon, AIIcon, SearchIcon, TemplateIcon,
  DatabaseIcon, AnalyticsIcon, SettingsIcon, UsersIcon, BacklogIcon,
  SprintIcon, CollapseIcon, ExpandSideIcon, LogoutIcon, UserIcon,
  LogoIcon, ChevronDown, ChevronUp, BoardIcon, AddIcon,
  NoteFilledIcon, BreakIcon, ProjectFilledIcon, FocusIcon,
  BrainIcon, FlashIcon, TrophyIcon, PlugIcon,
  TimelineIcon, CalendarCheckIcon, BroadcastIcon, PaletteIcon, WorkflowIcon,
} from './Icons';

const NAV_GROUPS = [
  {
    label: 'Main',
    items: [
      { to: '/dashboard',    Icon: WorkflowIcon,      label: 'Execution Hub', tip: 'Audience workflows, approvals, and sync' },
      { to: '/today',        Icon: TodayIcon,         label: 'Today',        tip: 'Daily note + tasks due today' },
      { to: '/inbox',        Icon: InboxIcon,         label: 'Inbox',        tip: 'Notifications & mentions', badge: true },
      { to: '/search',       Icon: SearchIcon,        label: 'Search',       tip: 'Full-text search  (Ctrl+K)' },
    ],
  },
  {
    label: 'Work',
    items: [
      { to: '/tasks',        Icon: TaskIcon,          label: 'Tasks',        tip: 'Kanban board + task list' },
      { to: '/boards',       Icon: KanbanIcon,        label: 'Boards',       tip: 'Trello-style project boards' },
      { to: '/sprints',      Icon: SprintIcon,        label: 'Sprints',      tip: 'Scrum sprints + burndown' },
      { to: '/backlog',      Icon: BacklogIcon,       label: 'Backlog',      tip: 'Sprint backlog & planning' },
      { to: '/timeline',     Icon: TimelineIcon,      label: 'Timeline',     tip: 'Gantt / roadmap view' },
      { to: '/projects',     Icon: ProjectFilledIcon, label: 'Projects',     tip: 'Project workspaces' },
      { to: '/calendar',     Icon: CalendarIcon,      label: 'Calendar',     tip: 'Due dates & reminders' },
    ],
  },
  {
    label: 'Knowledge',
    items: [
      { to: '/notes',        Icon: NoteFilledIcon,    label: 'Notes',        tip: 'Notes with auto-backlinks' },
      { to: '/daily/today',  Icon: CalendarCheckIcon, label: 'Daily Notes',  tip: 'Journal by date' },
      { to: '/graph',        Icon: GraphIcon,         label: 'Graph',        tip: 'Knowledge graph view' },
      { to: '/databases',    Icon: DatabaseIcon,      label: 'Databases',    tip: 'Custom structured tables' },
      { to: '/templates',    Icon: TemplateIcon,      label: 'Templates',    tip: 'Note & task templates' },
    ],
  },
  {
    label: 'Insights',
    items: [
      { to: '/pomodoro',     Icon: FocusIcon,         label: 'Focus Timer',  tip: 'Pomodoro + ambient sounds' },
      { to: '/analytics',    Icon: AnalyticsIcon,     label: 'Analytics',    tip: 'Focus, task & note stats' },
      { to: '/ai',           Icon: BrainIcon,         label: 'AI Assistant', tip: 'Gemini-powered workspace AI' },
    ],
  },
  {
    label: 'Create',
    items: [
      { to: '/canvas',       Icon: PaletteIcon,       label: 'Canvas',       tip: 'Freeform whiteboard & mindmap' },
    ],
  },
  {
    label: 'Team',
    items: [
      { to: '/collaboration', Icon: UsersIcon,        label: 'Team',         tip: 'Members, roles & invites' },
      { to: '/automations',   Icon: FlashIcon,        label: 'Automations',  tip: 'Trigger → action rules' },
      { to: '/webhooks',      Icon: BroadcastIcon,    label: 'Webhooks',     tip: 'Outbound event delivery' },
      { to: '/integrations',  Icon: PlugIcon,         label: 'Integrations', tip: 'Todoist, Slack & more' },
    ],
  },
  {
    label: 'Account',
    items: [
      { to: '/pricing',      Icon: TrophyIcon,        label: 'Upgrade Plan', tip: 'View plans & pricing' },
    ],
  },
];

const COLLAPSED_WIDTH  = 58;
const EXPANDED_WIDTH   = 240;

export default function Sidebar() {
  const navigate = useNavigate();
  const { user, clearAuth } = useAuthStore();
  const { sidebarOpen, toggleSidebar, openCommand } = useUIStore();
  const [unread, setUnread] = useState(0);
  const [collapsedGroups, setCollapsedGroups] = useState({});
  const collapsed = !sidebarOpen;

  useEffect(() => {
    const load = () => getUnreadCount().then(d => setUnread(d?.count || 0)).catch(() => {});
    load();
    const iv = setInterval(load, 30000);
    return () => clearInterval(iv);
  }, []);

  const handleLogout = () => {
    clearAuth();
    navigate('/login');
  };

  const toggleGroup = (label) =>
    setCollapsedGroups(p => ({ ...p, [label]: !p[label] }));

  const w = collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH;

  return (
    <aside style={{
      width: w, minWidth: w, maxWidth: w,
      height: '100vh',
      background: 'var(--surface)',
      borderRight: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column',
      transition: 'width 200ms ease, min-width 200ms ease, max-width 200ms ease',
      overflow: 'hidden',
      zIndex: 100,
      flexShrink: 0,
    }}>

      {/* ── Logo ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        padding: collapsed ? '14px 0' : '14px 12px',
        justifyContent: collapsed ? 'center' : 'flex-start',
        borderBottom: '1px solid var(--border)', flexShrink: 0,
        minHeight: 53,
      }}>
        <LogoIcon size={24} color="var(--primary)" style={{ flexShrink: 0 }} />
        {!collapsed && (
          <span style={{ fontWeight: '700', fontSize: '15px', color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>
            Taskara
          </span>
        )}
      </div>

      {/* ── Search button ── */}
      {!collapsed && (
        <div style={{ padding: '8px 8px 4px' }}>
          <button
            onClick={openCommand}
            style={{
              width: '100%', padding: '7px 10px',
              background: 'var(--surface-alt)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius)', color: 'var(--text-muted)',
              textAlign: 'left', fontSize: '12px',
              display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer',
            }}
          >
            <SearchIcon size="xs" />
            <span style={{ flex: 1 }}>Search…</span>
            <span style={{ fontSize: '10px', background: 'var(--border)', padding: '1px 5px', borderRadius: '3px', fontFamily: 'monospace' }}>Ctrl+K</span>
          </button>
        </div>
      )}

      {/* ── Quick actions ── */}
      {!collapsed && (
        <div style={{ padding: '4px 8px 2px', display: 'flex', gap: '4px' }}>
          <Tooltip content="New item (Ctrl+K)" placement="bottom">
            <button
              onClick={openCommand}
              style={{ flex: 1, padding: '5px 0', background: 'var(--primary)12', border: '1px solid var(--primary)30', borderRadius: 'var(--radius)', cursor: 'pointer', color: 'var(--primary)', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', fontWeight: '600' }}
            >
              <AddIcon size="xs" /> New
            </button>
          </Tooltip>
          <Tooltip content="Take a focus break" placement="bottom">
            <button
              onClick={() => navigate('/pomodoro')}
              style={{ flex: 1, padding: '5px 0', background: 'var(--surface-alt)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
            >
              <BreakIcon size="xs" /> Break
            </button>
          </Tooltip>
        </div>
      )}

      {/* ── Nav ── */}
      <nav style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '4px 4px' }}>
        {NAV_GROUPS.map(group => (
          <div key={group.label} style={{ marginBottom: collapsed ? 0 : '4px' }}>
            {/* Group label */}
            {!collapsed && (
              <button
                onClick={() => toggleGroup(group.label)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  width: '100%', padding: '6px 8px 3px',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--text-muted)', fontSize: '10px', fontWeight: '700',
                  letterSpacing: '0.07em', textTransform: 'uppercase',
                }}
              >
                {group.label}
                {collapsedGroups[group.label] ? <ChevronDown size="xs" /> : <ChevronUp size="xs" />}
              </button>
            )}

            {/* Nav items */}
            {!collapsedGroups[group.label] && group.items.map(({ to, Icon, label, tip, badge }) => (
              <Tooltip key={to} content={collapsed ? `${label}: ${tip}` : tip} placement="right">
                <NavLink
                  to={to}
                  style={({ isActive }) => ({
                    display: 'flex', alignItems: 'center',
                    gap: collapsed ? 0 : '9px',
                    padding: collapsed ? '9px 0' : '6px 8px',
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    borderRadius: 'var(--radius)',
                    margin: '1px 0',
                    textDecoration: 'none',
                    fontSize: '13px',
                    fontWeight: isActive ? '600' : '400',
                    background: isActive ? 'var(--primary)18' : 'transparent',
                    color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
                  })}
                >
                  {({ isActive }) => (
                    <>
                      <span style={{ position: 'relative', flexShrink: 0, color: isActive ? 'var(--primary)' : 'var(--text-muted)', fontSize: '13px', lineHeight: 1 }}>
                        <Icon />
                        {badge && unread > 0 && (
                          <span style={{
                            position: 'absolute', top: '-5px', right: '-7px',
                            background: 'var(--error)', color: '#fff', borderRadius: '50%',
                            width: '14px', height: '14px', fontSize: '9px', fontWeight: '700',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            {unread > 9 ? '9+' : unread}
                          </span>
                        )}
                      </span>
                      {!collapsed && (
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                          {label}
                        </span>
                      )}
                    </>
                  )}
                </NavLink>
              </Tooltip>
            ))}

            {collapsed && <div style={{ height: '2px' }} />}
          </div>
        ))}
      </nav>

      {/* ── Settings ── */}
      <div style={{ padding: '4px 4px 0', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
        <Tooltip content="Settings" placement="right">
          <NavLink
            to="/settings"
            style={({ isActive }) => ({
              display: 'flex', alignItems: 'center',
              gap: collapsed ? 0 : '9px',
              padding: collapsed ? '9px 0' : '6px 8px',
              justifyContent: collapsed ? 'center' : 'flex-start',
              borderRadius: 'var(--radius)', textDecoration: 'none', fontSize: '13px',
              color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
              background: isActive ? 'var(--primary)18' : 'transparent',
            })}
          >
            <SettingsIcon style={{ fontSize: '13px', color: 'var(--text-muted)', flexShrink: 0 }} />
            {!collapsed && <span>Settings</span>}
          </NavLink>
        </Tooltip>
      </div>

      {/* ── User row ── */}
      <div style={{
        padding: '8px 6px',
        borderTop: '1px solid var(--border)',
        display: 'flex', alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'space-between',
        gap: '6px', flexShrink: 0,
      }}>
        {!collapsed && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', flex: 1 }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              background: 'var(--primary)', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '12px', fontWeight: '700', flexShrink: 0,
            }}>
              {user?.firstName?.[0]?.toUpperCase() || user?.name?.[0]?.toUpperCase() || <UserIcon size="xs" />}
            </div>
            <div style={{ overflow: 'hidden', minWidth: 0 }}>
              <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user?.name || user?.email}
              </div>
              {user?.email && (
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user.email}
                </div>
              )}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: '2px', flexShrink: 0 }}>
          <Tooltip content="Sign out" placement="right">
            <button
              onClick={handleLogout}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '5px 6px', borderRadius: 'var(--radius)' }}
            >
              <LogoutIcon style={{ fontSize: '13px' }} />
            </button>
          </Tooltip>
          <Tooltip content={collapsed ? 'Expand sidebar (Ctrl+B)' : 'Collapse sidebar (Ctrl+B)'} placement="right">
            <button
              onClick={toggleSidebar}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '5px 6px', borderRadius: 'var(--radius)' }}
            >
              {collapsed ? <ExpandSideIcon style={{ fontSize: '13px' }} /> : <CollapseIcon style={{ fontSize: '13px' }} />}
            </button>
          </Tooltip>
        </div>
      </div>
    </aside>
  );
}
