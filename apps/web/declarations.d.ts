// Font files imported for <link rel="preload"> resolve to their hashed
// static-asset URL — the same URL the design package's @font-face emits, so
// the preload and the CSS reference dedupe to one fetch.
declare module '*.woff2' {
  const src: string;
  export default src;
}
