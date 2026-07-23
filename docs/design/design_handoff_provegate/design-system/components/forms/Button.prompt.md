Primary action control; use for buttons and link-buttons across docs, landing, and app chrome.

```jsx
<Button variant="primary">Get started</Button>
<Button variant="secondary" leftIcon={<Icon name="github" size={16} />}>Star on GitHub</Button>
<Button variant="ghost" size="sm" rightIcon={<Icon name="arrowRight" size={16} />}>Read the spec</Button>
```

Variants: `primary` (neutral near-black — the default CTA), `secondary` (outline), `ghost` (quiet). Sizes `sm|md|lg`. Set `href` to render an `<a>`. **Do not** make buttons green — proof-green is reserved for earned/pass semantics.
