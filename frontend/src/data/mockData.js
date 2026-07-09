// Seed data that backs the initial Redux state.
// Keep all strings plain — no platform-specific characters in source.

export const mockUser = {
  name: 'Kuljeet Singh            ',
  initials: 'KS',
  email: 'kuljeet@college.edu',
  role: 'SDE / Full-Stack',
  targetDate: 'Jun 15',
};

export const mockStats = {
  streak: 7,
  resumeScore: 82,
  resumeDelta: 14,
  mockInterviews: 14,
  mockInterviewsWeek: 4,
  questionsPracticed: 127,
  questionsWeek: 23,
  avgPerformance: 7.4,
  avgDelta: 0.6,
};

export const mockRecommendations = [
  {
    id: 'r1',
    icon: '🎯',
    title: 'Practice System Design — Design a URL Shortener',
    body: "You've been weak on scalability questions. This 20-min mock targets that directly.",
  },
  {
    id: 'r2',
    icon: '📝',
    title: 'Rewrite your project bullets',
    body: 'Your "Chit-Chat" project is missing quantified impact. AI can help you add metrics.',
  },
  {
    id: 'r3',
    icon: '⚡',
    title: 'DSA drill: 5 Dynamic Programming problems',
    body: 'Your weakest topic this week. Start with easy and progress to medium.',
  },
];

export const mockActivity = [
  { id: 'a1', title: 'Completed mock interview — Frontend Technical', meta: '2 hours ago', score: '7.8/10' },
  { id: 'a2', title: 'Analyzed resume — v4.pdf', meta: 'Yesterday', score: '82/100' },
  { id: 'a3', title: 'Practiced 8 DSA questions', meta: 'Yesterday', score: '6/8' },
  { id: 'a4', title: 'Matched JD — SDE Intern @ Razorpay', meta: '2 days ago', score: '74%' },
];

export const mockWeakTopics = [
  { id: 't1', name: 'Dynamic Programming', pct: 42, color: 'danger' },
  { id: 't2', name: 'System Design', pct: 55, color: 'warning' },
  { id: 't3', name: 'Graph Algorithms', pct: 61, color: 'warning' },
  { id: 't4', name: 'Behavioral — Leadership', pct: 78, color: 'success' },
];

export const mockResumes = [
  {
    id: 'res4',
    name: 'Piyush_Thakur_Resume_v4.pdf',
    type: 'PDF',
    uploaded: '2 hours ago',
    size: '1.2 MB',
    score: 82,
    latest: true,
  },
  {
    id: 'res3',
    name: 'Piyush_Thakur_Resume_v3.pdf',
    type: 'PDF',
    uploaded: '3 days ago',
    size: '1.1 MB',
    score: 68,
    latest: false,
  },
  {
    id: 'res2',
    name: 'Resume_Internship.docx',
    type: 'DOCX',
    uploaded: '2 weeks ago',
    size: '780 KB',
    score: 61,
    latest: false,
  },
];

export const mockResumeAnalysis = {
  overallScore: 82,
  summary:
    'Strong technical foundation. Your experience section needs quantified outcomes and your skills are slightly unfocused for SDE roles. Fix 4 critical issues to cross 90.',
  dimensions: [
    { label: 'Clarity', value: 85, level: 'good' },
    { label: 'Impact', value: 68, level: 'warn' },
    { label: 'ATS', value: 91, level: 'good' },
    { label: 'Skill Fit', value: 72, level: 'warn' },
    { label: 'Formatting', value: 94, level: 'good' },
  ],
  feedback: [
    {
      id: 'f1',
      severity: 'high',
      tag: 'Critical · Impact',
      tagStyle: 'pill-coral',
      title: 'Experience bullets lack metrics',
      body:
        'Your EduSports internship bullets describe what you did but not the scale or outcome. Recruiters scan for numbers — percentages, users, response times.',
      suggestion:
        '→ "Designed REST APIs handling 15K+ requests/day, reducing query time by 40% via MongoDB indexing."',
    },
    {
      id: 'f2',
      severity: 'med',
      tag: 'Warning · Skill Fit',
      tagStyle: 'pill-cream',
      title: 'Skills section is too broad',
      body:
        '15 skills listed with no hierarchy. Pick 3–4 core skills and emphasize them. Move secondary skills to a "Tools" section.',
      suggestion: '→ Restructure into "Core", "Frameworks", and "Tools" with clear priority.',
    },
    {
      id: 'f3',
      severity: 'med',
      tag: 'Warning · Clarity',
      tagStyle: 'pill-cream',
      title: 'Objective statement is generic',
      body:
        '"Eager to learn and grow" is what every fresher writes. Replace with a 2-line summary stating what you\'ve built and what you\'re looking for.',
    },
    {
      id: 'f4',
      severity: 'low',
      tag: 'Suggestion',
      tagStyle: '',
      title: 'Consider adding GitHub URL to header',
      body:
        'Your GitHub link exists but is buried. Move it to the header where recruiters can one-click.',
    },
  ],
  atsChecks: [
    { label: 'Standard section headers', pass: true },
    { label: 'No images or icons', pass: true },
    { label: 'No tables (single column)', pass: true },
    { label: 'Contact info present', pass: true },
    { label: 'Standard fonts used', pass: true },
    { label: 'File size under 2 MB', pass: true },
    { label: 'Not enough action verbs', pass: false },
    { label: 'Missing key role keywords', pass: false },
    { label: 'Low quantified achievements', pass: false },
    { label: 'Word count: 412 (optimal)', pass: true },
    { label: 'Clear education section', pass: true },
    { label: 'Chronological order', pass: true },
  ],
};

export const mockJDAnalysis = {
  company: '@ Razorpay · SDE Intern',
  jdText: `We're looking for a Software Development Engineer Intern to join our Payments team.

Responsibilities:
• Build and maintain backend services in Node.js and Go
• Work with microservices, Kafka, and PostgreSQL at scale
• Collaborate with product and design to ship user-facing features
• Write unit tests and participate in code reviews

Requirements:
• Pursuing B.Tech/B.E. in CS or related field
• Strong fundamentals in DSA, OOP, and databases
• Hands-on experience with JavaScript/TypeScript
• Familiarity with REST APIs and version control (Git)

Nice to have:
• Experience with Docker, Kubernetes, AWS
• Contributions to open source
• Prior internship experience`,
  matchPct: 74,
  summary: 'Solid fit. Address the 3 missing skills below to push this past 85%.',
  matching: ['JavaScript', 'Node.js', 'REST APIs', 'Git', 'DSA', 'OOP', 'Databases'],
  missing: ['Docker', 'Kafka', 'PostgreSQL'],
  tip: 'Docker is the quickest win — add a 1-day project containerizing your existing MERN app.',
};

export const mockQuestions = [
  {
    id: 'q1',
    category: 'DSA',
    difficulty: 'Hard',
    bookmarked: true,
    title: 'Design an *LRU cache* with O(1) operations.',
    body:
      'Implement get and put methods with eviction when capacity is reached. Explain your choice of data structures.',
    companies: 'Amazon · Google · Meta',
    time: '25 min',
  },
  {
    id: 'q2',
    category: 'System Design',
    difficulty: 'Hard',
    bookmarked: false,
    title: 'Design a *URL shortener* like bit.ly.',
    body:
      "Walk through high-level architecture, database schema, hashing strategy, and how you'd handle 100M URLs/month.",
    companies: 'Razorpay · Flipkart',
    time: '45 min',
  },
  {
    id: 'q3',
    category: 'Behavioral',
    difficulty: 'Easy',
    bookmarked: true,
    title: 'Tell me about a time you *disagreed* with a team member.',
    body: 'Use the STAR framework. Focus on resolution, not the conflict. Show emotional intelligence.',
    companies: 'All companies',
    time: '5 min',
  },
  {
    id: 'q4',
    category: 'Frontend',
    difficulty: 'Medium',
    bookmarked: false,
    title: 'Explain the React *rendering lifecycle* with hooks.',
    body:
      'Walk through mount, update, and unmount phases. Compare to class components. When does useEffect actually run?',
    companies: 'Atlassian · Freshworks',
    time: '15 min',
  },
  {
    id: 'q5',
    category: 'Backend',
    difficulty: 'Medium',
    bookmarked: false,
    title: "What's the difference between *JWT* and session-based auth?",
    body:
      "Cover stateless vs stateful, scaling implications, security tradeoffs, and when you'd use each.",
    companies: 'Razorpay · CRED',
    time: '10 min',
  },
  {
    id: 'q6',
    category: 'DSA',
    difficulty: 'Medium',
    bookmarked: true,
    title: 'Find the *kth largest element* in an unsorted array.',
    body:
      'Discuss multiple approaches: sort, heap, quickselect. Analyze time/space complexity for each.',
    companies: 'Amazon · Microsoft',
    time: '20 min',
  },
];

export const QB_FILTERS = [
  'All',
  'Frontend',
  'Backend',
  'DSA',
  'System Design',
  'Behavioral',
  'DBMS',
  'OS',
  'Networks',
  'Amazon',
  'Razorpay',
  'Flipkart',
];

export const mockPrepPlan = {
  days: [
    { label: 'Mon', num: 14, status: 'done' },
    { label: 'Tue', num: 15, status: 'done' },
    { label: 'Wed', num: 16, status: 'today' },
    { label: 'Thu', num: 17, status: 'upcoming' },
    { label: 'Fri', num: 18, status: 'upcoming' },
    { label: 'Sat', num: 19, status: 'upcoming' },
    { label: 'Sun', num: 20, status: 'upcoming' },
  ],
  tasks: [
    {
      id: 'p1',
      done: true,
      title: 'Solve 3 DP problems (Medium)',
      body: 'LeetCode #198, #300, #322 — each with dry-run notes in your log',
      duration: '45 min',
      priority: false,
    },
    {
      id: 'p2',
      done: true,
      title: 'Read System Design: Load Balancers',
      body: 'Cover L4 vs L7, consistent hashing, health checks',
      duration: '20 min',
      priority: false,
    },
    {
      id: 'p3',
      done: false,
      title: 'Mock interview: Backend Technical (Medium)',
      body: '30-min session covering REST APIs, DB design, and one DSA question',
      duration: '30 min · High priority',
      priority: true,
    },
    {
      id: 'p4',
      done: false,
      title: 'Rewrite 2 resume bullets with metrics',
      body: 'Focus on your EduSports internship — add quantified impact',
      duration: '15 min',
      priority: false,
    },
    {
      id: 'p5',
      done: false,
      title: 'Review 10 flashcards (DBMS)',
      body: 'Spaced repetition: normalization, indexes, ACID properties',
      duration: '10 min',
      priority: false,
    },
  ],
};

export const interviewSetupDefaults = {
  mode: 'voice', // text | voice | video
  role: 'sde',
  round: 'technical',
  level: 'fresher',
  difficulty: 'medium',
};

export const mockInterviewSession = {
  elapsed: '12:34',
  topicsCovered: [
    { name: 'JavaScript basics', done: true },
    { name: 'Scoping & hoisting', done: true },
    { name: 'React lifecycle', done: false },
    { name: 'API design', done: false },
    { name: 'DSA problem', done: false },
  ],
  questionsCovered: 4,
  questionsTotal: 10,
  liveScore: 8.2,
  messages: [
    {
      id: 'm1',
      role: 'ai',
      html: `Hi Piyush! I'll be your interviewer today. We'll cover JavaScript fundamentals, React, backend concepts, and one quick DSA problem. Let's start easy.<br/><br/><strong>Question 1:</strong> Can you explain the difference between <code>let</code>, <code>const</code>, and <code>var</code> in JavaScript? Tell me when you'd use each.`,
    },
    {
      id: 'm2',
      role: 'user',
      html: `Sure. <code>var</code> is function-scoped and gets hoisted with undefined. <code>let</code> and <code>const</code> are block-scoped and exist in the temporal dead zone until declared. I'd use <code>const</code> by default, <code>let</code> when I need reassignment, and never use <code>var</code> in modern code.`,
    },
    {
      id: 'm3',
      role: 'ai',
      html: 'Good, clear answer. You covered scoping and the TDZ.',
      feedback: {
        rating: '8/10 — Strong',
        tags: '✓ Complete · ✓ Accurate',
        great: 'Clear mental model, correct terminology, practical guidance.',
        sharper:
          "Mention that <code>const</code> doesn't mean immutable — objects/arrays can still be mutated.",
        followup:
          'You mentioned TDZ. What happens if I try to access a <code>let</code> variable before its declaration line? Why does this differ from <code>var</code>?',
      },
    },
  ],
};

export const mockReport = {
  meta: 'SDE · Technical · Medium · 32 minutes · 10 questions',
  overallScore: 7.8,
  attempted: '10/10',
  radar: {
    labels: ['JavaScript', 'React', 'APIs', 'System Design', 'DSA', 'Communication'],
    you: [9, 8.5, 8, 5, 6.5, 9],
    target: [7, 7, 7, 7, 7, 7],
  },
  strengths: [
    'Strong on JavaScript fundamentals and React',
    'Clear communication and structured answers',
    'Good use of concrete examples',
    'Solid understanding of REST API design',
  ],
  growth: [
    'System design — you fumbled scalability',
    'Database indexing concepts need work',
    'DSA — your DP approach was brute force',
    'Sometimes rushes without confirming the question',
  ],
  nextSteps: [
    { icon: '📚', title: 'Study: System Design basics', body: 'Load balancing, caching, CAP theorem. 2 hrs.' },
    { icon: '💻', title: 'Drill: 5 DP problems (Medium)', body: 'Focus on memoization → tabulation. 2 hrs.' },
    { icon: '🔁', title: 'Retake: System Design round', body: 'Within 48 hours. Difficulty: adaptive.' },
  ],
};
