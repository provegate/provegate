The 7-phase gate pipeline; use to explain where humans decide and where machines decide.

```jsx
<PhasePipeline active={5} />
// custom phases
<PhasePipeline phases={[
  { n: 1, label: "PRD", authority: "human" },
  { n: 2, label: "Readiness", authority: "human" },
  { n: 3, label: "Tasks", authority: "human" },
  { n: 4, label: "Implement", authority: "machine" },
]} showPush />
```

Human gates are pill + person glyph in operator-blue; machine gates are square + chip glyph in neutral. The human→machine boundary shows a dashed "hand off" connector. Push is always human.
