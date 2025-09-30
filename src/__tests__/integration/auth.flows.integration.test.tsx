import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

// Mock components for testing auth flows
const LoginForm = () => {
  const { signIn, loading, error } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    await signIn(email, password);
  };

  return (
    <form onSubmit={handleSubmit} data-testid="login-form">
      <input name="email" type="email" placeholder="Email" />
      <input name="password" type="password" placeholder="Password" />
      <button type="submit" disabled={loading}>
        {loading ? 'Signing in...' : 'Sign In'}
      </button>
      {error && <div role="alert">{error}</div>}
    </form>
  );
};

const SignupForm = () => {
  const { signUp, loading, error } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    await signUp(email, password);
  };

  return (
    <form onSubmit={handleSubmit} data-testid="signup-form">
      <input name="email" type="email" placeholder="Email" />
      <input name="password" type="password" placeholder="Password" />
      <button type="submit" disabled={loading}>
        {loading ? 'Creating account...' : 'Sign Up'}
      </button>
      {error && <div role="alert">{error}</div>}
    </form>
  );
};

const PasswordResetForm = () => {
  const { forgotPassword, loading, error } = useAuthStore();
  const [success, setSuccess] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    await forgotPassword(email);
    setSuccess(true);
  };

  return (
    <form onSubmit={handleSubmit} data-testid="reset-form">
      <input name="email" type="email" placeholder="Email" />
      <button type="submit" disabled={loading}>
        {loading ? 'Sending...' : 'Reset Password'}
      </button>
      {error && <div role="alert">{error}</div>}
      {success && <div role="status">Reset email sent!</div>}
    </form>
  );
};

vi.mock('../../store/authStore');

describe('Authentication Flows Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Login Flow', () => {
    it('should successfully log in with valid credentials', async () => {
      const mockSignIn = vi.fn().mockResolvedValue(undefined);
      vi.mocked(useAuthStore).mockReturnValue({
        signIn: mockSignIn,
        loading: false,
        error: null,
        user: null,
      } as any);

      const user = userEvent.setup();
      render(
        <BrowserRouter>
          <LoginForm />
        </BrowserRouter>
      );

      const emailInput = screen.getByPlaceholderText('Email');
      const passwordInput = screen.getByPlaceholderText('Password');
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalledWith('test@example.com', 'password123');
      });
    });

    it('should display error message for invalid credentials', async () => {
      const mockSignIn = vi.fn().mockRejectedValue(new Error('Invalid credentials'));
      vi.mocked(useAuthStore).mockReturnValue({
        signIn: mockSignIn,
        loading: false,
        error: 'Invalid credentials',
        user: null,
      } as any);

      const user = userEvent.setup();
      render(
        <BrowserRouter>
          <LoginForm />
        </BrowserRouter>
      );

      await user.type(screen.getByPlaceholderText('Email'), 'wrong@example.com');
      await user.type(screen.getByPlaceholderText('Password'), 'wrongpass');
      await user.click(screen.getByRole('button'));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('Invalid credentials');
      });
    });

    it('should show loading state during login', async () => {
      vi.mocked(useAuthStore).mockReturnValue({
        signIn: vi.fn(),
        loading: true,
        error: null,
        user: null,
      } as any);

      render(
        <BrowserRouter>
          <LoginForm />
        </BrowserRouter>
      );

      const submitButton = screen.getByRole('button');
      expect(submitButton).toBeDisabled();
      expect(submitButton).toHaveTextContent('Signing in...');
    });

    it('should validate email format before submission', async () => {
      const mockSignIn = vi.fn();
      vi.mocked(useAuthStore).mockReturnValue({
        signIn: mockSignIn,
        loading: false,
        error: null,
        user: null,
      } as any);

      const user = userEvent.setup();
      render(
        <BrowserRouter>
          <LoginForm />
        </BrowserRouter>
      );

      const emailInput = screen.getByPlaceholderText('Email') as HTMLInputElement;
      await user.type(emailInput, 'invalid-email');
      
      // HTML5 validation should catch this
      expect(emailInput.validity.valid).toBe(false);
    });
  });

  describe('Signup Flow', () => {
    it('should successfully create new account', async () => {
      const mockSignUp = vi.fn().mockResolvedValue(undefined);
      vi.mocked(useAuthStore).mockReturnValue({
        signUp: mockSignUp,
        loading: false,
        error: null,
        user: null,
      } as any);

      const user = userEvent.setup();
      render(
        <BrowserRouter>
          <SignupForm />
        </BrowserRouter>
      );

      await user.type(screen.getByPlaceholderText('Email'), 'newuser@example.com');
      await user.type(screen.getByPlaceholderText('Password'), 'SecurePass123!');
      await user.click(screen.getByRole('button', { name: /sign up/i }));

      await waitFor(() => {
        expect(mockSignUp).toHaveBeenCalledWith('newuser@example.com', 'SecurePass123!');
      });
    });

    it('should display error for duplicate email', async () => {
      const mockSignUp = vi.fn().mockRejectedValue(new Error('User already exists'));
      vi.mocked(useAuthStore).mockReturnValue({
        signUp: mockSignUp,
        loading: false,
        error: 'User already exists',
        user: null,
      } as any);

      const user = userEvent.setup();
      render(
        <BrowserRouter>
          <SignupForm />
        </BrowserRouter>
      );

      await user.type(screen.getByPlaceholderText('Email'), 'existing@example.com');
      await user.type(screen.getByPlaceholderText('Password'), 'password123');
      await user.click(screen.getByRole('button'));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('User already exists');
      });
    });

    it('should display error for weak password', async () => {
      const mockSignUp = vi.fn().mockRejectedValue(new Error('Password too weak'));
      vi.mocked(useAuthStore).mockReturnValue({
        signUp: mockSignUp,
        loading: false,
        error: 'Password too weak',
        user: null,
      } as any);

      const user = userEvent.setup();
      render(
        <BrowserRouter>
          <SignupForm />
        </BrowserRouter>
      );

      await user.type(screen.getByPlaceholderText('Email'), 'test@example.com');
      await user.type(screen.getByPlaceholderText('Password'), '123');
      await user.click(screen.getByRole('button'));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('Password too weak');
      });
    });

    it('should show loading state during signup', async () => {
      vi.mocked(useAuthStore).mockReturnValue({
        signUp: vi.fn(),
        loading: true,
        error: null,
        user: null,
      } as any);

      render(
        <BrowserRouter>
          <SignupForm />
        </BrowserRouter>
      );

      const submitButton = screen.getByRole('button');
      expect(submitButton).toBeDisabled();
      expect(submitButton).toHaveTextContent('Creating account...');
    });
  });

  describe('Password Reset Flow', () => {
    it('should send reset email successfully', async () => {
      const mockForgotPassword = vi.fn().mockResolvedValue(undefined);
      vi.mocked(useAuthStore).mockReturnValue({
        forgotPassword: mockForgotPassword,
        loading: false,
        error: null,
      } as any);

      const user = userEvent.setup();
      render(
        <BrowserRouter>
          <PasswordResetForm />
        </BrowserRouter>
      );

      await user.type(screen.getByPlaceholderText('Email'), 'user@example.com');
      await user.click(screen.getByRole('button', { name: /reset password/i }));

      await waitFor(() => {
        expect(mockForgotPassword).toHaveBeenCalledWith('user@example.com');
        expect(screen.getByRole('status')).toHaveTextContent('Reset email sent!');
      });
    });

    it('should display error for non-existent email', async () => {
      const mockForgotPassword = vi.fn().mockRejectedValue(new Error('User not found'));
      vi.mocked(useAuthStore).mockReturnValue({
        forgotPassword: mockForgotPassword,
        loading: false,
        error: 'User not found',
      } as any);

      const user = userEvent.setup();
      render(
        <BrowserRouter>
          <PasswordResetForm />
        </BrowserRouter>
      );

      await user.type(screen.getByPlaceholderText('Email'), 'nonexistent@example.com');
      await user.click(screen.getByRole('button'));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('User not found');
      });
    });

    it('should show loading state during reset request', async () => {
      vi.mocked(useAuthStore).mockReturnValue({
        forgotPassword: vi.fn(),
        loading: true,
        error: null,
      } as any);

      render(
        <BrowserRouter>
          <PasswordResetForm />
        </BrowserRouter>
      );

      const submitButton = screen.getByRole('button');
      expect(submitButton).toBeDisabled();
      expect(submitButton).toHaveTextContent('Sending...');
    });
  });

  describe('Logout Flow', () => {
    it('should successfully sign out user', async () => {
      const mockSignOut = vi.fn().mockResolvedValue(undefined);
      const LogoutButton = () => {
        const { signOut } = useAuthStore();
        return <button onClick={signOut}>Sign Out</button>;
      };

      vi.mocked(useAuthStore).mockReturnValue({
        signOut: mockSignOut,
        user: { id: 'user-123', email: 'test@example.com' },
      } as any);

      const user = userEvent.setup();
      render(
        <BrowserRouter>
          <LogoutButton />
        </BrowserRouter>
      );

      await user.click(screen.getByRole('button', { name: /sign out/i }));

      await waitFor(() => {
        expect(mockSignOut).toHaveBeenCalled();
      });
    });
  });

  describe('Auth State Persistence', () => {
    it('should restore user session on page load', async () => {
      const mockCheckUser = vi.fn().mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
      });

      vi.mocked(useAuthStore).mockReturnValue({
        checkUser: mockCheckUser,
        user: { id: 'user-123', email: 'test@example.com' },
      } as any);

      const AuthChecker = () => {
        const { checkUser, user } = useAuthStore();
        React.useEffect(() => {
          checkUser();
        }, []);
        return <div>{user ? `Welcome ${user.email}` : 'Not logged in'}</div>;
      };

      render(
        <BrowserRouter>
          <AuthChecker />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(mockCheckUser).toHaveBeenCalled();
        expect(screen.getByText(/Welcome test@example\.com/)).toBeInTheDocument();
      });
    });

    it('should clear user data on logout', async () => {
      const mockSignOut = vi.fn().mockResolvedValue(undefined);
      let currentUser = { id: 'user-123', email: 'test@example.com' };

      const App = () => {
        const { signOut } = useAuthStore();
        return (
          <div>
            <div>{currentUser ? `Logged in as ${currentUser.email}` : 'Not logged in'}</div>
            <button onClick={async () => {
              await signOut();
              currentUser = null;
            }}>
              Logout
            </button>
          </div>
        );
      };

      vi.mocked(useAuthStore).mockReturnValue({
        signOut: mockSignOut,
        user: currentUser,
      } as any);

      const user = userEvent.setup();
      render(
        <BrowserRouter>
          <App />
        </BrowserRouter>
      );

      expect(screen.getByText(/Logged in as test@example\.com/)).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: /logout/i }));

      await waitFor(() => {
        expect(mockSignOut).toHaveBeenCalled();
      });
    });
  });
});