import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="flex flex-col justify-center text-center flex-1">
      <h1 className="text-2xl font-bold mb-4">ProveGate</h1>
      <p className="text-fd-muted-foreground mb-4">prove it, then let it propagate.</p>
      <p>
        Open{' '}
        <Link href="/docs" className="font-medium underline">
          /docs
        </Link>{' '}
        for the documentation.
      </p>
    </div>
  );
}
