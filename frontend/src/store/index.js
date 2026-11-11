import { combineReducers, configureStore } from '@reduxjs/toolkit';
import authReducer, { logout, markSessionExpired } from './slices/authSlice.js';
import userReducer from './slices/userSlice.js';
import resumeReducer from './slices/resumeSlice.js';
import jdReducer from './slices/jdSlice.js';
import questionsReducer from './slices/questionsSlice.js';
import prepReducer from './slices/prepSlice.js';
import interviewReducer from './slices/interviewSlice.js';
import { loadPreloadedState, attachPersistence } from './persistence.js';

const appReducer = combineReducers({
  auth: authReducer,
  user: userReducer,
  resume: resumeReducer,
  jd: jdReducer,
  questions: questionsReducer,
  prep: prepReducer,
  interview: interviewReducer,
});

function rootReducer(state, action) {
  if (markSessionExpired.match(action) || logout.fulfilled.match(action)) {
    // Keep the auth slice long enough to process the event, while dropping
    // user-specific API results and any draft restored from another account.
    const freshState = appReducer(undefined, { type: '@@careercopilot/reset' });
    return appReducer({ ...freshState, auth: state?.auth }, action);
  }
  return appReducer(state, action);
}

export const store = configureStore({
  reducer: rootReducer,
  preloadedState: loadPreloadedState(),
});

attachPersistence(store);
