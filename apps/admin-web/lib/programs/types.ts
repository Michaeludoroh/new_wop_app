export type ProgramEnrollmentStatus = "ENROLLED" | "CANCELLED";

export type ProgramItem = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  category: string;
  bannerImageUrl: string | null;
  instructorName: string | null;
  startDate: string;
  endDate: string;
  registrationDeadline: string | null;
  capacity: number | null;
  enrolledCount: number;
  featured: boolean;
  published: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ProgramListQuery = {
  search?: string;
  category?: string;
  featured?: boolean;
  limit?: number;
  offset?: number;
};

export type ProgramListResponse = {
  data: ProgramItem[];
  total: number;
  limit: number;
  offset: number;
};

export type ProgramPayload = {
  title: string;
  slug?: string;
  description?: string;
  category?: string;
  bannerImageUrl?: string;
  instructorName?: string;
  startDate: string;
  endDate: string;
  registrationDeadline?: string;
  capacity?: number;
  featured?: boolean;
  published?: boolean;
};

export type ProgramEnrollment = {
  id: string;
  status: ProgramEnrollmentStatus;
  enrolledAt: string;
  cancelledAt: string | null;
  user: {
    id: string;
    fullName: string;
    email: string;
    role: string;
  };
};

export type ProgramEnrollmentsResponse = {
  data: ProgramItem;
  enrollments: ProgramEnrollment[];
};

export type ProgramProgressRecord = {
  id: string;
  programId: string;
  userId: string;
  completionPct: number;
  currentModule: string | null;
  notes: string | null;
  lastUpdatedAt: string;
  user?: {
    id: string;
    fullName: string;
    email: string;
    role: string;
  };
};

export type ProgramProgressResponse = {
  data: ProgramItem;
  progress: ProgramProgressRecord[];
};

export type ProgramAnalytics = {
  totalPrograms: number;
  publishedPrograms: number;
  featuredPrograms: number;
  activeEnrollments: number;
  averageCompletionPct: number;
};

export type ProgramAnalyticsResponse = {
  data: ProgramAnalytics;
};
