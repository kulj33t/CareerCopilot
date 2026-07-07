import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { dashboardApi } from '../../api/dashboard.js';
import { ApiError } from '../../api/client.js';

function asRejection(err) {
  if (err instanceof ApiError) {
    return { message: err.message, status: err.status, details: err.details };
  }
  return { message: err?.message || 'Request failed' };
}

export const fetchDashboard = createAsyncThunk('user/dashboard', async (_, thunkApi) => {
  try {
    return await dashboardApi.get();
  } catch (err) {
    return thunkApi.rejectWithValue(asRejection(err));
  }
});

// Shape matches the old mock so components don't have to change. All numeric
// fields default to 0 before the first fetch completes; arrays default to [].
const emptyStats = {
  streak: 0,
  resumeScore: 0,
  resumeDelta: 0,
  mockInterviews: 0,
  mockInterviewsWeek: 0,
  questionsPracticed: 0,
  questionsWeek: 0,
  avgPerformance: 0,
  avgDelta: 0,
};

const initialState = {
  stats: emptyStats,
  recommendations: [],
  activity: [],
  weakTopics: [],
  heatmap: [],          // [{ date, level }]
  loading: false,
  loaded: false,        // true after first fetch resolves (success or failure)
  error: null,
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchDashboard.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDashboard.fulfilled, (state, action) => {
        const d = action.payload || {};
        state.loading = false;
        state.loaded = true;
        state.stats = { ...emptyStats, ...(d.stats || {}) };
        state.recommendations = d.recommendations || [];
        state.activity = d.activity || [];
        state.weakTopics = d.weakTopics || [];
        state.heatmap = d.heatmap || [];
      })
      .addCase(fetchDashboard.rejected, (state, action) => {
        state.loading = false;
        state.loaded = true;
        state.error = action.payload || { message: 'Failed to load dashboard' };
      });
  },
});

export default userSlice.reducer;
