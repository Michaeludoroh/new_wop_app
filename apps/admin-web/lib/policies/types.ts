export type PolicyType =
  | "TERMS_OF_USE"
  | "PRIVACY_POLICY"
  | "COMMUNITY_GUIDELINES"
  | "CONTENT_SHARING_RULES";

export type PolicyTypeOption = {
  value: PolicyType;
  label: string;
};

export type Policy = {
  id: string;
  type: PolicyType;
  typeLabel: string;
  title: string;
  slug: string;
  content: string;
  version: number;
  published: boolean;
  effectiveDate: string | null;
  createdAt: string;
  updatedAt: string;
  acceptanceCount?: number;
};

export type PolicyPayload = {
  type: PolicyType;
  title: string;
  slug?: string;
  content: string;
  effectiveDate?: string | null;
  published?: boolean;
  version?: number;
};

export type PolicyFeedQuery = {
  search?: string;
  type?: PolicyType | "";
  published?: boolean | "ALL";
  page?: number;
  limit?: number;
};

export type PolicyFeedResponse = {
  items: Policy[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export type PolicyAcceptanceSummary = {
  policy: Policy;
  acceptedCount: number;
  pendingCount: number;
  totalUsers: number;
  acceptanceRate: number;
};

export type PolicyAnalyticsResponse = {
  summary: PolicyAcceptanceSummary[];
  versionHistory: Policy[];
  totals: {
    users: number;
    activePolicies: number;
    totalAcceptances: number;
  };
};

export type PolicyPublishReadiness = {
  ready: boolean;
  missingTypes: PolicyType[];
  activePolicies: Policy[];
};
