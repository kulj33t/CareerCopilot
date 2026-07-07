import { api } from './client.js';

export const jdMatchApi = {
  match: ({ resumeId, jdText }) =>
    api.post('/api/jd-match', { resumeId, jdText }).then((d) => d.match),
};
