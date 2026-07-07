import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { questionsApi } from '../../api/questions.js';
import { ApiError } from '../../api/client.js';
import { QB_FILTERS } from '../../data/mockData.js';

function asRejection(err) {
  if (err instanceof ApiError) {
    return { message: err.message, status: err.status, details: err.details };
  }
  return { message: err?.message || 'Request failed' };
}

// Filter values that correspond to a category vs a company. Used to decide
// which query-string key to populate when the user clicks a chip.
const CATEGORY_FILTERS = new Set([
  'Frontend', 'Backend', 'DSA', 'System Design', 'Behavioral', 'DBMS', 'OS', 'Networks',
]);

function paramsFromState(state) {
  // The whole bank fits comfortably in one fetch (currently ~247 questions).
  // limit=300 = server cap; fewer round trips beats pagination complexity.
  const p = { limit: 300 };
  const f = state.activeFilter;
  if (f === 'Bookmarked') {
    p.bookmarked = 'true';
  } else if (CATEGORY_FILTERS.has(f)) {
    p.category = f;
  } else if (f && f !== 'All') {
    p.company = f;
  }
  if (state.searchQuery && state.searchQuery.trim()) {
    p.q = state.searchQuery.trim();
  }
  return p;
}

export const fetchQuestions = createAsyncThunk(
  'questions/fetch',
  async (_, thunkApi) => {
    try {
      const params = paramsFromState(thunkApi.getState().questions);
      return await questionsApi.list(params);
    } catch (err) {
      return thunkApi.rejectWithValue(asRejection(err));
    }
  }
);

export const toggleBookmark = createAsyncThunk(
  'questions/toggleBookmark',
  async ({ id, bookmarked }, thunkApi) => {
    try {
      if (bookmarked) await questionsApi.unbookmark(id);
      else await questionsApi.bookmark(id);
      return { id, bookmarked: !bookmarked };
    } catch (err) {
      return thunkApi.rejectWithValue(asRejection(err));
    }
  }
);

// Fetch a cached answer OR generate one if missing. `force:true` regenerates.
export const loadAnswer = createAsyncThunk(
  'questions/loadAnswer',
  async ({ id, force = false }, thunkApi) => {
    try {
      const res = await questionsApi.generateAnswer(id, { force });
      return { id, answer: res.answer, cached: !!res.cached };
    } catch (err) {
      return thunkApi.rejectWithValue({ id, ...asRejection(err) });
    }
  }
);

const initialState = {
  all: [],                 // current page of questions
  total: 0,
  filters: [...QB_FILTERS, 'Bookmarked'],
  activeFilter: 'All',
  searchQuery: '',
  loading: false,
  error: null,

  // Answer cache keyed by question id. Status map lets the modal render a
  // per-question loading state without mixing up unrelated requests.
  answers: {},             // { [id]: AnswerPayload }
  answerStatus: {},        // { [id]: 'loading' | 'idle' | 'error' }
  answerError: null,

  // Which question's modal is currently open (or null).
  activeQuestionId: null,
};

const questionsSlice = createSlice({
  name: 'questions',
  initialState,
  reducers: {
    setFilter(state, action) {
      state.activeFilter = action.payload;
    },
    setSearch(state, action) {
      state.searchQuery = action.payload;
    },
    openQuestion(state, action) {
      state.activeQuestionId = action.payload;
    },
    closeQuestion(state) {
      state.activeQuestionId = null;
      state.answerError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchQuestions.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchQuestions.fulfilled, (state, action) => {
        state.loading = false;
        state.all = action.payload.questions;
        state.total = action.payload.total;
      })
      .addCase(fetchQuestions.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || { message: 'Failed to load questions' };
      })
      // Optimistic bookmark flip. If the server rejects, revert.
      .addCase(toggleBookmark.pending, (state, action) => {
        const q = state.all.find((x) => x.id === action.meta.arg.id);
        if (q) q.bookmarked = !q.bookmarked;
      })
      .addCase(toggleBookmark.rejected, (state, action) => {
        const q = state.all.find((x) => x.id === action.meta.arg.id);
        if (q) q.bookmarked = action.meta.arg.bookmarked; // revert
        state.error = action.payload || { message: 'Bookmark toggle failed' };
      })

      .addCase(loadAnswer.pending, (state, action) => {
        const id = action.meta.arg.id;
        state.answerStatus[id] = 'loading';
        state.answerError = null;
      })
      .addCase(loadAnswer.fulfilled, (state, action) => {
        const { id, answer } = action.payload;
        state.answerStatus[id] = 'idle';
        state.answers[id] = answer;
      })
      .addCase(loadAnswer.rejected, (state, action) => {
        const id = action.meta.arg.id;
        state.answerStatus[id] = 'error';
        state.answerError = action.payload || { message: 'Answer failed to load' };
      });
  },
});

export const { setFilter, setSearch, openQuestion, closeQuestion } = questionsSlice.actions;
export default questionsSlice.reducer;
