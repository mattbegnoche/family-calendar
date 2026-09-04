import { auth } from "@/auth";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isOnLogin = req.nextUrl.pathname.startsWith("/login");
  if (!isLoggedIn && !isOnLogin) {
    return Response.redirect(new URL("/login", req.nextUrl));
  }

  if (isLoggedIn && isOnLogin) {
    return Response.redirect(new URL("/", req.nextUrl));
  }
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
