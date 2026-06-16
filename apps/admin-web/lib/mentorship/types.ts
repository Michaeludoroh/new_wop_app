export type MentorshipParticipantStatus = "ENROLLED" | "WAITLISTED" | "CANCELLED";
export type MentorshipAttendanceStatus = "PRESENT" | "ABSENT" | "EXCUSED";

export type MentorProfile = {
  name: string | null;
  bio: string | null;
  imageUrl: string | null;
  category: string | null;
};

export type MentorshipItem = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  category: string;
  bannerImageUrl: string | null;
  mentorName: string | null;
  mentorBio: string | null;
  mentorImageUrl: string | null;
  mentor: MentorProfile;
  startDate: string;
  endDate: string;
  registrationDeadline: string | null;
  capacity: number | null;
  enrolledCount: number;
  waitlistCount: number;
  sessionCount: number;
  feedbackCount: number;
  featured: boolean;
  published: boolean;
  createdAt: string;
  updatedAt: string;
};

export type MentorshipListQuery = {
  search?: string;
  category?: string;
  featured?: boolean;
  limit?: number;
  offset?: number;
};

export type MentorshipListResponse = {
  data: MentorshipItem[];
  total: number;
  limit: number;
  offset: number;
};

export type MentorshipPayload = {
  title: string;
  slug?: string;
  description?: string;
  category?: string;
  bannerImageUrl?: string;
  mentorName?: string;
  mentorBio?: string;
  mentorImageUrl?: string;
  startDate: string;
  endDate: string;
  registrationDeadline?: string;
  capacity?: number;
  featured?: boolean;
  published?: boolean;
};

export type MentorshipParticipant = {
  id: string;
  status: MentorshipParticipantStatus;
  joinedAt: string;
  waitlistedAt: string | null;
  cancelledAt: string | null;
  user?: {
    id: string;
    fullName: string;
    email: string;
    role: string;
  };
};

export type MentorshipParticipantsResponse = {
  data: MentorshipItem;
  participants: MentorshipParticipant[];
};

export type MentorshipSession = {
  id: string;
  mentorshipClassId: string;
  title: string;
  description: string | null;
  scheduledAt: string;
  durationMinutes: number;
  meetingLink: string | null;
  location: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type SessionPayload = {
  title: string;
  description?: string;
  scheduledAt: string;
  durationMinutes?: number;
  meetingLink?: string;
  location?: string;
  sortOrder?: number;
};

export type MentorshipAttendance = {
  id: string;
  sessionId: string;
  userId: string;
  status: MentorshipAttendanceStatus;
  notes: string | null;
  markedAt: string;
  user?: {
    id: string;
    fullName: string;
    email: string;
    role: string;
  };
};

export type SessionAttendanceResponse = {
  data: MentorshipSession;
  attendances: MentorshipAttendance[];
};

export type MentorshipFeedback = {
  id: string;
  mentorshipClassId: string;
  userId: string;
  rating: number;
  comment: string | null;
  submittedAt: string;
  user?: {
    id: string;
    fullName: string;
    email: string;
    role: string;
  };
};

export type MentorshipProgressRecord = {
  id?: string;
  mentorshipClassId: string;
  userId?: string;
  completionPct: number;
  currentMilestone: string | null;
  notes: string | null;
  lastUpdatedAt: string | null;
  user?: {
    id: string;
    fullName: string;
    email: string;
    role: string;
  };
};

export type MentorshipAnalytics = {
  totalClasses: number;
  publishedClasses: number;
  activeParticipants: number;
  waitlistedParticipants: number;
  totalSessions: number;
  averageRating: number;
  averageCompletionPct: number;
};

export type MentorshipAnalyticsResponse = {
  data: MentorshipAnalytics;
};
