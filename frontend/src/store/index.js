import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice.js';
import userReducer from './slices/userSlice.js';
import resumeReducer from './slices/resumeSlice.js';
import jdReducer from './slices/jdSlice.js';
import questionsReducer from './slices/questionsSlice.js';
import prepReducer from './slices/prepSlice.js';
import interviewReducer from './slices/interviewSlice.js';
import { loadPreloadedState, attachPersistence } from './persistence.js';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    user: userReducer,
    resume: resumeReducer,
    jd: jdReducer,
    questions: questionsReducer,
    prep: prepReducer,
    interview: interviewReducer,
  },
  preloadedState: loadPreloadedState(),
});

attachPersistence(store);
