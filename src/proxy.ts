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
  // `icon` is excluded deliberately. It is the generated favicon route, and a
  // browser fetches it on the login page too — guarding it would redirect the
  // image request to /login and leave a broken tab icon exactly where the first
  // impression is made. The route resolves the household itself and falls back
  // to the default mark when there is no session, so it leaks nothing.
  matcher: ["/((?!api|icon|_next/static|_next/image|favicon.ico).*)"],
};
