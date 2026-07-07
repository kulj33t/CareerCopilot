import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { resumesApi } from '../../api/resumes.js';
import { ApiError } from '../../api/client.js';

function asRejection(err) {
  if (err instanceof ApiError) {
    return { message: err.message, status: err.status, details: err.details };
  }
  return { message: err?.message || 'Request failed' };
}

export const fetchResumes = createAsyncThunk('resumes/fetchAll', async (_, thunkApi) => {
  try {
    return await resumesApi.list();
  } catch (err) {
    return thunkApi.rejectWithValue(asRejection(err));
  }
});

export const uploadResume = createAsyncThunk('resumes/upload', async (file, thunkApi) => {
  try {
    return await resumesApi.upload(file);
  } catch (err) {
    return thunkApi.rejectWithValue(asRejection(err));
  }
});

export const deleteResume = createAsyncThunk('resumes/delete', async (id, thunkApi) => {
  try {
    await resumesApi.remove(id);
    return id;
  } catch (err) {
    return thunkApi.rejectWithValue(asRejection(err));
  }
});

// POST /analysis is idempotent — returns cached if present, otherwise
// generates a fresh one. This is what ResumeResults calls on mount.
export const analyzeResume = createAsyncThunk(
  'resumes/analyze',
  async ({ resumeId, force = false }, thunkApi) => {
    try {
      const res = await resumesApi.analyze(resumeId, { force });
      return { resumeId, analysis: res.analysis, cached: res.cached };
    } catch (err) {
      return thunkApi.rejectWithValue(asRejection(err));
    }
  }
);

const initialState = {
  list: [],                        // Resume[] from server
  activeId: null,                  // currently viewed resume (for results page)
  loading: false,                  // list fetch in-flight
  uploading: false,                // upload in-flight
  error: null,                     // most recent error (read-and-clear)

  // Analysis cache keyed by resumeId, plus a simple request status map so the
  // UI can show per-resume loading states.
  analyses: {},                    // { [resumeId]: Analysis }
  analysisStatus: {},              // { [resumeId]: 'idle' | 'loading' | 'error' }
  analysisError: null,             // last analysis failure
};

const resumeSlice = createSlice({
  name: 'resume',
  initialState,
  reducers: {
    setActive(state, action) {
      state.activeId = action.payload;
    },
    clearResumeError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchResumes.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchResumes.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload;
        // If the previously active resume no longer exists (e.g. deleted on
        // another device), fall back to the newest one.
        if (state.activeId && !state.list.some((r) => r.id === state.activeId)) {
          state.activeId = state.list[0]?.id || null;
        }
      })
      .addCase(fetchResumes.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || { message: 'Failed to load resumes' };
      })

      .addCase(uploadResume.pending, (state) => {
        state.uploading = true;
        state.error = null;
      })
      .addCase(uploadResume.fulfilled, (state, action) => {
        state.uploading = false;
        state.list = [action.payload, ...state.list];
        state.activeId = action.payload.id;
      })
      .addCase(uploadResume.rejected, (state, action) => {
        state.uploading = false;
        state.error = action.payload || { message: 'Upload failed' };
      })

      .addCase(deleteResume.fulfilled, (state, action) => {
        state.list = state.list.filter((r) => r.id !== action.payload);
        if (state.activeId === action.payload) state.activeId = state.list[0]?.id || null;
        delete state.analyses[action.payload];
        delete state.analysisStatus[action.payload];
      })
      .addCase(deleteResume.rejected, (state, action) => {
        state.error = action.payload || { message: 'Delete failed' };
      })

      .addCase(analyzeResume.pending, (state, action) => {
        const id = action.meta.arg.resumeId;
        state.analysisStatus[id] = 'loading';
        state.analysisError = null;
      })
      .addCase(analyzeResume.fulfilled, (state, action) => {
        const { resumeId, analysis } = action.payload;
        state.analysisStatus[resumeId] = 'idle';
        state.analyses[resumeId] = analysis;
      })
      .addCase(analyzeResume.rejected, (state, action) => {
        const id = action.meta.arg.resumeId;
        state.analysisStatus[id] = 'error';
        state.analysisError = action.payload || { message: 'Analysis failed' };
      });
  },
});

export const { setActive, clearResumeError } = resumeSlice.actions;
export default resumeSlice.reducer;
