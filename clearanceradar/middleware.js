// Skip auth checks for all /api/* routes — return immediately so the
// serverless function handles the request directly (no React SPA, no Whop redirect).
export function middleware() {}

export const config = {
  matcher: '/((?!api/).*)',  // only run middleware on non-API routes
};
