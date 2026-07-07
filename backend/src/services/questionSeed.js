import { Question } from '../models/Question.js';

// Curated dataset — at least 30 original questions per category, written in
// our own words. Topic coverage is intentionally canonical (what every
// interview resource covers) so prep plans and practice are universally
// useful. We do NOT copy wording from any specific sheet or site.

const SEED_QUESTIONS = [
  // ════════════════════════════════════════════════════════════════════
  // DSA (32)
  // ════════════════════════════════════════════════════════════════════
  { title: 'Design an *LRU cache* with O(1) operations.', body: 'Implement get and put with eviction at capacity. Justify your data structure choice.', category: 'DSA', difficulty: 'Hard', companies: ['Amazon', 'Google', 'Meta'], timeEstimate: '25 min', referenceUrl: 'https://leetcode.com/problems/lru-cache/' },
  { title: 'Find the *kth largest element* in an unsorted array.', body: 'Compare sort, heap, and quickselect. State time/space for each.', category: 'DSA', difficulty: 'Medium', companies: ['Amazon', 'Microsoft'], timeEstimate: '20 min', referenceUrl: 'https://leetcode.com/problems/kth-largest-element-in-an-array/' },
  { title: 'Detect a *cycle in a linked list.*', body: "Use Floyd's tortoise-and-hare. Prove correctness and find the cycle start.", category: 'DSA', difficulty: 'Medium', companies: ['Amazon', 'Microsoft', 'Flipkart'], timeEstimate: '15 min', referenceUrl: 'https://leetcode.com/problems/linked-list-cycle/' },
  { title: '*Longest Increasing Subsequence* — O(n²) and O(n log n).', body: 'Start with DP, then optimize using patience sort + binary search.', category: 'DSA', difficulty: 'Hard', companies: ['Google', 'Microsoft'], timeEstimate: '30 min', referenceUrl: 'https://leetcode.com/problems/longest-increasing-subsequence/' },
  { title: 'Serialize and *deserialize a binary tree.*', body: 'Pick preorder or BFS. Handle nulls. Reconstruct the exact structure.', category: 'DSA', difficulty: 'Hard', companies: ['Amazon', 'Meta', 'Microsoft'], timeEstimate: '25 min', referenceUrl: 'https://leetcode.com/problems/serialize-and-deserialize-binary-tree/' },
  { title: '*Two sum* — return indices that add to target.', body: 'Brute force first, then hashmap to O(n). Handle overflow and duplicates.', category: 'DSA', difficulty: 'Easy', companies: ['Amazon', 'Google', 'Razorpay'], timeEstimate: '10 min', referenceUrl: 'https://leetcode.com/problems/two-sum/' },
  { title: 'Coin change — *minimum coins* to make an amount.', body: 'Top-down vs bottom-up DP. Explain why greedy fails.', category: 'DSA', difficulty: 'Medium', companies: ['Amazon', 'Flipkart'], timeEstimate: '20 min', referenceUrl: 'https://leetcode.com/problems/coin-change/' },
  { title: '*Median* of two sorted arrays.', body: 'Target O(log(min(m,n))) via binary search on the shorter array.', category: 'DSA', difficulty: 'Hard', companies: ['Google', 'Meta'], timeEstimate: '35 min', referenceUrl: 'https://leetcode.com/problems/median-of-two-sorted-arrays/' },
  { title: 'Reverse a *linked list* in place.', body: 'Iterative and recursive. Track prev, curr, next pointers cleanly.', category: 'DSA', difficulty: 'Easy', companies: ['Amazon', 'Microsoft', 'Flipkart'], timeEstimate: '10 min', referenceUrl: 'https://leetcode.com/problems/reverse-linked-list/' },
  { title: 'Merge two *sorted linked lists.*', body: 'Dummy-head pattern. Handle the remaining tail. Watch for leaks.', category: 'DSA', difficulty: 'Easy', companies: ['Amazon', 'Microsoft'], timeEstimate: '10 min', referenceUrl: 'https://leetcode.com/problems/merge-two-sorted-lists/' },
  { title: 'Validate a string of *balanced parentheses.*', body: 'Use a stack. Support (), [], {}. Handle empty and mixed cases.', category: 'DSA', difficulty: 'Easy', companies: ['Amazon', 'Google'], timeEstimate: '10 min', referenceUrl: 'https://leetcode.com/problems/valid-parentheses/' },
  { title: 'Implement a *min stack* with O(1) getMin.', body: 'Pair each pushed value with the running min, or use an auxiliary stack.', category: 'DSA', difficulty: 'Medium', companies: ['Amazon', 'Meta'], timeEstimate: '15 min', referenceUrl: 'https://leetcode.com/problems/min-stack/' },
  { title: 'Count *number of islands* in a 2D grid.', body: 'DFS or BFS from each unvisited land cell. Beware of diagonal vs orthogonal.', category: 'DSA', difficulty: 'Medium', companies: ['Amazon', 'Meta', 'Flipkart'], timeEstimate: '20 min', referenceUrl: 'https://leetcode.com/problems/number-of-islands/' },
  { title: '*Course schedule* — can you finish all courses?', body: 'Detect a cycle in a directed prerequisite graph using topological sort.', category: 'DSA', difficulty: 'Medium', companies: ['Google', 'Amazon'], timeEstimate: '20 min', referenceUrl: 'https://leetcode.com/problems/course-schedule/' },
  { title: 'Generate all *subsets* of an integer array.', body: 'Backtracking or iterative bit-enumeration. Discuss 2^n explosion.', category: 'DSA', difficulty: 'Medium', companies: ['Amazon', 'Meta'], timeEstimate: '15 min', referenceUrl: 'https://leetcode.com/problems/subsets/' },
  { title: 'All *permutations* of a string with duplicates.', body: 'Backtracking with sort+skip, or counter-based pruning.', category: 'DSA', difficulty: 'Medium', companies: ['Amazon', 'Microsoft'], timeEstimate: '20 min', referenceUrl: 'https://leetcode.com/problems/permutations-ii/' },
  { title: '*N-queens* — place N non-attacking queens.', body: 'Backtracking with column/diagonal bitmasks for fast conflict checks.', category: 'DSA', difficulty: 'Hard', companies: ['Microsoft', 'Google'], timeEstimate: '30 min', referenceUrl: 'https://leetcode.com/problems/n-queens/' },
  { title: 'Build and use a *trie* for word lookup.', body: 'Insert + search + startsWith. Node children as Map or array.', category: 'DSA', difficulty: 'Medium', companies: ['Amazon', 'Meta'], timeEstimate: '20 min', referenceUrl: 'https://leetcode.com/problems/implement-trie-prefix-tree/' },
  { title: '*Word search* in a 2D board.', body: 'DFS with a visited set. Prune when the prefix has no matches.', category: 'DSA', difficulty: 'Medium', companies: ['Amazon', 'Meta'], timeEstimate: '20 min', referenceUrl: 'https://leetcode.com/problems/word-search/' },
  { title: '*Top K frequent elements* in an array.', body: 'Heap in O(n log k) or bucket sort in O(n). Pick and justify.', category: 'DSA', difficulty: 'Medium', companies: ['Amazon', 'Flipkart'], timeEstimate: '15 min', referenceUrl: 'https://leetcode.com/problems/top-k-frequent-elements/' },
  { title: 'Merge *K sorted lists* efficiently.', body: 'Min-heap of list heads for O(N log k). Discuss pairwise alternative.', category: 'DSA', difficulty: 'Hard', companies: ['Amazon', 'Google'], timeEstimate: '25 min', referenceUrl: 'https://leetcode.com/problems/merge-k-sorted-lists/' },
  { title: '*Sliding window maximum* for window size K.', body: 'Deque of indices, pop smaller-from-back, pop out-of-window from front.', category: 'DSA', difficulty: 'Hard', companies: ['Google', 'Meta'], timeEstimate: '25 min', referenceUrl: 'https://leetcode.com/problems/sliding-window-maximum/' },
  { title: '*Longest substring without repeating characters.*', body: 'Sliding window with a last-seen map. O(n) single pass.', category: 'DSA', difficulty: 'Medium', companies: ['Amazon', 'Microsoft'], timeEstimate: '15 min', referenceUrl: 'https://leetcode.com/problems/longest-substring-without-repeating-characters/' },
  { title: '*Trapping rainwater* between bars.', body: 'Two-pointer O(n). Explain the "limited by min of max-left/right" insight.', category: 'DSA', difficulty: 'Hard', companies: ['Amazon', 'Google'], timeEstimate: '25 min', referenceUrl: 'https://leetcode.com/problems/trapping-rain-water/' },
  { title: "*Maximum subarray sum* — Kadane's algorithm.", body: 'Track current and best running sum. Handle all-negative edge case.', category: 'DSA', difficulty: 'Easy', companies: ['Amazon', 'Flipkart'], timeEstimate: '10 min', referenceUrl: 'https://leetcode.com/problems/maximum-subarray/' },
  { title: '*Edit distance* between two strings.', body: 'Classic 2D DP. Define recurrence for insert/delete/replace.', category: 'DSA', difficulty: 'Hard', companies: ['Google', 'Microsoft'], timeEstimate: '30 min', referenceUrl: 'https://leetcode.com/problems/edit-distance/' },
  { title: '*0/1 Knapsack* — maximize value under a weight limit.', body: 'Bottom-up DP on (item, capacity). Space-optimize to 1D.', category: 'DSA', difficulty: 'Medium', companies: ['Amazon', 'Flipkart'], timeEstimate: '20 min', referenceUrl: 'https://leetcode.com/problems/partition-equal-subset-sum/' },
  { title: '*House robber* — pick non-adjacent values.', body: 'DP: dp[i] = max(dp[i-1], dp[i-2]+nums[i]). O(1) space possible.', category: 'DSA', difficulty: 'Easy', companies: ['Amazon'], timeEstimate: '10 min', referenceUrl: 'https://leetcode.com/problems/house-robber/' },
  { title: '*Unique paths* in an m × n grid.', body: 'DP or combinatorics (C(m+n-2, m-1)). Compare trade-offs.', category: 'DSA', difficulty: 'Medium', companies: ['Amazon', 'Google'], timeEstimate: '15 min', referenceUrl: 'https://leetcode.com/problems/unique-paths/' },
  { title: '*Rotate a matrix* 90° in place.', body: 'Transpose, then reverse each row. Draw it out to prove correctness.', category: 'DSA', difficulty: 'Medium', companies: ['Amazon', 'Microsoft'], timeEstimate: '15 min', referenceUrl: 'https://leetcode.com/problems/rotate-image/' },
  { title: '*Binary search* on a rotated sorted array.', body: 'Determine which half is sorted at each step. Watch equal pivot.', category: 'DSA', difficulty: 'Medium', companies: ['Amazon', 'Microsoft'], timeEstimate: '20 min', referenceUrl: 'https://leetcode.com/problems/search-in-rotated-sorted-array/' },
  { title: '*Lowest common ancestor* in a binary tree.', body: 'Post-order recursion. Also solve for BST in O(h).', category: 'DSA', difficulty: 'Medium', companies: ['Amazon', 'Google', 'Meta'], timeEstimate: '20 min', referenceUrl: 'https://leetcode.com/problems/lowest-common-ancestor-of-a-binary-tree/' },

  // ════════════════════════════════════════════════════════════════════
  // System Design (30)
  // ════════════════════════════════════════════════════════════════════
  { title: 'Design a *URL shortener* like bit.ly.', body: 'Hashing strategy, schema, read-vs-write traffic, 100M URLs/month.', category: 'System Design', difficulty: 'Hard', companies: ['Razorpay', 'Flipkart'], timeEstimate: '45 min' },
  { title: 'Design a *rate limiter* for a public API.', body: 'Token bucket vs leaky bucket. Multi-server counter storage.', category: 'System Design', difficulty: 'Hard', companies: ['Razorpay', 'CRED', 'Amazon'], timeEstimate: '40 min' },
  { title: 'Design a *real-time chat* like WhatsApp.', body: 'Delivery guarantees, presence, WebSocket vs long-poll, media storage.', category: 'System Design', difficulty: 'Hard', companies: ['Meta', 'Flipkart'], timeEstimate: '45 min' },
  { title: 'Design a *news feed* (Twitter/Instagram style).', body: 'Fan-out on write vs read. Caching, celebrity user pattern.', category: 'System Design', difficulty: 'Hard', companies: ['Meta', 'Amazon'], timeEstimate: '45 min' },
  { title: 'Design a *payment gateway* integration.', body: 'Idempotency keys, webhook reliability, reconciliation flow.', category: 'System Design', difficulty: 'Medium', companies: ['Razorpay', 'CRED', 'PhonePe'], timeEstimate: '35 min' },
  { title: 'Design *Instagram* — photos, feed, follows.', body: 'Image pipeline, timeline generation, sharding by userId.', category: 'System Design', difficulty: 'Hard', companies: ['Meta', 'Flipkart'], timeEstimate: '45 min' },
  { title: 'Design *Uber* — matching riders with drivers.', body: 'Geo-indexing, surge, real-time location updates, ETA.', category: 'System Design', difficulty: 'Hard', companies: ['Uber', 'Swiggy', 'Ola'], timeEstimate: '45 min' },
  { title: 'Design *Dropbox / Google Drive* file sync.', body: 'Chunking, deltas, conflict resolution, metadata vs blobs.', category: 'System Design', difficulty: 'Hard', companies: ['Dropbox', 'Google'], timeEstimate: '45 min' },
  { title: 'Design *YouTube* — upload, encode, stream.', body: 'Adaptive bitrate, CDN, transcoding pipeline, storage tiers.', category: 'System Design', difficulty: 'Hard', companies: ['Google', 'Amazon'], timeEstimate: '45 min' },
  { title: 'Design *Netflix* — content delivery at scale.', body: 'Open Connect CDN, personalization, offline downloads.', category: 'System Design', difficulty: 'Hard', companies: ['Netflix', 'Amazon'], timeEstimate: '45 min' },
  { title: 'Design *Twitter timeline* — push vs pull fan-out.', body: 'Hybrid strategy, inbox table, celebrity handling.', category: 'System Design', difficulty: 'Hard', companies: ['Meta', 'Twitter'], timeEstimate: '40 min' },
  { title: 'Design *Slack / Discord* — channels and presence.', body: 'Channel sharding, message ordering, WS fan-out.', category: 'System Design', difficulty: 'Medium', companies: ['Slack', 'Meta'], timeEstimate: '35 min' },
  { title: 'Design a *distributed cache* like Redis.', body: 'Consistent hashing, eviction, replication, client routing.', category: 'System Design', difficulty: 'Hard', companies: ['Amazon', 'Google'], timeEstimate: '45 min' },
  { title: 'Design a *job scheduler* at scale.', body: 'Cron-like DSL, idempotency, at-least-once vs exactly-once.', category: 'System Design', difficulty: 'Medium', companies: ['Razorpay', 'Amazon'], timeEstimate: '35 min' },
  { title: 'Design a *notification system* (email + push + SMS).', body: 'Priority queues, retries, user preferences, rate limits.', category: 'System Design', difficulty: 'Medium', companies: ['Razorpay', 'Flipkart'], timeEstimate: '35 min' },
  { title: 'Design an *e-commerce checkout* with inventory.', body: 'Reservation, idempotent orders, payment handoff, failure rollback.', category: 'System Design', difficulty: 'Hard', companies: ['Flipkart', 'Amazon'], timeEstimate: '40 min' },
  { title: 'Design a *search autocomplete* (typeahead).', body: 'Trie, ranking, debounce, cache hot prefixes on edge.', category: 'System Design', difficulty: 'Medium', companies: ['Google', 'Amazon'], timeEstimate: '30 min' },
  { title: 'Design a *web crawler* for a corpus.', body: 'Frontier queue, politeness, de-dup, distributed workers.', category: 'System Design', difficulty: 'Hard', companies: ['Google', 'Amazon'], timeEstimate: '40 min' },
  { title: 'Design a *leaderboard* for a multiplayer game.', body: 'Sorted sets (Redis), periodic snapshots, tie-breaking.', category: 'System Design', difficulty: 'Medium', companies: ['Dream11', 'Meta'], timeEstimate: '30 min' },
  { title: 'Design a *log aggregation* pipeline.', body: 'Agents, ingestion buffering, retention tiers, queryability.', category: 'System Design', difficulty: 'Medium', companies: ['Datadog', 'Amazon'], timeEstimate: '35 min' },
  { title: 'Design *Google Maps* routing and tile serving.', body: 'Graph routing algorithms, tile CDN, real-time traffic overlays.', category: 'System Design', difficulty: 'Hard', companies: ['Google'], timeEstimate: '45 min' },
  { title: 'Design *Zoom / video conferencing.*', body: 'SFU vs MCU, NAT traversal (STUN/TURN), bandwidth adaptation.', category: 'System Design', difficulty: 'Hard', companies: ['Zoom', 'Meta'], timeEstimate: '45 min' },
  { title: 'Design a *collaborative doc editor* like Google Docs.', body: 'OT vs CRDT, cursor presence, operational transforms on trees.', category: 'System Design', difficulty: 'Hard', companies: ['Google', 'Atlassian'], timeEstimate: '45 min' },
  { title: 'Design a *metrics / monitoring* system.', body: 'Time-series DB, push vs pull agents, rollup and downsampling.', category: 'System Design', difficulty: 'Medium', companies: ['Datadog', 'Amazon'], timeEstimate: '35 min' },
  { title: 'Design a *feature flag* service.', body: 'Targeting rules, real-time propagation, kill-switch semantics.', category: 'System Design', difficulty: 'Medium', companies: ['LaunchDarkly', 'Razorpay'], timeEstimate: '30 min' },
  { title: 'Design a *URL with analytics* — expand + click tracking.', body: 'Event ingest, async rollup, GDPR retention, real-time vs batch.', category: 'System Design', difficulty: 'Medium', companies: ['Amazon'], timeEstimate: '30 min' },
  { title: 'Design *Tinder* — matching, swipes, nearby.', body: 'Geo sharding, double opt-in, elasticsearch for discovery.', category: 'System Design', difficulty: 'Medium', companies: ['Tinder', 'Meta'], timeEstimate: '35 min' },
  { title: 'Design *Stack Overflow* — posts, votes, search.', body: 'Write amplification on hot posts, read replicas, tagging.', category: 'System Design', difficulty: 'Medium', companies: ['Stack Overflow'], timeEstimate: '30 min' },
  { title: 'Design an *ad bidding* real-time auction.', body: 'Latency budget (~100ms), RTB protocol, fraud detection.', category: 'System Design', difficulty: 'Hard', companies: ['Google', 'Meta'], timeEstimate: '45 min' },
  { title: 'Design *WhatsApp status* — ephemeral stories.', body: 'TTL storage, fan-out to contacts, view receipts.', category: 'System Design', difficulty: 'Medium', companies: ['Meta'], timeEstimate: '30 min' },

  // ════════════════════════════════════════════════════════════════════
  // Frontend (30)
  // ════════════════════════════════════════════════════════════════════
  { title: 'Explain the React *rendering lifecycle* with hooks.', body: 'Mount, update, unmount phases. When does useEffect actually fire?', category: 'Frontend', difficulty: 'Medium', companies: ['Atlassian', 'Freshworks'], timeEstimate: '15 min' },
  { title: 'How does *React.memo* differ from useMemo and useCallback?', body: 'What each memoizes, when to use which, common referential pitfalls.', category: 'Frontend', difficulty: 'Medium', companies: ['Atlassian', 'Zomato'], timeEstimate: '15 min' },
  { title: 'Implement a *debounce* hook from scratch.', body: 'Handle cleanup, changing delay, initial value. Test for races.', category: 'Frontend', difficulty: 'Medium', companies: ['Atlassian', 'Razorpay'], timeEstimate: '20 min' },
  { title: 'Explain *CSS specificity* and the cascade.', body: 'Resolution order, role of !important, CSS-in-JS trade-offs.', category: 'Frontend', difficulty: 'Easy', companies: ['Freshworks', 'Zomato'], timeEstimate: '10 min' },
  { title: 'What is the *virtual DOM* and why does it matter?', body: 'Compare direct DOM manipulation. Where reconciliation happens.', category: 'Frontend', difficulty: 'Easy', companies: ['Atlassian'], timeEstimate: '10 min' },
  { title: 'How does *useEffect* differ from useLayoutEffect?', body: 'Paint timing: useLayoutEffect runs synchronously after DOM mutations.', category: 'Frontend', difficulty: 'Medium', companies: ['Meta', 'Atlassian'], timeEstimate: '10 min' },
  { title: 'Explain *state lifting* with a concrete example.', body: 'Where to store state when two siblings need it. Prop drilling vs context.', category: 'Frontend', difficulty: 'Easy', companies: ['Atlassian'], timeEstimate: '10 min' },
  { title: 'Implement a custom *useFetch* hook with caching.', body: 'Request dedup, abort on unmount, cache keyed by URL.', category: 'Frontend', difficulty: 'Medium', companies: ['Razorpay', 'Atlassian'], timeEstimate: '20 min' },
  { title: 'When should you use *useReducer* over useState?', body: 'Complex state transitions, sequential updates, explicit action log.', category: 'Frontend', difficulty: 'Easy', companies: ['Atlassian'], timeEstimate: '10 min' },
  { title: 'How does React *reconciliation* decide to reuse a DOM node?', body: 'Element type + key equality. Why keys change behavior.', category: 'Frontend', difficulty: 'Medium', companies: ['Meta'], timeEstimate: '15 min' },
  { title: 'What are *keys* in React lists and why?', body: 'Stable identity across renders. Consequences of using index as key.', category: 'Frontend', difficulty: 'Easy', companies: ['Atlassian', 'Razorpay'], timeEstimate: '10 min' },
  { title: 'Explain *controlled vs uncontrolled* form inputs.', body: 'Where state lives, validation hooks, ref-based reads.', category: 'Frontend', difficulty: 'Easy', companies: ['Atlassian'], timeEstimate: '10 min' },
  { title: 'How do you implement *lazy loading* of routes?', body: 'React.lazy + Suspense + dynamic import. Vite code splitting.', category: 'Frontend', difficulty: 'Medium', companies: ['Razorpay'], timeEstimate: '15 min' },
  { title: 'What is *code splitting* and how does Vite do it?', body: 'Automatic per-route chunks, manualChunks, prefetch hints.', category: 'Frontend', difficulty: 'Medium', companies: ['Atlassian'], timeEstimate: '15 min' },
  { title: 'Compare *Redux, Zustand, and Context API*.', body: 'Re-render cost, devtools, middleware, mental overhead.', category: 'Frontend', difficulty: 'Medium', companies: ['Razorpay', 'Zomato'], timeEstimate: '15 min' },
  { title: 'Explain *CSS Grid* vs Flexbox — when to use each.', body: '1D layout vs 2D, intrinsic content sizing, nesting patterns.', category: 'Frontend', difficulty: 'Easy', companies: ['Freshworks'], timeEstimate: '10 min' },
  { title: 'Walk through the *browser render pipeline*.', body: 'HTML/CSS parse → DOM/CSSOM → layout → paint → composite.', category: 'Frontend', difficulty: 'Medium', companies: ['Google', 'Meta'], timeEstimate: '15 min' },
  { title: 'What is *layout thrashing* and how do you avoid it?', body: 'Interleaved read/write causing forced reflow. Batch DOM reads.', category: 'Frontend', difficulty: 'Medium', companies: ['Google'], timeEstimate: '15 min' },
  { title: 'Explain *event bubbling* and stopPropagation.', body: 'Capture vs bubble phase. Delegation on a parent.', category: 'Frontend', difficulty: 'Easy', companies: ['Atlassian'], timeEstimate: '10 min' },
  { title: 'How do you make a website *accessible* — concrete wins.', body: 'Semantic tags, keyboard nav, focus rings, alt text, contrast.', category: 'Frontend', difficulty: 'Medium', companies: ['Atlassian', 'Microsoft'], timeEstimate: '15 min' },
  { title: 'Explain *ARIA* roles — when do you actually need them?', body: 'Prefer semantic HTML first. ARIA only for custom widgets.', category: 'Frontend', difficulty: 'Medium', companies: ['Atlassian'], timeEstimate: '15 min' },
  { title: 'How does *SSR* differ from CSR and SSG?', body: 'Rendering time, SEO, hydration cost, cache behavior.', category: 'Frontend', difficulty: 'Medium', companies: ['Razorpay', 'Zomato'], timeEstimate: '15 min' },
  { title: 'What is *hydration* and why can it mismatch?', body: 'Server markup vs client render, Math.random / Date.now pitfalls.', category: 'Frontend', difficulty: 'Medium', companies: ['Razorpay'], timeEstimate: '15 min' },
  { title: 'How do you *memoize expensive renders* in a big table?', body: 'React.memo on rows, windowing (react-window), stable callback refs.', category: 'Frontend', difficulty: 'Medium', companies: ['Atlassian'], timeEstimate: '15 min' },
  { title: 'Implement *infinite scroll* with IntersectionObserver.', body: 'Sentinel div, preload ahead, avoid re-entry on rapid scroll.', category: 'Frontend', difficulty: 'Medium', companies: ['Meta', 'Razorpay'], timeEstimate: '20 min' },
  { title: 'Explain *Content Security Policy* and XSS mitigation.', body: 'script-src sources, nonce-based CSP, inline-script risks.', category: 'Frontend', difficulty: 'Medium', companies: ['Razorpay', 'Google'], timeEstimate: '15 min' },
  { title: 'What is *CORS* and how do preflight requests work?', body: 'Simple vs non-simple, OPTIONS preflight, credentials mode.', category: 'Frontend', difficulty: 'Medium', companies: ['Razorpay'], timeEstimate: '15 min' },
  { title: 'Write a *custom hook* for dark/light theme with localStorage.', body: 'Default to system preference, persist choice, sync across tabs.', category: 'Frontend', difficulty: 'Easy', companies: ['Atlassian'], timeEstimate: '15 min' },
  { title: 'Explain *React Suspense* and concurrent features.', body: 'Suspense boundaries, transitions, useDeferredValue in practice.', category: 'Frontend', difficulty: 'Hard', companies: ['Meta'], timeEstimate: '20 min' },
  { title: 'What is *tree shaking* and what prevents it?', body: 'ESM side-effects, sideEffects in package.json, CJS requires.', category: 'Frontend', difficulty: 'Medium', companies: ['Razorpay'], timeEstimate: '15 min' },

  // ════════════════════════════════════════════════════════════════════
  // Backend (30)
  // ════════════════════════════════════════════════════════════════════
  { title: "What's the difference between *JWT* and session-based auth?", body: 'Stateless vs stateful, scaling, security, when to pick each.', category: 'Backend', difficulty: 'Medium', companies: ['Razorpay', 'CRED'], timeEstimate: '10 min' },
  { title: 'How do you handle *idempotency* in payment APIs?', body: 'Idempotency keys, dedup windows, return the original response on retries.', category: 'Backend', difficulty: 'Medium', companies: ['Razorpay', 'PhonePe'], timeEstimate: '15 min' },
  { title: 'Compare *SQL vs NoSQL* for a new product.', body: 'Schema flexibility, consistency, joins, sharding.', category: 'Backend', difficulty: 'Medium', companies: ['Flipkart', 'Amazon'], timeEstimate: '15 min' },
  { title: 'Explain *OAuth 2.0* authorization code flow.', body: 'authorize → code → token → refresh. What PKCE solves.', category: 'Backend', difficulty: 'Medium', companies: ['Razorpay', 'CRED'], timeEstimate: '15 min' },
  { title: 'How does the *Node.js event loop* actually run?', body: 'Phases (timers, poll, check, close). Micro vs macrotasks.', category: 'Backend', difficulty: 'Medium', companies: ['Razorpay', 'Zomato'], timeEstimate: '15 min' },
  { title: 'Explain *RESTful API* design principles.', body: 'Verbs, resources, status codes, HATEOAS in practice.', category: 'Backend', difficulty: 'Easy', companies: ['Razorpay'], timeEstimate: '10 min' },
  { title: 'When would you use *GraphQL* over REST?', body: 'Client-driven queries, over/under-fetching, N+1 server cost.', category: 'Backend', difficulty: 'Medium', companies: ['Atlassian'], timeEstimate: '15 min' },
  { title: 'What is *middleware* in Express and how is it ordered?', body: 'Next()-chain, error-handling middleware signature, short-circuiting.', category: 'Backend', difficulty: 'Easy', companies: ['Razorpay'], timeEstimate: '10 min' },
  { title: 'Explain *connection pooling* and its tuning.', body: 'Max pool size, idle timeout, driver-level defaults, overflow behavior.', category: 'Backend', difficulty: 'Medium', companies: ['Amazon'], timeEstimate: '15 min' },
  { title: 'How do you handle the *N+1 query problem* in an ORM?', body: 'Eager loading, DataLoader, projection, batching strategies.', category: 'Backend', difficulty: 'Medium', companies: ['Atlassian', 'Amazon'], timeEstimate: '15 min' },
  { title: 'Explain *database transactions* and when to use them.', body: 'ACID guarantees, begin/commit/rollback, nested/savepoints.', category: 'Backend', difficulty: 'Medium', companies: ['Razorpay'], timeEstimate: '15 min' },
  { title: 'How does *HTTPS* work — the TLS handshake in one minute.', body: 'ClientHello, cert, key agreement, symmetric session key.', category: 'Backend', difficulty: 'Medium', companies: ['Razorpay', 'Amazon'], timeEstimate: '10 min' },
  { title: 'What is *CORS* and how do you configure it correctly?', body: 'Origin reflection, credentials mode, preflight semantics.', category: 'Backend', difficulty: 'Medium', companies: ['Razorpay'], timeEstimate: '10 min' },
  { title: 'Explain *WebSockets* vs Server-Sent Events vs polling.', body: 'Bidirectional vs one-way, reconnect, proxy quirks.', category: 'Backend', difficulty: 'Medium', companies: ['Meta', 'Slack'], timeEstimate: '15 min' },
  { title: 'How do you implement *file uploads* safely at scale?', body: 'Chunked multipart, virus scan, signed URLs, max size checks.', category: 'Backend', difficulty: 'Medium', companies: ['Dropbox', 'Flipkart'], timeEstimate: '20 min' },
  { title: 'Explain *API versioning* strategies.', body: 'URL path, custom header, media type. When to deprecate.', category: 'Backend', difficulty: 'Medium', companies: ['Amazon'], timeEstimate: '15 min' },
  { title: 'What is *eventual consistency* and when is it acceptable?', body: 'Conflict resolution, user-visible staleness, CRDTs / LWW.', category: 'Backend', difficulty: 'Medium', companies: ['Amazon', 'Meta'], timeEstimate: '15 min' },
  { title: 'How does *message queuing* (Kafka, RabbitMQ) differ from HTTP?', body: 'Durability, ordering, at-least-once, consumer groups.', category: 'Backend', difficulty: 'Medium', companies: ['Razorpay', 'Amazon'], timeEstimate: '15 min' },
  { title: 'Explain *caching layers* — browser, CDN, app, DB.', body: 'Where hits terminate, invalidation, TTL vs versioned keys.', category: 'Backend', difficulty: 'Medium', companies: ['Amazon'], timeEstimate: '15 min' },
  { title: 'How do you *rate limit* an endpoint?', body: 'Token bucket / sliding window. Store in Redis. Key by user or IP.', category: 'Backend', difficulty: 'Medium', companies: ['Razorpay', 'CRED'], timeEstimate: '15 min' },
  { title: 'What is *service discovery* in microservices?', body: 'Client-side vs server-side, health checks, Consul/Eureka.', category: 'Backend', difficulty: 'Medium', companies: ['Amazon', 'Flipkart'], timeEstimate: '15 min' },
  { title: 'Explain *blue-green deployments* and canary releases.', body: 'Instant cutover vs gradual, rollback strategy, flag gating.', category: 'Backend', difficulty: 'Medium', companies: ['Amazon'], timeEstimate: '15 min' },
  { title: 'How do you secure *API keys* in a public mobile/web app?', body: 'Short-lived tokens, proxy servers, never embed secrets client-side.', category: 'Backend', difficulty: 'Medium', companies: ['Razorpay'], timeEstimate: '15 min' },
  { title: 'What is the difference between *authentication and authorization*?', body: 'Who you are vs what you can do. Common mistakes mixing them up.', category: 'Backend', difficulty: 'Easy', companies: ['Razorpay', 'Amazon'], timeEstimate: '10 min' },
  { title: 'How do you prevent *SQL injection* in Node/Express?', body: 'Parameterized queries, ORM escaping, never concat user input.', category: 'Backend', difficulty: 'Easy', companies: ['Razorpay'], timeEstimate: '10 min' },
  { title: 'Explain *input validation* — where and how?', body: 'Validate at boundary (schema/zod), trust nothing from client.', category: 'Backend', difficulty: 'Easy', companies: ['Razorpay'], timeEstimate: '10 min' },
  { title: 'How do you design a *webhook receiver*?', body: 'Signature verification, retry idempotency, at-least-once delivery.', category: 'Backend', difficulty: 'Medium', companies: ['Razorpay', 'CRED'], timeEstimate: '15 min' },
  { title: 'What is *CSRF* and how do you defend against it?', body: 'Same-site cookies, CSRF tokens, double-submit pattern.', category: 'Backend', difficulty: 'Medium', companies: ['Razorpay'], timeEstimate: '15 min' },
  { title: 'Explain *horizontal vs vertical scaling* of a backend.', body: 'When each makes sense, statefulness pitfalls, stateless design.', category: 'Backend', difficulty: 'Easy', companies: ['Amazon'], timeEstimate: '10 min' },
  { title: 'How do you profile and debug a *slow API endpoint*?', body: 'Flame graphs, APM traces, DB slow-query log, indexes.', category: 'Backend', difficulty: 'Medium', companies: ['Razorpay', 'Amazon'], timeEstimate: '15 min' },

  // ════════════════════════════════════════════════════════════════════
  // DBMS (30)
  // ════════════════════════════════════════════════════════════════════
  { title: 'Explain *database indexing* — B-tree vs hash.', body: 'Read/write trade-offs, composite index order, range scans.', category: 'DBMS', difficulty: 'Medium', companies: ['Amazon', 'Flipkart'], timeEstimate: '15 min' },
  { title: 'What are *ACID properties* and why do they matter?', body: 'Atomicity, Consistency, Isolation, Durability with examples.', category: 'DBMS', difficulty: 'Easy', companies: ['Amazon', 'Razorpay'], timeEstimate: '10 min' },
  { title: 'Explain *database normalization* up to 3NF.', body: 'Walk through 1NF → 2NF → 3NF. Then when to denormalize.', category: 'DBMS', difficulty: 'Medium', companies: ['Flipkart', 'Amazon'], timeEstimate: '15 min' },
  { title: 'Compare *primary, unique, and foreign keys*.', body: 'Integrity constraints, null rules, cascading actions.', category: 'DBMS', difficulty: 'Easy', companies: ['Amazon'], timeEstimate: '10 min' },
  { title: 'What is a *composite index* — when is column order critical?', body: 'Leftmost prefix rule, covering vs non-covering, selectivity.', category: 'DBMS', difficulty: 'Medium', companies: ['Amazon'], timeEstimate: '15 min' },
  { title: 'Explain *denormalization* — when is it worth the trade-off?', body: 'Read-heavy workloads, joins too expensive, sync cost.', category: 'DBMS', difficulty: 'Medium', companies: ['Flipkart'], timeEstimate: '15 min' },
  { title: 'Explain different *types of JOIN* — inner/left/right/full.', body: 'Draw Venn diagrams. Common mistakes. Performance notes.', category: 'DBMS', difficulty: 'Easy', companies: ['Amazon'], timeEstimate: '10 min' },
  { title: 'What is *query optimization* — how does the planner work?', body: 'Cost-based vs rule-based, EXPLAIN output, hints.', category: 'DBMS', difficulty: 'Medium', companies: ['Amazon', 'Google'], timeEstimate: '15 min' },
  { title: 'Explain *isolation levels* (Read Uncommitted → Serializable).', body: 'Dirty read / non-repeatable / phantom read examples.', category: 'DBMS', difficulty: 'Hard', companies: ['Amazon', 'Razorpay'], timeEstimate: '20 min' },
  { title: 'What is a *deadlock* in databases and how do you detect one?', body: 'Wait-for graph, lock timeouts, retry strategies.', category: 'DBMS', difficulty: 'Medium', companies: ['Amazon'], timeEstimate: '15 min' },
  { title: 'Compare *SQL vs NoSQL* — data model, consistency, scaling.', body: 'Schema rigidity, joins, horizontal shards, BASE vs ACID.', category: 'DBMS', difficulty: 'Medium', companies: ['Flipkart', 'Amazon'], timeEstimate: '15 min' },
  { title: "What is MongoDB's *aggregation pipeline*?", body: 'Stages ($match/$group/$project), index usage, allowDiskUse.', category: 'DBMS', difficulty: 'Medium', companies: ['Razorpay'], timeEstimate: '15 min' },
  { title: 'Explain *sharding* — horizontal splitting strategies.', body: 'Hash vs range vs directory. Re-sharding pain.', category: 'DBMS', difficulty: 'Hard', companies: ['Amazon', 'Meta'], timeEstimate: '20 min' },
  { title: 'What is *database replication* — master-slave vs multi-master?', body: 'Sync vs async, failover, read replicas, write amplification.', category: 'DBMS', difficulty: 'Medium', companies: ['Amazon'], timeEstimate: '15 min' },
  { title: 'Explain *CAP theorem* with real-DB examples.', body: 'Classify Postgres, Cassandra, DynamoDB. Network partition realities.', category: 'DBMS', difficulty: 'Medium', companies: ['Amazon'], timeEstimate: '15 min' },
  { title: 'What are *stored procedures* and triggers — when to avoid them?', body: 'Logic in DB vs app. Testability. Upgrade pain.', category: 'DBMS', difficulty: 'Easy', companies: ['Amazon'], timeEstimate: '10 min' },
  { title: 'Compare *OLTP vs OLAP* workloads.', body: 'Row vs column stores, read patterns, latency SLAs.', category: 'DBMS', difficulty: 'Easy', companies: ['Amazon'], timeEstimate: '10 min' },
  { title: 'How does a *B+ tree* differ from a B-tree in indexes?', body: 'Leaf linked list, range scan efficiency, internal vs leaf data.', category: 'DBMS', difficulty: 'Medium', companies: ['Amazon', 'Google'], timeEstimate: '15 min' },
  { title: 'Explain *Write-Ahead Logging* (WAL) in databases.', body: 'Durability guarantee, fsync cost, replication source.', category: 'DBMS', difficulty: 'Medium', companies: ['Amazon'], timeEstimate: '15 min' },
  { title: 'What is *serializable isolation* and why is it expensive?', body: 'Locking vs MVCC. Performance cliff on high contention.', category: 'DBMS', difficulty: 'Hard', companies: ['Amazon'], timeEstimate: '20 min' },
  { title: 'Explain *connection pool* exhaustion and how to handle it.', body: 'Symptoms, max pool size tuning, queueing vs dropping.', category: 'DBMS', difficulty: 'Medium', companies: ['Razorpay'], timeEstimate: '15 min' },
  { title: 'What is *eventual consistency* in NoSQL?', body: 'Read-your-writes, monotonic reads, quorum reads/writes.', category: 'DBMS', difficulty: 'Medium', companies: ['Amazon', 'Meta'], timeEstimate: '15 min' },
  { title: 'How do you *migrate* a schema safely in production?', body: 'Expand/contract pattern, backfills, feature flags, rollback plan.', category: 'DBMS', difficulty: 'Hard', companies: ['Amazon', 'Razorpay'], timeEstimate: '20 min' },
  { title: 'Explain *materialized views* and refresh strategies.', body: 'Incremental vs full refresh, stale reads, storage cost.', category: 'DBMS', difficulty: 'Medium', companies: ['Amazon'], timeEstimate: '15 min' },
  { title: 'What is a *covering index* — performance implications?', body: 'Index-only scan, trade-off vs write cost, clustering.', category: 'DBMS', difficulty: 'Medium', companies: ['Amazon', 'Google'], timeEstimate: '15 min' },
  { title: 'Compare *Mongo vs Postgres* for a social-media feed.', body: 'Read/write patterns, schema evolution, aggregation.', category: 'DBMS', difficulty: 'Medium', companies: ['Meta', 'Razorpay'], timeEstimate: '15 min' },
  { title: 'How do *transactions work* in MongoDB?', body: 'Multi-doc transactions, replica set only, performance cost.', category: 'DBMS', difficulty: 'Medium', companies: ['Razorpay'], timeEstimate: '15 min' },
  { title: 'Explain *database sharding* key choice pitfalls.', body: 'Hot shard, uneven distribution, cross-shard joins.', category: 'DBMS', difficulty: 'Hard', companies: ['Amazon'], timeEstimate: '20 min' },
  { title: 'What is *SQL injection* and how do ORMs prevent it?', body: 'Parameterized queries, bound parameters, edge cases with raw SQL.', category: 'DBMS', difficulty: 'Easy', companies: ['Razorpay'], timeEstimate: '10 min' },
  { title: 'Explain *hot partition* problem in DynamoDB / Mongo.', body: 'Key skew, request throttling, adaptive capacity, remedies.', category: 'DBMS', difficulty: 'Medium', companies: ['Amazon'], timeEstimate: '15 min' },

  // ════════════════════════════════════════════════════════════════════
  // OS (30)
  // ════════════════════════════════════════════════════════════════════
  { title: 'Process vs *thread* — key differences.', body: 'Memory, context-switch cost, when to pick each. Fibers / coroutines.', category: 'OS', difficulty: 'Easy', companies: ['Amazon', 'Microsoft'], timeEstimate: '10 min' },
  { title: 'What is a *deadlock* and how do you prevent it?', body: 'Four conditions. Prevention vs avoidance vs detection.', category: 'OS', difficulty: 'Medium', companies: ['Amazon', 'Microsoft'], timeEstimate: '15 min' },
  { title: 'Explain *virtual memory and paging.*', body: 'Page table, TLB, page faults. Why processes see contiguous memory.', category: 'OS', difficulty: 'Medium', companies: ['Microsoft', 'Google'], timeEstimate: '15 min' },
  { title: 'Compare *preemptive vs cooperative* scheduling.', body: 'Who decides when to switch. Starvation and latency implications.', category: 'OS', difficulty: 'Easy', companies: ['Microsoft'], timeEstimate: '10 min' },
  { title: 'Explain *CPU scheduling algorithms* (FCFS, SJF, RR, MLFQ).', body: 'Trade-offs. Why MLFQ is common in modern desktops.', category: 'OS', difficulty: 'Medium', companies: ['Microsoft', 'Amazon'], timeEstimate: '15 min' },
  { title: 'What are *system calls* and how do they transition to kernel?', body: 'Trap/interrupt, user vs kernel mode, overhead.', category: 'OS', difficulty: 'Medium', companies: ['Microsoft'], timeEstimate: '15 min' },
  { title: 'Explain *context switching* and its cost.', body: 'Register save/restore, TLB flush, cache pollution.', category: 'OS', difficulty: 'Medium', companies: ['Microsoft'], timeEstimate: '10 min' },
  { title: 'What is *thrashing* — how does it relate to page faults?', body: 'Working set exceeds RAM, excessive paging, thrash detection.', category: 'OS', difficulty: 'Medium', companies: ['Microsoft'], timeEstimate: '15 min' },
  { title: 'Compare *mutex, semaphore, and monitor*.', body: 'Binary vs counting, ownership, language-level constructs.', category: 'OS', difficulty: 'Medium', companies: ['Amazon'], timeEstimate: '15 min' },
  { title: 'Explain the *producer-consumer* problem and its solution.', body: 'Bounded buffer, counting semaphores, condition variables.', category: 'OS', difficulty: 'Medium', companies: ['Amazon'], timeEstimate: '15 min' },
  { title: 'What are *zombie* and *orphan* processes?', body: 'Exit status reaping, init adoption, fix strategies.', category: 'OS', difficulty: 'Easy', companies: ['Microsoft'], timeEstimate: '10 min' },
  { title: 'Explain *fork, exec, and wait* with an example.', body: 'Child process creation, image replacement, parent synchronization.', category: 'OS', difficulty: 'Medium', companies: ['Microsoft'], timeEstimate: '15 min' },
  { title: 'What is *copy-on-write* in fork()?', body: 'Shared pages marked read-only, trap on write triggers copy.', category: 'OS', difficulty: 'Medium', companies: ['Microsoft'], timeEstimate: '10 min' },
  { title: 'Explain *demand paging* vs pre-paging.', body: 'Lazy vs eager loading, latency trade-offs, prediction accuracy.', category: 'OS', difficulty: 'Medium', companies: ['Microsoft'], timeEstimate: '15 min' },
  { title: 'What is the *working set* model?', body: 'Pages actively used in a window. Guides allocation decisions.', category: 'OS', difficulty: 'Medium', companies: ['Microsoft'], timeEstimate: '10 min' },
  { title: 'Compare *LRU, FIFO, and Optimal* page replacement.', body: 'Locality of reference, Belady\'s anomaly, approximations.', category: 'OS', difficulty: 'Medium', companies: ['Microsoft', 'Amazon'], timeEstimate: '15 min' },
  { title: 'Explain *file system* structures — inodes, blocks.', body: 'Inode layout, direct/indirect blocks, directory as a file.', category: 'OS', difficulty: 'Medium', companies: ['Microsoft'], timeEstimate: '15 min' },
  { title: 'What is *journaling* in file systems?', body: 'Write-ahead log of metadata, recovery after crash, ordering modes.', category: 'OS', difficulty: 'Medium', companies: ['Microsoft'], timeEstimate: '15 min' },
  { title: 'Explain *memory-mapped files* (mmap).', body: 'Map file into address space. Lazy paging, shared memory IPC.', category: 'OS', difficulty: 'Medium', companies: ['Microsoft'], timeEstimate: '15 min' },
  { title: 'What is *synchronization* and why is it hard?', body: 'Atomicity, ordering, visibility. Race conditions + compiler reordering.', category: 'OS', difficulty: 'Medium', companies: ['Amazon', 'Microsoft'], timeEstimate: '15 min' },
  { title: 'Explain *atomic operations* at the CPU level.', body: 'CAS, test-and-set, fences. Lock-free data structures in practice.', category: 'OS', difficulty: 'Hard', companies: ['Amazon', 'Google'], timeEstimate: '20 min' },
  { title: 'What is *kernel preemption* — when does it matter?', body: 'Preemptible vs non-preemptible kernels, latency, real-time.', category: 'OS', difficulty: 'Hard', companies: ['Microsoft'], timeEstimate: '20 min' },
  { title: 'Explain *interrupt handling* — hardware vs software.', body: 'IRQ lines, ISR, top-half/bottom-half split.', category: 'OS', difficulty: 'Medium', companies: ['Microsoft'], timeEstimate: '15 min' },
  { title: 'What is *Direct Memory Access* (DMA)?', body: 'Device transfers memory without CPU. IOMMU protection.', category: 'OS', difficulty: 'Medium', companies: ['Microsoft'], timeEstimate: '10 min' },
  { title: 'Explain *user mode vs kernel mode*.', body: 'Privilege rings, why user code can\'t access hardware directly.', category: 'OS', difficulty: 'Easy', companies: ['Microsoft'], timeEstimate: '10 min' },
  { title: 'What is *virtualization* — hardware vs OS-level?', body: 'Hypervisors (type 1 vs 2), containers, trade-offs.', category: 'OS', difficulty: 'Medium', companies: ['Amazon'], timeEstimate: '15 min' },
  { title: 'Compare *containers vs VMs*.', body: 'Shared kernel vs full isolation. Density, boot time, security.', category: 'OS', difficulty: 'Easy', companies: ['Amazon', 'Google'], timeEstimate: '10 min' },
  { title: 'Explain *namespaces and cgroups* in Linux.', body: 'Namespaces isolate (PID/net/mnt), cgroups limit resources.', category: 'OS', difficulty: 'Medium', companies: ['Google'], timeEstimate: '15 min' },
  { title: 'What happens when you type `ls` in a shell?', body: 'fork/exec/wait, PATH lookup, TTY interaction.', category: 'OS', difficulty: 'Easy', companies: ['Amazon'], timeEstimate: '10 min' },
  { title: 'Explain *signals* — SIGKILL vs SIGTERM.', body: 'Catchable vs uncatchable, graceful shutdown handlers.', category: 'OS', difficulty: 'Easy', companies: ['Amazon'], timeEstimate: '10 min' },

  // ════════════════════════════════════════════════════════════════════
  // Networks (30)
  // ════════════════════════════════════════════════════════════════════
  { title: 'What happens when you *type a URL* and press Enter?', body: 'DNS, TCP handshake, TLS, HTTP, rendering — each layer briefly.', category: 'Networks', difficulty: 'Medium', companies: ['Amazon', 'Google', 'Razorpay'], timeEstimate: '20 min' },
  { title: 'TCP vs *UDP* — when do you use each?', body: 'Reliability, ordering, overhead. Why DNS uses UDP.', category: 'Networks', difficulty: 'Easy', companies: ['Amazon', 'Google'], timeEstimate: '10 min' },
  { title: 'Explain the *CAP theorem* with examples.', body: 'Classify Postgres, Cassandra. Network partition realities.', category: 'Networks', difficulty: 'Medium', companies: ['Amazon', 'Flipkart'], timeEstimate: '15 min' },
  { title: 'Explain the *OSI model* — 7 layers briefly.', body: 'Physical through Application. Where TCP/UDP/IP/HTTP sit.', category: 'Networks', difficulty: 'Easy', companies: ['Amazon'], timeEstimate: '10 min' },
  { title: 'What is the *TCP three-way handshake*?', body: 'SYN / SYN-ACK / ACK. Why three messages (not two).', category: 'Networks', difficulty: 'Easy', companies: ['Amazon'], timeEstimate: '10 min' },
  { title: 'Explain *HTTP/1.1 vs HTTP/2 vs HTTP/3*.', body: 'Head-of-line blocking, multiplexing, QUIC, 0-RTT.', category: 'Networks', difficulty: 'Medium', companies: ['Google', 'Razorpay'], timeEstimate: '15 min' },
  { title: 'What is *HTTPS* — TLS handshake step by step?', body: 'ClientHello → cert → key exchange → encrypted session.', category: 'Networks', difficulty: 'Medium', companies: ['Razorpay', 'Amazon'], timeEstimate: '15 min' },
  { title: 'Explain *DNS resolution* — recursive vs iterative.', body: 'Local resolver → root → TLD → authoritative. Caching tiers.', category: 'Networks', difficulty: 'Medium', companies: ['Amazon', 'Google'], timeEstimate: '15 min' },
  { title: 'What is a *CDN* and how does it route users?', body: 'Anycast / GeoDNS, cache hierarchy, origin shielding.', category: 'Networks', difficulty: 'Medium', companies: ['Cloudflare', 'Amazon'], timeEstimate: '15 min' },
  { title: 'Explain *load balancing* — L4 vs L7.', body: 'Transport vs app-layer, sticky sessions, health checks.', category: 'Networks', difficulty: 'Medium', companies: ['Amazon'], timeEstimate: '15 min' },
  { title: 'What is *NAT* and why do we still need IPv6?', body: 'Address exhaustion, port mapping, breakage for peer-to-peer.', category: 'Networks', difficulty: 'Medium', companies: ['Cisco', 'Google'], timeEstimate: '15 min' },
  { title: 'Explain *IP packet* structure and routing.', body: 'Header fields, fragmentation, TTL, routing tables.', category: 'Networks', difficulty: 'Medium', companies: ['Amazon'], timeEstimate: '15 min' },
  { title: 'What is *ARP* and *RARP*?', body: 'Layer 2 address resolution, cache poisoning risk.', category: 'Networks', difficulty: 'Easy', companies: ['Amazon'], timeEstimate: '10 min' },
  { title: 'How does *ICMP* work — ping and traceroute.', body: 'Echo, TTL-expired, time-to-live trick for path discovery.', category: 'Networks', difficulty: 'Easy', companies: ['Amazon'], timeEstimate: '10 min' },
  { title: 'Explain *subnetting* with a concrete /24 example.', body: 'Hosts, broadcast, network address. CIDR notation.', category: 'Networks', difficulty: 'Medium', companies: ['Amazon', 'Cisco'], timeEstimate: '15 min' },
  { title: 'What are *public vs private IP ranges*?', body: 'RFC 1918 ranges, link-local, loopback.', category: 'Networks', difficulty: 'Easy', companies: ['Amazon'], timeEstimate: '10 min' },
  { title: 'Explain *BGP* — how does the internet route at scale?', body: 'AS path attributes, peering vs transit, recent outage post-mortems.', category: 'Networks', difficulty: 'Hard', companies: ['Cloudflare', 'Google'], timeEstimate: '20 min' },
  { title: 'What is a *VPN* and how does it tunnel traffic?', body: 'IPsec/WireGuard, encryption, split tunneling.', category: 'Networks', difficulty: 'Medium', companies: ['Cloudflare'], timeEstimate: '15 min' },
  { title: 'Explain *WebSockets* — protocol upgrade and lifecycle.', body: 'HTTP upgrade handshake, frames, ping/pong, reconnect.', category: 'Networks', difficulty: 'Medium', companies: ['Meta', 'Slack'], timeEstimate: '15 min' },
  { title: 'What is *HTTP caching* — Cache-Control and ETag?', body: 'max-age, no-store, revalidation, stale-while-revalidate.', category: 'Networks', difficulty: 'Medium', companies: ['Razorpay', 'Meta'], timeEstimate: '15 min' },
  { title: 'Explain *CORS* and preflight requests.', body: 'Origin, credentials, simple vs preflight, wildcard caveats.', category: 'Networks', difficulty: 'Medium', companies: ['Razorpay'], timeEstimate: '15 min' },
  { title: 'What is *CSRF* and how do tokens help?', body: 'Cross-site forged requests, same-origin policy gaps.', category: 'Networks', difficulty: 'Medium', companies: ['Razorpay'], timeEstimate: '15 min' },
  { title: 'Explain *rate limiting* at the edge.', body: 'Edge vs app-level, DDoS mitigation, per-user vs per-IP.', category: 'Networks', difficulty: 'Medium', companies: ['Cloudflare'], timeEstimate: '15 min' },
  { title: 'What is *TLS certificate chain* validation?', body: 'Root CAs, intermediate certs, trust path, revocation checks.', category: 'Networks', difficulty: 'Medium', companies: ['Razorpay', 'Amazon'], timeEstimate: '15 min' },
  { title: 'Explain *man-in-the-middle* attacks — how HTTPS prevents them.', body: 'Cert pinning, HSTS, public key infrastructure.', category: 'Networks', difficulty: 'Medium', companies: ['Razorpay'], timeEstimate: '15 min' },
  { title: 'What is *DDoS* and common mitigation strategies?', body: 'Volumetric vs protocol vs app-layer. Anycast, scrubbing, rate limits.', category: 'Networks', difficulty: 'Medium', companies: ['Cloudflare', 'Amazon'], timeEstimate: '15 min' },
  { title: 'How does *email* actually travel (SMTP, MX records)?', body: 'DNS MX lookup, queueing, SPF/DKIM/DMARC.', category: 'Networks', difficulty: 'Medium', companies: ['Google'], timeEstimate: '15 min' },
  { title: 'Explain *IPv4 vs IPv6* — key differences.', body: 'Address space, header simplification, NAT-less design.', category: 'Networks', difficulty: 'Easy', companies: ['Amazon'], timeEstimate: '10 min' },
  { title: 'What is *QUIC* and why did HTTP/3 adopt it?', body: 'UDP-based, built-in encryption, 0-RTT, multiplexed streams.', category: 'Networks', difficulty: 'Medium', companies: ['Google'], timeEstimate: '15 min' },
  { title: 'Explain *DNS over HTTPS* (DoH) — why it is controversial.', body: 'Privacy vs enterprise monitoring. Centralization concerns.', category: 'Networks', difficulty: 'Medium', companies: ['Cloudflare', 'Google'], timeEstimate: '15 min' },

  // ════════════════════════════════════════════════════════════════════
  // Behavioral (30)
  // ════════════════════════════════════════════════════════════════════
  { title: 'Tell me about a time you *disagreed* with a team member.', body: 'STAR framework. Focus on resolution over conflict. Emotional intelligence.', category: 'Behavioral', difficulty: 'Easy', companies: ['Amazon', 'Google', 'Razorpay', 'Flipkart'], timeEstimate: '5 min' },
  { title: 'Describe your *biggest failure* and what you learned.', body: 'Be honest. Pick a real failure. Spend 80% on the lesson.', category: 'Behavioral', difficulty: 'Medium', companies: ['Amazon', 'Meta'], timeEstimate: '5 min' },
  { title: 'Walk me through a project you *owned end-to-end.*', body: 'Scope, decisions, trade-offs, quantified outcome.', category: 'Behavioral', difficulty: 'Medium', companies: ['Amazon', 'Razorpay', 'Flipkart'], timeEstimate: '10 min' },
  { title: 'Why do you want to work here?', body: 'Research the company. Tie goals to concrete things they do.', category: 'Behavioral', difficulty: 'Easy', companies: ['Razorpay', 'CRED', 'Zomato'], timeEstimate: '3 min' },
  { title: 'Tell me about a *tight deadline* you had to meet.', body: 'How you scoped, prioritized, and communicated trade-offs.', category: 'Behavioral', difficulty: 'Easy', companies: ['Amazon'], timeEstimate: '5 min' },
  { title: 'Describe a time you *went beyond* your role.', body: 'Show initiative without making it sound performative.', category: 'Behavioral', difficulty: 'Easy', companies: ['Amazon', 'Microsoft'], timeEstimate: '5 min' },
  { title: 'Tell me about a *conflict* with a manager.', body: 'Respectful disagreement, shared goal, honest resolution.', category: 'Behavioral', difficulty: 'Medium', companies: ['Amazon'], timeEstimate: '5 min' },
  { title: 'How do you *handle pressure* at work?', body: 'Concrete habits, not platitudes. When you pushed back.', category: 'Behavioral', difficulty: 'Easy', companies: ['Amazon'], timeEstimate: '5 min' },
  { title: 'Tell me about a time you *failed to deliver*.', body: 'Own it, explain root cause, what changed after.', category: 'Behavioral', difficulty: 'Medium', companies: ['Amazon', 'Meta'], timeEstimate: '5 min' },
  { title: 'Describe a time you *mentored* someone.', body: 'Specific person, what you taught, the outcome for them.', category: 'Behavioral', difficulty: 'Easy', companies: ['Amazon'], timeEstimate: '5 min' },
  { title: "Tell me about a *risk* you took that didn't work.", body: 'Structured gamble, lesson learned, continued to take risks.', category: 'Behavioral', difficulty: 'Medium', companies: ['Amazon'], timeEstimate: '5 min' },
  { title: 'How do you *prioritize* when everything is urgent?', body: 'Framework (impact vs effort, dependencies), communicate trade-offs.', category: 'Behavioral', difficulty: 'Medium', companies: ['Amazon'], timeEstimate: '5 min' },
  { title: 'Describe a time you *changed your mind* on something.', body: 'New data, team feedback, ego-free pivot.', category: 'Behavioral', difficulty: 'Easy', companies: ['Amazon'], timeEstimate: '5 min' },
  { title: 'Tell me about *constructive criticism* you received.', body: 'What, from whom, how you acted on it, result.', category: 'Behavioral', difficulty: 'Easy', companies: ['Amazon'], timeEstimate: '5 min' },
  { title: 'Describe your *ideal team* environment.', body: 'Specific traits (clarity, autonomy, safety). Back with an example.', category: 'Behavioral', difficulty: 'Easy', companies: ['Razorpay'], timeEstimate: '5 min' },
  { title: 'Tell me about a *technically hard* problem you solved.', body: 'Scope, approach, what you tried that failed, final result.', category: 'Behavioral', difficulty: 'Medium', companies: ['Amazon', 'Google'], timeEstimate: '10 min' },
  { title: 'Describe a time you *learned something new quickly*.', body: 'Specific skill, timebox, how you tested yourself.', category: 'Behavioral', difficulty: 'Easy', companies: ['Amazon'], timeEstimate: '5 min' },
  { title: 'How do you *handle disagreement* without ego?', body: 'Separate idea from identity, ask questions, commit after decision.', category: 'Behavioral', difficulty: 'Medium', companies: ['Amazon'], timeEstimate: '5 min' },
  { title: 'Tell me about a time you *gave difficult feedback*.', body: 'Private, specific, actionable, empathetic.', category: 'Behavioral', difficulty: 'Medium', companies: ['Amazon'], timeEstimate: '5 min' },
  { title: 'Describe a *mistake* that taught you something.', body: 'Technical or process mistake. What changed after.', category: 'Behavioral', difficulty: 'Easy', companies: ['Amazon'], timeEstimate: '5 min' },
  { title: 'How do you *stay updated* in the industry?', body: 'Specific sources/newsletters/projects — not just "I read HN".', category: 'Behavioral', difficulty: 'Easy', companies: ['Razorpay'], timeEstimate: '3 min' },
  { title: 'Tell me about a time you *influenced* a decision.', body: 'Data, framing, stakeholder buy-in, outcome.', category: 'Behavioral', difficulty: 'Medium', companies: ['Amazon'], timeEstimate: '5 min' },
  { title: "Describe a time you *didn't know* something in a meeting.", body: 'Say "I\'ll find out" clearly. How you followed up.', category: 'Behavioral', difficulty: 'Easy', companies: ['Amazon'], timeEstimate: '5 min' },
  { title: 'How would you *convince* someone who disagrees with your plan?', body: 'Evidence-first, acknowledge objections, propose a test.', category: 'Behavioral', difficulty: 'Medium', companies: ['Amazon'], timeEstimate: '5 min' },
  { title: 'Tell me about a time you *delivered under ambiguity*.', body: 'Framing the problem, making reversible decisions, iterating.', category: 'Behavioral', difficulty: 'Medium', companies: ['Amazon', 'Google'], timeEstimate: '10 min' },
  { title: 'Describe your *proudest moment* in your career.', body: 'Specific, measurable, why it mattered beyond you.', category: 'Behavioral', difficulty: 'Easy', companies: ['Amazon'], timeEstimate: '5 min' },
  { title: 'Why should we *pick you* over another candidate?', body: 'Unique strengths + concrete fit with the role/team.', category: 'Behavioral', difficulty: 'Medium', companies: ['Amazon', 'Meta'], timeEstimate: '5 min' },
  { title: 'Where do you see yourself in *5 years*?', body: 'Directional, not prescriptive. Tie to skills/impact you want.', category: 'Behavioral', difficulty: 'Easy', companies: ['Razorpay'], timeEstimate: '3 min' },
  { title: 'Tell me about a time you *championed* an unpopular idea.', body: 'How you framed it, built consensus (or didn\'t), result.', category: 'Behavioral', difficulty: 'Medium', companies: ['Amazon'], timeEstimate: '5 min' },
  { title: 'How do you *balance* speed and quality?', body: 'Reversibility, blast radius, boring tech for load-bearing things.', category: 'Behavioral', difficulty: 'Medium', companies: ['Amazon'], timeEstimate: '5 min' },
];

/**
 * Idempotent seed.
 * - Inserts new questions (by title) on first encounter.
 * - Syncs `referenceUrl` onto existing docs so old bookmarks pick up new
 *   LeetCode links without losing their _id.
 * All other fields use $setOnInsert, so user-edited data (if any) is never
 * clobbered by a later seed pass.
 */
export async function ensureQuestionSeed() {
  const ops = SEED_QUESTIONS.map((q) => ({
    updateOne: {
      filter: { title: q.title },
      update: {
        $set: { referenceUrl: q.referenceUrl || '' },
        $setOnInsert: {
          body: q.body,
          category: q.category,
          difficulty: q.difficulty,
          companies: q.companies,
          timeEstimate: q.timeEstimate,
        },
      },
      upsert: true,
    },
  }));
  const result = await Question.bulkWrite(ops, { ordered: false });
  const inserted = result.upsertedCount || 0;
  const matched = result.matchedCount || 0;
  console.log(
    `[seed] question bank: ${SEED_QUESTIONS.length} defined · ${inserted} inserted · ${matched} already present (referenceUrl synced)`
  );
  return { inserted, matched, total: SEED_QUESTIONS.length };
}

// Back-compat export so existing imports don't break.
export const seedQuestionsIfEmpty = ensureQuestionSeed;
