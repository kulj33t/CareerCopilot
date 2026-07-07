import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { authApi } from '../../api/auth.js';
import { ApiError } from '../../api/client.js';

// Converts an ApiError into a plain object Redux can serialize.
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
    // Not logged in is the expected state for a fresh visitor — not an error.
    if (err instanceof ApiError && err.status === 401) return null;
    return thunkApi.rejectWithValue(asRejection(err));
  }
});

export const signup = createAsyncThunk('auth/signup', async (payload, thunkApi) => {
  try {
    const { user } = await authApi.signup(payload);
    return user;
  } catch (err) {
    return thunkApi.rejectWithValue(asRejection(err));
  }
});

export const login = createAsyncThunk('auth/login', async (payload, thunkApi) => {
  try {
    const { user } = await authApi.login(payload);
    return user;
  } catch (err) {
    return thunkApi.rejectWithValue(asRejection(err));
  }
});

export const logout = createAsyncThunk('auth/logout', async (_, thunkApi) => {
  try {
    await authApi.logout();
    return true;
  } catch (err) {
    return thunkApi.rejectWithValue(asRejection(err));
  }
});

const initialState = {
  user: null,            // { id, name, email, createdAt } | null
  bootstrapped: false,   // have we asked the server "who am I?" yet?
  submitting: false,     // in-flight signup/login/logout
  error: null,           // last auth error (cleared on next attempt)
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearAuthError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(bootstrapAuth.pending, (state) => {
        state.error = null;
      })
      .addCase(bootstrapAuth.fulfilled, (state, action) => {
        state.user = action.payload;
        state.bootstrapped = true;
      })
      .addCase(bootstrapAuth.rejected, (state) => {
        state.user = null;
        state.bootstrapped = true;
      })

      .addCase(signup.pending, (state) => {
        state.submitting = true;
        state.error = null;
      })
      .addCase(signup.fulfilled, (state, action) => {
        state.submitting = false;
        state.user = action.payload;
      })
      .addCase(signup.rejected, (state, action) => {
        state.submitting = false;
        state.error = action.payload || { message: 'Signup failed' };
      })

      .addCase(login.pending, (state) => {
        state.submitting = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.submitting = false;
        state.user = action.payload;
      })
      .addCase(login.rejected, (state, action) => {
        state.submitting = false;
        state.error = action.payload || { message: 'Login failed' };
      })

      .addCase(logout.pending, (state) => {
        state.submitting = true;
      })
      .addCase(logout.fulfilled, (state) => {
        state.submitting = false;
        state.user = null;
      })
      .addCase(logout.rejected, (state, action) => {
        state.submitting = false;
        state.error = action.payload || { message: 'Logout failed' };
      });
  },
});

export const { clearAuthError } = authSlice.actions;
export default authSlice.reducer;
