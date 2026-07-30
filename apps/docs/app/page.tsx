import { permanentRedirect } from 'next/navigation';
import { docsRoute } from '@/lib/shared';

/** The subdomain root carries no content of its own: marketing lives on the
 * apex (provegate.dev) and the entry hub is the docs index — a third copy
 * here would only drift. 308 so crawlers transfer the root's weight. */
export default function RootRedirect(): never {
  permanentRedirect(docsRoute);
}
