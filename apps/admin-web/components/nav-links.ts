import { UserRole } from "../lib/auth/types";

export type AdminNavItem = {
  label: string;
  href: string;
  description: string;
  roles: UserRole[];
};

export const adminNavLinks: AdminNavItem[] = [
  { label: "Dashboard", href: "/", description: "Overview and quick actions", roles: ["SUPER_ADMIN", "ADMIN", "MODERATOR"] },
  { label: "Users", href: "/users", description: "User accounts and roles", roles: ["SUPER_ADMIN", "ADMIN"] },
  { label: "Subscriptions", href: "/subscriptions", description: "Plans and active subscriptions", roles: ["SUPER_ADMIN", "ADMIN"] },
  { label: "Payments", href: "/payments", description: "Payment tracking and reconciliation", roles: ["SUPER_ADMIN", "ADMIN"] },
  { label: "Content", href: "/content", description: "Content moderation overview", roles: ["SUPER_ADMIN", "ADMIN", "MODERATOR"] },
  { label: "Announcements", href: "/announcements", description: "Platform announcements", roles: ["SUPER_ADMIN", "ADMIN"] },
  { label: "Events", href: "/events", description: "Event publishing and RSVP management", roles: ["SUPER_ADMIN", "ADMIN", "MODERATOR"] },
  { label: "Clips", href: "/clips", description: "Short video clips management", roles: ["SUPER_ADMIN", "ADMIN", "MODERATOR"] },
  { label: "eBooks", href: "/ebooks", description: "Digital resources and access", roles: ["SUPER_ADMIN", "ADMIN"] },
  { label: "Policies", href: "/policies", description: "Terms and community guidelines", roles: ["SUPER_ADMIN", "ADMIN", "MODERATOR"] },
  { label: "Programs", href: "/programs", description: "Empowerment programs and courses", roles: ["SUPER_ADMIN", "ADMIN", "MODERATOR"] },
  { label: "Mentorship", href: "/mentorship", description: "Session and booking management", roles: ["SUPER_ADMIN", "ADMIN", "MODERATOR"] },
  { label: "Notifications", href: "/notifications", description: "Push and in-app notifications", roles: ["SUPER_ADMIN", "ADMIN", "MODERATOR"] },
  { label: "Analytics", href: "/analytics", description: "Metrics and reporting", roles: ["SUPER_ADMIN", "ADMIN"] }
];
