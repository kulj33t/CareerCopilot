import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { authApi } from '../../api/auth.js';
import { ApiError } from '../../api/client.js';

function asRejection(err) {
  if (err instanceof ApiError) {
    return { message: err.message, status: err.status, details: err.details };
  }
  return { message: err?.message || 'Request failed' };
}

export const bootstrapAuth = createAsyncThunk('auth/bootstrap', async (_, thunkApi) => {
  try {
    const { user } = await authApi.me();
    return user;
  } catch (err) {
    // A 401 is the normal state for a visitor without a session cookie.
    if (err instanceof ApiError && err.status === 401) return null;
    return thunkApi.rejectWithValue(asRejection(err));
  }
});

// Login and signup are complete only after the browser has stored the
// HttpOnly cookie and the API accepts it on a follow-up /me request.
async function authenticateWithCookie(request, payload) {
  await request(payload);
  const { user } = await authApi.me();
  return user;
}

export const signup = createAsyncThunk('auth/signup', async (payload, thunkApi) => {
  try {
    return await authenticateWithCookie(authApi.signup, payload);
  } catch (err) {
    return thunkApi.rejectWithValue(asRejection(err));
  }
});

export const login = createAsyncThunk('auth/login', async (payload, thunkApi) => {
  try {
    return await authenticateWithCookie(authApi.login, payload);
  } catch (err) {
    return thunkApi.rejectWithValue(asRejection(err));
  }
});

export const logout = createAsyncThunk('auth/logout', async (_, thunkApi) => {
  try {
    await authApi.logout();
    return true;
  } catch (err) {
    // The server intentionally allows logout without a valid session, but a
    // 401 still means there is no usable session left to revoke.
    if (err instanceof ApiError && err.status === 401) return true;
    return thunkApi.rejectWithValue(asRejection(err));
  }
});

const initialState = {
  user: null,
  bootstrapped: false,
  submitting: false,
  error: null,
  sessionError: null,
  // A login/signup/logout that starts after /me invalidates that older result.
  sessionVersion: 0,
  bootstrapVersion: null,
  bootstrapRequestId: null,
  authRequestId: null,
  sessionExpired: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearAuthError(state) {
      state.error = null;
    },
    sessionExpired(state) {
      state.sessionVersion += 1;
      state.user = null;
      state.bootstrapped = true;
      state.submitting = false;
      state.error = null;
      state.sessionError = null;
      state.sessionExpired = true;
      state.bootstrapVersion = null;
      state.bootstrapRequestId = null;
      state.authRequestId = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(bootstrapAuth.pending, (state, action) => {
        state.bootstrapVersion = state.sessionVersion;
        state.bootstrapRequestId = action.meta.requestId;
        state.bootstrapped = false;
        state.sessionError = null;
      })
      .addCase(bootstrapAuth.fulfilled, (state, action) => {
        if (
          state.bootstrapRequestId !== action.meta.requestId ||
          state.bootstrapVersion !== state.sessionVersion
        ) return;
        state.user = action.payload;
        state.bootstrapped = true;
        state.sessionError = null;
        state.sessionExpired = false;
        state.bootstrapVersion = null;
        state.bootstrapRequestId = null;
      })
      .addCase(bootstrapAuth.rejected, (state, action) => {
        if (
          state.bootstrapRequestId !== action.meta.requestId ||
          state.bootstrapVersion !== state.sessionVersion
        ) return;
        // A network/server failure is not proof that the user is signed out.
        state.bootstrapped = true;
        state.sessionError = action.payload || { message: 'Could not verify your session.' };
        state.bootstrapVersion = null;
        state.bootstrapRequestId = null;
      })

      .addCase(signup.pending, (state, action) => {
        state.sessionVersion += 1;
        state.bootstrapVersion = null;
        state.bootstrapRequestId = null;
        state.authRequestId = action.meta.requestId;
        state.submitting = true;
        state.error = null;
        state.sessionError = null;
      })
      .addCase(signup.fulfilled, (state, action) => {
        if (state.authRequestId !== action.meta.requestId) return;
        state.submitting = false;
        state.user = action.payload;
        state.bootstrapped = true;
        state.sessionError = null;
        state.sessionExpired = false;
        state.authRequestId = null;
      })
      .addCase(signup.rejected, (state, action) => {
        if (state.authRequestId !== action.meta.requestId) return;
        state.submitting = false;
        state.bootstrapped = true;
        state.error = action.payload || { message: 'Signup failed' };
        state.authRequestId = null;
      })

      .addCase(login.pending, (state, action) => {
        state.sessionVersion += 1;
        state.bootstrapVersion = null;
        state.bootstrapRequestId = null;
        state.authRequestId = action.meta.requestId;
        state.submitting = true;
        state.error = null;
        state.sessionError = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        if (state.authRequestId !== action.meta.requestId) return;
        state.submitting = false;
        state.user = action.payload;
        state.bootstrapped = true;
        state.sessionError = null;
        state.sessionExpired = false;
        state.authRequestId = null;
      })
      .addCase(login.rejected, (state, action) => {
        if (state.authRequestId !== action.meta.requestId) return;
        state.submitting = false;
        state.bootstrapped = true;
        state.error = action.payload || { message: 'Login failed' };
        state.authRequestId = null;
      })

      .addCase(logout.pending, (state, action) => {
        state.sessionVersion += 1;
        state.bootstrapVersion = null;
        state.bootstrapRequestId = null;
        state.authRequestId = action.meta.requestId;
        state.submitting = true;
        state.error = null;
        state.sessionError = null;
      })
      .addCase(logout.fulfilled, (state, action) => {
        if (state.authRequestId !== action.meta.requestId) return;
        state.submitting = false;
        state.user = null;
        state.bootstrapped = true;
        state.authRequestId = null;
      })
      .addCase(logout.rejected, (state, action) => {
        if (state.authRequestId !== action.meta.requestId) return;
        state.submitting = false;
        state.bootstrapped = true;
        state.error = action.payload || { message: 'Logout failed' };
        state.authRequestId = null;
      });
  },
});

export const { clearAuthError, sessionExpired: markSessionExpired } = authSlice.actions;
export default authSlice.reducer;
