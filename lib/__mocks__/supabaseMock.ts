/**
 * Comprehensive Supabase Mock for Unit Testing
 * This provides a fully mocked Supabase client that can be configured per test
 */

export interface MockQueryBuilder {
  select: jest.Mock;
  insert: jest.Mock;
  update: jest.Mock;
  delete: jest.Mock;
  upsert: jest.Mock;
  eq: jest.Mock;
  neq: jest.Mock;
  gt: jest.Mock;
  lt: jest.Mock;
  gte: jest.Mock;
  lte: jest.Mock;
  contains: jest.Mock;
  order: jest.Mock;
  limit: jest.Mock;
  range: jest.Mock;
  single: jest.Mock;
  maybeSingle: jest.Mock;
  rpc: jest.Mock;
}

export interface MockSupabaseResponse<T = any> {
  data: T | null;
  error: { message: string; code: string } | null;
}

// Store for mock data - can be configured per test
export const mockStore = {
  niches: [] as any[],
  accounts: [] as any[],
  posts: [] as any[],
  viral_definitions: [] as any[],
  viral_patterns: [] as any[],
  post_engagements: [] as any[],
  trending_topics: [] as any[],
  app_settings: [] as any[],
  automation_profiles: [] as any[],
};

// Error simulation config
export const mockConfig = {
  shouldError: false,
  errorCode: 'UNKNOWN_ERROR',
  errorMessage: 'Mock error',
};

// Helper to reset mock store
export function resetMockStore() {
  Object.keys(mockStore).forEach(key => {
    (mockStore as any)[key] = [];
  });
  mockConfig.shouldError = false;
  mockConfig.errorCode = 'UNKNOWN_ERROR';
  mockConfig.errorMessage = 'Mock error';
}

// Helper to set mock error
export function setMockError(shouldError: boolean, code = 'UNKNOWN_ERROR', message = 'Mock error') {
  mockConfig.shouldError = shouldError;
  mockConfig.errorCode = code;
  mockConfig.errorMessage = message;
}

// Create chainable query builder mock
function createQueryBuilder(tableName: string): MockQueryBuilder {
  let filters: Record<string, any> = {};
  let orderBy: { column: string; ascending: boolean } | null = null;
  let limitCount: number | null = null;
  let rangeStart: number | null = null;
  let rangeEnd: number | null = null;
  let isSingle = false;
  let pendingData: any = null;

  const getFilteredData = () => {
    let data = [...(mockStore as any)[tableName] || []];
    
    // Apply filters
    Object.entries(filters).forEach(([key, value]) => {
      if (typeof value === 'object' && value !== null) {
        if (value.op === 'eq') data = data.filter(item => item[key] === value.value);
        if (value.op === 'neq') data = data.filter(item => item[key] !== value.value);
        if (value.op === 'gt') data = data.filter(item => item[key] > value.value);
        if (value.op === 'lt') data = data.filter(item => item[key] < value.value);
        if (value.op === 'contains') data = data.filter(item => Array.isArray(item[key]) && item[key].includes(value.value[0]));
      } else {
        data = data.filter(item => item[key] === value);
      }
    });
    
    // Apply ordering
    if (orderBy) {
      data.sort((a, b) => {
        const aVal = a[orderBy!.column];
        const bVal = b[orderBy!.column];
        if (orderBy!.ascending) return aVal > bVal ? 1 : -1;
        return aVal < bVal ? 1 : -1;
      });
    }
    
    // Apply limit/range
    if (rangeStart !== null && rangeEnd !== null) {
      data = data.slice(rangeStart, rangeEnd + 1);
    } else if (limitCount !== null) {
      data = data.slice(0, limitCount);
    }
    
    return data;
  };

  const resolveQuery = (): MockSupabaseResponse => {
    if (mockConfig.shouldError) {
      return {
        data: null,
        error: { message: mockConfig.errorMessage, code: mockConfig.errorCode },
      };
    }

    const data = getFilteredData();
    
    if (isSingle) {
      if (data.length === 0) {
        return { data: null, error: { message: 'Row not found', code: 'PGRST116' } };
      }
      return { data: data[0], error: null };
    }
    
    return { data, error: null };
  };

  const builder: MockQueryBuilder = {
    select: jest.fn().mockImplementation(() => {
      return builder;
    }),
    insert: jest.fn().mockImplementation((insertData: any) => {
      pendingData = { ...insertData, id: insertData.id || `mock-${Date.now()}` };
      return builder;
    }),
    update: jest.fn().mockImplementation((updateData: any) => {
      pendingData = updateData;
      return builder;
    }),
    delete: jest.fn().mockImplementation(() => {
      return builder;
    }),
    upsert: jest.fn().mockImplementation((upsertData: any) => {
      pendingData = { ...upsertData, id: upsertData.id || `mock-${Date.now()}` };
      return builder;
    }),
    eq: jest.fn().mockImplementation((column: string, value: any) => {
      filters[column] = { op: 'eq', value };
      return builder;
    }),
    neq: jest.fn().mockImplementation((column: string, value: any) => {
      filters[column] = { op: 'neq', value };
      return builder;
    }),
    gt: jest.fn().mockImplementation((column: string, value: any) => {
      filters[column] = { op: 'gt', value };
      return builder;
    }),
    lt: jest.fn().mockImplementation((column: string, value: any) => {
      filters[column] = { op: 'lt', value };
      return builder;
    }),
    gte: jest.fn().mockImplementation((column: string, value: any) => {
      filters[column] = { op: 'gte', value };
      return builder;
    }),
    lte: jest.fn().mockImplementation((column: string, value: any) => {
      filters[column] = { op: 'lte', value };
      return builder;
    }),
    contains: jest.fn().mockImplementation((column: string, value: any) => {
      filters[column] = { op: 'contains', value };
      return builder;
    }),
    order: jest.fn().mockImplementation((column: string, options?: { ascending?: boolean }) => {
      orderBy = { column, ascending: options?.ascending ?? true };
      return builder;
    }),
    limit: jest.fn().mockImplementation((count: number) => {
      limitCount = count;
      return builder;
    }),
    range: jest.fn().mockImplementation((start: number, end: number) => {
      rangeStart = start;
      rangeEnd = end;
      return builder;
    }),
    single: jest.fn().mockImplementation(() => {
      isSingle = true;
      
      // For insert/update/upsert, add/update data in store
      if (pendingData) {
        const store = (mockStore as any)[tableName];
        const existingIndex = store.findIndex((item: any) => 
          Object.entries(filters).every(([k, v]: [string, any]) => item[k] === (v.value || v))
        );
        
        if (existingIndex >= 0) {
          store[existingIndex] = { ...store[existingIndex], ...pendingData };
        } else {
          store.push(pendingData);
        }
        
        if (mockConfig.shouldError) {
          return Promise.resolve({
            data: null,
            error: { message: mockConfig.errorMessage, code: mockConfig.errorCode },
          });
        }
        
        return Promise.resolve({ data: pendingData, error: null });
      }
      
      return Promise.resolve(resolveQuery());
    }),
    maybeSingle: jest.fn().mockImplementation(() => {
      const data = getFilteredData();
      if (mockConfig.shouldError) {
        return Promise.resolve({
          data: null,
          error: { message: mockConfig.errorMessage, code: mockConfig.errorCode },
        });
      }
      return Promise.resolve({ data: data[0] || null, error: null });
    }),
    rpc: jest.fn().mockImplementation(() => {
      if (mockConfig.shouldError) {
        return Promise.resolve({
          data: null,
          error: { message: mockConfig.errorMessage, code: mockConfig.errorCode },
        });
      }
      return Promise.resolve({ data: null, error: null });
    }),
  };

  // Make builder thenable for direct await
  (builder as any).then = (resolve: Function) => {
    // For delete operations
    if (builder.delete.mock.calls.length > 0) {
      if (mockConfig.shouldError) {
        resolve({
          data: null,
          error: { message: mockConfig.errorMessage, code: mockConfig.errorCode },
        });
      } else {
        // Remove matching items from store
        const store = (mockStore as any)[tableName];
        Object.entries(filters).forEach(([key, value]: [string, any]) => {
          const filterValue = value.value || value;
          const index = store.findIndex((item: any) => item[key] === filterValue);
          if (index >= 0) store.splice(index, 1);
        });
        resolve({ data: null, error: null });
      }
      return;
    }
    
    resolve(resolveQuery());
  };

  return builder;
}

// Mock auth object
export const mockAuth = {
  signUp: jest.fn().mockImplementation(({ email, password, options }) => {
    if (mockConfig.shouldError) {
      return Promise.resolve({
        data: { user: null, session: null },
        error: { message: mockConfig.errorMessage, code: mockConfig.errorCode },
      });
    }
    return Promise.resolve({
      data: {
        user: { id: 'mock-user-id', email, user_metadata: options?.data || {} },
        session: { access_token: 'mock-token', refresh_token: 'mock-refresh' },
      },
      error: null,
    });
  }),
  signInWithPassword: jest.fn().mockImplementation(({ email, password }) => {
    if (mockConfig.shouldError) {
      return Promise.resolve({
        data: { user: null, session: null },
        error: { message: mockConfig.errorMessage, code: mockConfig.errorCode },
      });
    }
    return Promise.resolve({
      data: {
        user: { id: 'mock-user-id', email },
        session: { access_token: 'mock-token', refresh_token: 'mock-refresh' },
      },
      error: null,
    });
  }),
  signInWithOAuth: jest.fn().mockImplementation(({ provider }) => {
    if (mockConfig.shouldError) {
      return Promise.resolve({
        data: { url: null, provider: null },
        error: { message: mockConfig.errorMessage, code: mockConfig.errorCode },
      });
    }
    return Promise.resolve({
      data: { url: `https://oauth.example.com/${provider}`, provider },
      error: null,
    });
  }),
  signOut: jest.fn().mockImplementation(() => {
    if (mockConfig.shouldError) {
      return Promise.resolve({
        error: { message: mockConfig.errorMessage, code: mockConfig.errorCode },
      });
    }
    return Promise.resolve({ error: null });
  }),
  getUser: jest.fn().mockImplementation(() => {
    if (mockConfig.shouldError) {
      return Promise.resolve({
        data: { user: null },
        error: { message: mockConfig.errorMessage, code: mockConfig.errorCode },
      });
    }
    return Promise.resolve({
      data: { user: { id: 'mock-user-id', email: 'test@example.com' } },
      error: null,
    });
  }),
  getSession: jest.fn().mockImplementation(() => {
    if (mockConfig.shouldError) {
      return Promise.resolve({
        data: { session: null },
        error: { message: mockConfig.errorMessage, code: mockConfig.errorCode },
      });
    }
    return Promise.resolve({
      data: {
        session: {
          access_token: 'mock-token',
          refresh_token: 'mock-refresh',
          user: { id: 'mock-user-id', email: 'test@example.com' },
        },
      },
      error: null,
    });
  }),
  onAuthStateChange: jest.fn().mockImplementation((callback) => {
    // Simulate initial callback
    setTimeout(() => callback('SIGNED_IN', { user: { id: 'mock-user-id' } }), 0);
    return {
      data: {
        subscription: {
          unsubscribe: jest.fn(),
        },
      },
    };
  }),
};

// Create mock Supabase client
export function createMockSupabaseClient() {
  return {
    from: jest.fn().mockImplementation((tableName: string) => createQueryBuilder(tableName)),
    rpc: jest.fn().mockImplementation((fnName: string, params?: any) => {
      if (mockConfig.shouldError) {
        return Promise.resolve({
          data: null,
          error: { message: mockConfig.errorMessage, code: mockConfig.errorCode },
        });
      }
      return Promise.resolve({ data: null, error: null });
    }),
    auth: mockAuth,
  };
}

// Default export for easy mocking
export const mockSupabase = createMockSupabaseClient();
export const mockSupabaseAdmin = createMockSupabaseClient();

export default {
  mockSupabase,
  mockSupabaseAdmin,
  mockStore,
  mockConfig,
  mockAuth,
  resetMockStore,
  setMockError,
  createMockSupabaseClient,
};
