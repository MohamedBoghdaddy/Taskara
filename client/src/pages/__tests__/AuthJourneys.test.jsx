import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginPage from '../LoginPage';
import RegisterPage from '../RegisterPage';
import { login, register } from '../../api/auth';
import { useAuthStore } from '../../store/authStore';

const mockNavigate = jest.fn();
const mockToastError = jest.fn();

jest.mock('../../api/auth', () => ({
  login: jest.fn(),
  register: jest.fn(),
}));

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: {
    error: (...args) => mockToastError(...args),
  },
}));

jest.mock(
  'react-router-dom',
  () => ({
    __esModule: true,
    Link: ({ to, children, ...props }) => (
      <a href={to} {...props}>
        {children}
      </a>
    ),
    MemoryRouter: ({ children }) => <>{children}</>,
    useNavigate: () => mockNavigate,
  }),
  { virtual: true },
);

const renderWithRouter = (ui) => render(<MemoryRouter>{ui}</MemoryRouter>);

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  useAuthStore.setState({
    user: null,
    token: null,
    refreshToken: null,
    preferences: { theme: 'system' },
  });
});

test('login redirects agency workspaces to the agency dashboard and stores auth state', async () => {
  login.mockResolvedValue({
    user: {
      _id: 'user-1',
      email: 'operator@test.local',
      workspaceContext: { surfaceMode: 'operator', vertical: 'agencies' },
      preferences: { theme: 'dark' },
    },
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
  });

  const { container } = renderWithRouter(<LoginPage />);

  await userEvent.type(screen.getByPlaceholderText('you@example.com'), 'operator@test.local');
  await userEvent.type(container.querySelector('input[type="password"]'), 'password123');
  await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

  await waitFor(() => expect(login).toHaveBeenCalledWith({
    email: 'operator@test.local',
    password: 'password123',
  }));
  expect(mockNavigate).toHaveBeenCalledWith('/agency/dashboard');
  expect(useAuthStore.getState().user.email).toBe('operator@test.local');
});

test('register redirects student workspaces to today and stores auth state', async () => {
  register.mockResolvedValue({
    user: {
      _id: 'user-2',
      email: 'student@test.local',
      workspaceContext: { surfaceMode: 'student' },
      preferences: { theme: 'system' },
    },
    accessToken: 'student-access',
    refreshToken: 'student-refresh',
  });

  const { container } = renderWithRouter(<RegisterPage />);

  await userEvent.type(screen.getByPlaceholderText('Your name'), 'Student User');
  await userEvent.type(screen.getByPlaceholderText('you@example.com'), 'student@test.local');
  await userEvent.type(container.querySelector('input[type="password"]'), 'password123');
  await userEvent.click(screen.getByRole('button', { name: /create account/i }));

  await waitFor(() => expect(register).toHaveBeenCalledWith({
    name: 'Student User',
    email: 'student@test.local',
    password: 'password123',
  }));
  expect(mockNavigate).toHaveBeenCalledWith('/today');
  expect(useAuthStore.getState().user.email).toBe('student@test.local');
});

test('login surfaces API failures without navigating', async () => {
  login.mockRejectedValue({
    response: {
      data: {
        error: 'Invalid credentials',
      },
    },
  });

  const { container } = renderWithRouter(<LoginPage />);

  await userEvent.type(screen.getByPlaceholderText('you@example.com'), 'operator@test.local');
  await userEvent.type(container.querySelector('input[type="password"]'), 'wrongpass');
  await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

  await waitFor(() => expect(mockToastError).toHaveBeenCalledWith('Invalid credentials'));
  expect(mockNavigate).not.toHaveBeenCalled();
});
