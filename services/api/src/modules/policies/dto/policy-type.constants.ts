import { PolicyType } from '@prisma/client';

export const POLICY_TYPES = [
  'TERMS_OF_USE',
  'PRIVACY_POLICY',
  'COMMUNITY_GUIDELINES',
  'CONTENT_SHARING_RULES',
] as const satisfies readonly PolicyType[];

export const POLICY_TYPE_LABELS: Record<(typeof POLICY_TYPES)[number], string> = {
  TERMS_OF_USE: 'Terms of Use',
  PRIVACY_POLICY: 'Privacy Policy',
  COMMUNITY_GUIDELINES: 'Community Guidelines',
  CONTENT_SHARING_RULES: 'Content Sharing Rules',
};

export function policyTypeToSlugPrefix(type: PolicyType | string) {
  return String(type).toLowerCase().replace(/_/g, '-');
}
