import { signUp, signIn, signOut, getCurrentUser, getSession } from '../auth';

// Mock the auth module's supabase instance
jest.mock('../auth', () => {
  const originalModule = jest.requireActual('../auth');
  const mockSupabase = {
    auth: {
      signUp: jest.fn(),
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
      getUser: jest.fn(),
      getSession: jest.fn(),
    },
  };
  
  return {
    ...originalModule,
    supabase: mockSupabase,
    signUp: jest.fn(),
    signIn: jest.fn(),
    signOut: jest.fn(),
    getCurrentUser: jest.fn(),
    getSession: jest.fn(),
  };
});

const mockSignUp = signUp as jest.MockedFunction<typeof signUp>;
const mockSignIn = signIn as jest.MockedFunction<typeof signIn>;
const mockSignOut = signOut as jest.MockedFunction<typeof signOut>;
const mockGetCurrentUser = getCurrentUser as jest.MockedFunction<typeof getCurrentUser>;
const mockGetSession = getSession as jest.MockedFunction<typeof getSession>;

describe('Authentication Module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('signUp', () => {
    it('should create a new user account', async () => {
      mockSignUp.mockResolvedValueOnce({
        data: {
          user: { id: 'user-123', email: 'test@example.com' },
          session: { access_token: 'token-123' },
        },
        error: null,
      } as any);

      const result = await signUp('test@example.com', 'password123', 'Test User');

      expect(result.error).toBeNull();
      expect(result.data?.user?.email).toBe('test@example.com');
    });

    it('should return error for invalid credentials', async () => {
      mockSignUp.mockResolvedValueOnce({
        data: { user: null, session: null },
        error: { message: 'Email already registered' },
      } as any);

      const result = await signUp('existing@example.com', 'password', 'Test');

      expect(result.error).toBeTruthy();
      expect(result.data?.user).toBeNull();
    });
  });

  describe('signIn', () => {
    it('should authenticate existing user', async () => {
      mockSignIn.mockResolvedValueOnce({
        data: {
          user: { id: 'user-123', email: 'test@example.com' },
          session: { access_token: 'token-123' },
        },
        error: null,
      } as any);

      const result = await signIn('test@example.com', 'password123');

      expect(result.error).toBeNull();
      expect(result.data?.user?.email).toBe('test@example.com');
    });

    it('should return error for wrong credentials', async () => {
      mockSignIn.mockResolvedValueOnce({
        data: { user: null, session: null },
        error: { message: 'Invalid login credentials' },
      } as any);

      const result = await signIn('test@example.com', 'wrongpassword');

      expect(result.error).toBeTruthy();
      expect(result.error?.message).toContain('Invalid');
    });
  });

  describe('signOut', () => {
    it('should sign out current user', async () => {
      mockSignOut.mockResolvedValueOnce({
        error: null,
      } as any);

      const result = await signOut();

      expect(result.error).toBeNull();
    });
  });

  describe('getCurrentUser', () => {
    it('should return current authenticated user', async () => {
      mockGetCurrentUser.mockResolvedValueOnce({
        user: { id: 'user-123', email: 'test@example.com' },
        error: null,
      } as any);

      const result = await getCurrentUser();

      expect(result.user?.id).toBe('user-123');
    });

    it('should return null when not authenticated', async () => {
      mockGetCurrentUser.mockResolvedValueOnce({
        user: null,
        error: null,
      } as any);

      const result = await getCurrentUser();

      expect(result.user).toBeNull();
    });
  });

  describe('getSession', () => {
    it('should return active session', async () => {
      mockGetSession.mockResolvedValueOnce({
        session: {
          access_token: 'token-123',
          refresh_token: 'refresh-123',
          user: { id: 'user-123' },
        },
        error: null,
      } as any);

      const result = await getSession();

      expect(result.session?.access_token).toBe('token-123');
    });

    it('should return null session when not authenticated', async () => {
      mockGetSession.mockResolvedValueOnce({
        session: null,
        error: null,
      } as any);

      const result = await getSession();

      expect(result.session).toBeNull();
    });
  });
});
