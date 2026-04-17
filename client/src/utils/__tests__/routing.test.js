import { getDefaultAuthenticatedPath } from '../routing';

test('operator workspaces default to dashboard', () => {
  expect(
    getDefaultAuthenticatedPath({
      workspaceContext: {
        surfaceMode: 'operator',
      },
    }),
  ).toBe('/dashboard');
});

test('student workspaces default to today', () => {
  expect(
    getDefaultAuthenticatedPath({
      workspaceContext: {
        surfaceMode: 'student',
      },
    }),
  ).toBe('/today');
});

test('missing workspace context falls back to dashboard', () => {
  expect(getDefaultAuthenticatedPath(null)).toBe('/dashboard');
});
