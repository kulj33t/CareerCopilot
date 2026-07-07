import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { prepPlanApi } from '../../api/prepPlan.js';
import { ApiError } from '../../api/client.js';

function asRejection(err) {
  if (err instanceof ApiError) {
    return { message: err.message, status: err.status, details: err.details };
  }
  return { message: err?.message || 'Request failed' };
}

export const fetchPrepPlan = createAsyncThunk('prep/fetch', async (_, thunkApi) => {
  try {
    return await prepPlanApi.get();
  } catch (err) {
    return thunkApi.rejectWithValue(asRejection(err));
  }
});

export const regeneratePrepPlan = createAsyncThunk(
  'prep/regenerate',
  async (payload, thunkApi) => {
    try {
      return await prepPlanApi.regenerate(payload || {});
    } catch (err) {
      return thunkApi.rejectWithValue(asRejection(err));
    }
  }
);

export const toggleTask = createAsyncThunk('prep/toggleTask', async (taskId, thunkApi) => {
  try {
    return await prepPlanApi.toggleTask(taskId);
  } catch (err) {
    return thunkApi.rejectWithValue(asRejection(err));
  }
});

const initialState = {
  plan: null,           // full plan from server, or null before first fetch
  loading: false,       // initial GET (may include generation on first visit)
  regenerating: false,  // regenerate POST in flight
  error: null,
};

const prepSlice = createSlice({
  name: 'prep',
  initialState,
  reducers: {
    clearPrepError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPrepPlan.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPrepPlan.fulfilled, (state, action) => {
        state.loading = false;
        state.plan = action.payload;
      })
      .addCase(fetchPrepPlan.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || { message: 'Failed to load prep plan' };
      })

      .addCase(regeneratePrepPlan.pending, (state) => {
        state.regenerating = true;
        state.error = null;
      })
      .addCase(regeneratePrepPlan.fulfilled, (state, action) => {
        state.regenerating = false;
        state.plan = action.payload;
      })
      .addCase(regeneratePrepPlan.rejected, (state, action) => {
        state.regenerating = false;
        state.error = action.payload || { message: 'Regenerate failed' };
      })

      // Optimistic toggle: flip immediately, revert on server error.
      .addCase(toggleTask.pending, (state, action) => {
        if (!state.plan) return;
        const task = state.plan.tasks.find((t) => t.id === action.meta.arg);
        if (task) task.done = !task.done;
      })
      .addCase(toggleTask.fulfilled, (state, action) => {
        state.plan = action.payload;
      })
      .addCase(toggleTask.rejected, (state, action) => {
        if (!state.plan) return;
        const task = state.plan.tasks.find((t) => t.id === action.meta.arg);
        if (task) task.done = !task.done; // revert
        state.error = action.payload || { message: 'Toggle failed' };
      });
  },
});

export const { clearPrepError } = prepSlice.actions;
export default prepSlice.reducer;
