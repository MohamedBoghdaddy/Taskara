export const getDefaultAuthenticatedPath = (user) =>
  user?.workspaceContext?.surfaceMode === 'student' ? '/today' : '/dashboard';
