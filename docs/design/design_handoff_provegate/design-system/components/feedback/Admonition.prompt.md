Callout box for docs prose; use to flag notes, warnings, and gate outcomes.

```jsx
<Admonition type="note">Gate config lives in <code>gate.toml</code>.</Admonition>
<Admonition type="warning" title="Listed ≠ run">A test listed but not run is never passed.</Admonition>
<Admonition type="human" title="Phases 1–3">These gates are yours. The agent proposes; you decide.</Admonition>
```

Types: `note tip warning pass fail human`. `pass`/`fail` inherit verdict color law; `human` uses operator-authority blue. Title defaults to the type name.
