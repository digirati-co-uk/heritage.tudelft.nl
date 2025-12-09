import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

// Additional configuration, such as localising the URL can be found here:
// - https://next-intl-docs.vercel.app/docs/routing/middleware
export const config = {
  // Match only internationalized pathnames
  matcher: ["/", "/((?!iiif|api|_next|_vercel|.*\\..*).*)"],
};


export default createMiddleware(routing);
