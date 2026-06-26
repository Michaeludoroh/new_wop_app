import { NextRequest, NextResponse } from "next/server";

type UserRole = "SUPER_ADMIN" | "ADMIN" | "MODERATOR" | "USER";

const ACCESS_TOKEN_KEY = "ministry_admin_access_token";
const USER_KEY = "ministry_admin_user";

const PUBLIC_ROUTES = new Set(["/login"]);
const ADMIN_PORTAL_ROLES: UserRole[] = ["SUPER_ADMIN", "ADMIN", "MODERATOR"];

const ROLE_ROUTE_MAP: Record<string, UserRole[]> = {
  "/users": ["SUPER_ADMIN", "ADMIN"],
  "/subscriptions": ["SUPER_ADMIN", "ADMIN"],
  "/payments": ["SUPER_ADMIN", "ADMIN"],
  "/analytics": ["SUPER_ADMIN", "ADMIN"],
  "/notifications": ["SUPER_ADMIN", "ADMIN", "MODERATOR"],
  "/ebooks": ["SUPER_ADMIN", "ADMIN", "MODERATOR"],
  "/content": ["SUPER_ADMIN", "ADMIN", "MODERATOR"],
  "/events": ["SUPER_ADMIN", "ADMIN", "MODERATOR"],
  "/clips": ["SUPER_ADMIN", "ADMIN", "MODERATOR"],
  "/policies": ["SUPER_ADMIN", "ADMIN", "MODERATOR"],
  "/programs": ["SUPER_ADMIN", "ADMIN", "MODERATOR"],
  "/mentorship": ["SUPER_ADMIN", "ADMIN", "MODERATOR"],
  "/announcements": ["SUPER_ADMIN", "ADMIN"]
};

function decodeCookieValue(value: string | undefined): string | null {
  if (!value) return null;
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function normalizeRole(role: string | null | undefined): UserRole | null {
  if (!role) return null;
  const normalized = role.toUpperCase().replace(/[-\s]/g, "_");
  if (normalized === "SUPERADMIN" || normalized === "SUPER_ADMIN") return "SUPER_ADMIN";
  if (normalized === "ADMIN") return "ADMIN";
  if (normalized === "MODERATOR") return "MODERATOR";
  if (normalized === "USER") return "USER";
  return null;
}

function getRoleFromCookie(req: NextRequest): UserRole | null {
  const userRaw = decodeCookieValue(req.cookies.get(USER_KEY)?.value);
  if (!userRaw) return null;
  try {
    const user = JSON.parse(userRaw) as { role?: string };
    return normalizeRole(user.role);
  } catch {
    return null;
  }
}

function getRequiredRoles(pathname: string): UserRole[] | null {
  const exact = ROLE_ROUTE_MAP[pathname];
  if (exact) return exact;

  for (const [route, roles] of Object.entries(ROLE_ROUTE_MAP)) {
    if (pathname.startsWith(`${route}/`)) return roles;
  }

  return null;
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/api")
  ) {
    return NextResponse.next();
  }

  const hasAccessToken = Boolean(req.cookies.get(ACCESS_TOKEN_KEY)?.value);
  const userRole = getRoleFromCookie(req);

  if (PUBLIC_ROUTES.has(pathname)) {
    if (hasAccessToken && userRole) {
      return NextResponse.redirect(new URL("/", req.url));
    }
    return NextResponse.next();
  }

  if (!hasAccessToken) {
    const url = new URL("/login", req.url);
    url.searchParams.set("reason", "missing_session");
    return NextResponse.redirect(url);
  }

  if (!userRole) {
    const url = new URL("/login", req.url);
    url.searchParams.set("reason", "expired_session");
    const response = NextResponse.redirect(url);
    response.cookies.delete(ACCESS_TOKEN_KEY);
    response.cookies.delete("ministry_admin_refresh_token");
    response.cookies.delete(USER_KEY);
    return response;
  }

  if (!ADMIN_PORTAL_ROLES.includes(userRole)) {
    const url = new URL("/login", req.url);
    url.searchParams.set("reason", "insufficient_role");
    const response = NextResponse.redirect(url);
    response.cookies.delete(ACCESS_TOKEN_KEY);
    response.cookies.delete("ministry_admin_refresh_token");
    response.cookies.delete(USER_KEY);
    return response;
  }

  const requiredRoles = getRequiredRoles(pathname);
  if (!requiredRoles) {
    return NextResponse.next();
  }

  if (!requiredRoles.includes(userRole)) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
