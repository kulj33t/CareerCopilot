import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { jdMatchApi } from '../../api/jdMatch.js';
import { ApiError } from '../../api/client.js';

function asRejection(err) {
  if (err instanceof ApiError) {
    return { message: err.message, status: err.status, details: err.details };
  }
  return { message: err?.message || 'Request failed' };
}

export const analyzeJd = createAsyncThunk('jd/analyze', async ({ resumeId, jdText }, thunkApi) => {
  try {
    return await jdMatchApi.match({ resumeId, jdText });
  } catch (err) {
    return thunkApi.rejectWithValue(asRejection(err));
  }
});

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
