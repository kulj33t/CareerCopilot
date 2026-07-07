import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { interviewApi } from '../../api/interview.js';
import { ApiError } from '../../api/client.js';

function asRejection(err) {
  if (err instanceof ApiError) {
    return { message: err.message, status: err.status, details: err.details };
  }
  return { message: err?.message || 'Request failed' };
}

// ─── Thunks ──────────────────────────────────────────────────────────

export const loadActiveSession = createAsyncThunk(
  'interview/loadActive',
  async (_, thunkApi) => {
    try {
      return await interviewApi.active();
    } catch (err) {
      return thunkApi.rejectWithValue(asRejection(err));
    }
  }
);

export const startSession = createAsyncThunk(
  'interview/start',
  async (setup, thunkApi) => {
    try {
      return await interviewApi.start(setup);
    } catch (err) {
      return thunkApi.rejectWithValue(asRejection(err));
    }
  }
);

export const sendAnswer = createAsyncThunk(
  'interview/send',
  async ({ sessionId, text }, thunkApi) => {
    try {
      return await interviewApi.sendMessage(sessionId, text);
    } catch (err) {
      return thunkApi.rejectWithValue(asRejection(err));
    }
  }
);

export const endCurrentSession = createAsyncThunk(
  'interview/end',
  async (sessionId, thunkApi) => {
    try {
      return await interviewApi.endSession(sessionId);
    } catch (err) {
      return thunkApi.rejectWithValue(asRejection(err));
    }
  }
);

// Discards the active session without generating a report. Used when the
// user has a stale in-progress session blocking them from starting a new one.
export const abandonCurrentSession = createAsyncThunk(
  'interview/abandon',
  async (sessionId, thunkApi) => {
    try {
      return await interviewApi.abandonSession(sessionId);
    } catch (err) {
      return thunkApi.rejectWithValue(asRejection(err));
    }
  }
);

export const loadSessionById = createAsyncThunk(
  'interview/loadById',
  async (id, thunkApi) => {
    try {
      return await interviewApi.get(id);
    } catch (err) {
      return thunkApi.rejectWithValue(asRejection(err));
    }
  }
);

// ─── Slice ───────────────────────────────────────────────────────────

const initialState = {
  // Local setup selection before the session starts.
  setup: {
    mode: 'text',
    role: 'sde',
    round: 'technical',
    level: 'fresher',
    difficulty: 'medium',
  },
  // Live + historical session state from the server.
  session: null,
  draftMessage: '',

  // Request states
  loading: false,   // GET active
  starting: false,  // POST /sessions
  aiTyping: false,  // send message in flight
  ending: false,    // POST /end
  error: null,
};

const interviewSlice = createSlice({
  name: 'interview',
  initialState,
  reducers: {
    setSetupField(state, action) {
      const { field, value } = action.payload;
      state.setup[field] = value;
    },
    setDraft(state, action) {
      state.draftMessage = action.payload;
    },
    clearInterviewError(state) {
      state.error = null;
    },
    // Snappier UX: show the user's bubble before the server round-trip.
    // The thunk response will replace the whole `session`, reconciling the id.
    optimisticUserMessage(state, action) {
      if (!state.session) return;
      state.session.messages.push({
        id: `pending-${Date.now()}`,
        role: 'user',
        html: action.payload,
        feedback: null,
      });
      state.draftMessage = '';
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadActiveSession.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loadActiveSession.fulfilled, (state, action) => {
        state.loading = false;
        state.session = action.payload; // null is fine — means no active session
      })
      .addCase(loadActiveSession.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || { message: 'Failed to load session' };
      })

      .addCase(startSession.pending, (state) => {
        state.starting = true;
        state.error = null;
      })
      .addCase(startSession.fulfilled, (state, action) => {
        state.starting = false;
        state.session = action.payload;
      })
      .addCase(startSession.rejected, (state, action) => {
        state.starting = false;
        state.error = action.payload || { message: 'Could not start interview' };
      })

      .addCase(sendAnswer.pending, (state) => {
        state.aiTyping = true;
        state.error = null;
      })
      .addCase(sendAnswer.fulfilled, (state, action) => {
        state.aiTyping = false;
        state.session = action.payload;
      })
      .addCase(sendAnswer.rejected, (state, action) => {
        state.aiTyping = false;
        state.error = action.payload || { message: 'Message failed' };
        // Drop the optimistic pending user bubble so the user can retry.
        if (state.session) {
          state.session.messages = state.session.messages.filter(
            (m) => !String(m.id).startsWith('pending-')
          );
        }
      })

      .addCase(endCurrentSession.pending, (state) => {
        state.ending = true;
      })
      .addCase(endCurrentSession.fulfilled, (state, action) => {
        state.ending = false;
        state.session = action.payload;
      })
      .addCase(endCurrentSession.rejected, (state, action) => {
        state.ending = false;
        state.error = action.payload || { message: 'Could not end session' };
      })

      .addCase(abandonCurrentSession.fulfilled, (state) => {
        // Clear everything — user is starting fresh.
        state.session = null;
        state.draftMessage = '';
      })

      .addCase(loadSessionById.fulfilled, (state, action) => {
        state.session = action.payload;
      });
  },
});

export const {
  setSetupField,
  setDraft,
  clearInterviewError,
  optimisticUserMessage,
} = interviewSlice.actions;
export default interviewSlice.reducer;
