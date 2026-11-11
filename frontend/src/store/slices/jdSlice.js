import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { jdMatchApi } from '../../api/jdMatch.js';
import { ApiError } from '../../api/client.js';

function asRejection(err) {
  if (err instanceof ApiError) {
    return { message: err.message, status: err.status, details: err.details };
  }
  return { message: err?.message || 'Request failed' };
}

export const analyzeJd = createAsyncThunk(
  'jd/analyze',
  async ({ resumeId, jdText }, thunkApi) => {
    try {
      const result = await jdMatchApi.match({ resumeId, jdText });
      const matchPct = Number(result?.matchPct);
      if (!result || typeof result !== 'object' || !Number.isFinite(matchPct)) {
        throw new ApiError('The service returned an incomplete match result. Please try again later.');
      }
      return {
        ...result,
        matchPct: Math.max(0, Math.min(100, matchPct)),
        matching: Array.isArray(result.matching) ? result.matching.filter((item) => typeof item === 'string') : [],
        missing: Array.isArray(result.missing) ? result.missing.filter((item) => typeof item === 'string') : [],
        summary: typeof result.summary === 'string' ? result.summary : 'Your match analysis is ready.',
      };
    } catch (err) {
      return thunkApi.rejectWithValue(asRejection(err));
    }
  },
  { condition: (_, { getState }) => !getState().jd.analyzing }
);

const initialState = {
  jdText: '',              // current draft in the textarea (persisted locally)
  selectedResumeId: null,  // which resume we're matching against
  result: null,            // latest match result or null
  analyzing: false,
  error: null,
};

const jdSlice = createSlice({
  name: 'jd',
  initialState,
  reducers: {
    setJdText(state, action) {
      state.jdText = action.payload;
    },
    setSelectedResume(state, action) {
      state.selectedResumeId = action.payload;
    },
    clearJdError(state) {
      state.error = null;
    },
    clearJdResult(state) {
      state.result = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(analyzeJd.pending, (state) => {
        state.analyzing = true;
        state.error = null;
      })
      .addCase(analyzeJd.fulfilled, (state, action) => {
        state.analyzing = false;
        state.result = action.payload;
      })
      .addCase(analyzeJd.rejected, (state, action) => {
        state.analyzing = false;
        state.error = action.payload || { message: 'Match analysis failed' };
      });
  },
});

export const { setJdText, setSelectedResume, clearJdError, clearJdResult } = jdSlice.actions;
export default jdSlice.reducer;
