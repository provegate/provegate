Terminal code/command block for docs and marketing; use for any evidence — commands, config, logs.

```jsx
<CodeBlock lang="bash" prompt>npm i -g provegate
gate run</CodeBlock>
<CodeBlock filename="gate.toml">{`[gate.test]\ncmd = "pnpm test"\nrequire = "exit0"`}</CodeBlock>
```

Always dark (terminal surface). `prompt` adds a green `$`. Pass string children so copy captures the real text.
