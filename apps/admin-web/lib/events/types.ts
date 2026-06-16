export type EventLocationType = "PHYSICAL" | "ONLINE" | "HYBRID";
export type EventRsvpStatus = "REGISTERED" | "CANCELLED";

export type EventItem = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  category: string;
  bannerImageUrl: string | null;
  locationType: EventLocationType;
  venue: string | null;
  meetingLink: string | null;
  startDateTime: string;
  endDateTime: string;
  registrationRequired: boolean;
  maxCapacity: number | null;
  attendeeCount: number;
  featured: boolean;
  published: boolean;
  createdAt: string;
  updatedAt: string;
};

export type EventListQuery = {
  search?: string;
  category?: string;
  featured?: boolean;
  limit?: number;
  offset?: number;
};

export type EventListResponse = {
  data: EventItem[];
  total: number;
  limit: number;
  offset: number;
};

export type EventPayload = {
  title: string;
  slug?: string;
  description?: string;
  category?: string;
  bannerImageUrl?: string;
  locationType: EventLocationType;
  venue?: string;
  meetingLink?: string;
  startDateTime: string;
  endDateTime: string;
  registrationRequired?: boolean;
  maxCapacity?: number;
  featured?: boolean;
  published?: boolean;
};

export type EventAttendee = {
  id: string;
  status: EventRsvpStatus;
  registeredAt: string;
  cancelledAt: string | null;
  user: {
    id: string;
    fullName: string;
    email: string;
    role: string;
  };
};

export type EventAttendeesResponse = {
  data: EventItem;
  attendees: EventAttendee[];
};
