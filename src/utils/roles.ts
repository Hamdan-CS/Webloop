import type { CreatorType, ProjectType, Compensation } from '@/types';
import type { Profile } from '@/types';

/** Which project types an account is allowed to publish/select. A company/university
 * account keeps its own matching type; a student/team account can only publish a
 * student project or an open-source project — "Company project"/"University project"
 * are not offered to them. */
export const ALLOWED_PROJECT_TYPES: Record<CreatorType, ProjectType[]> = {
  student: ['student', 'open_source'],
  team: ['student', 'open_source'],
  company: ['company', 'open_source'],
  university: ['university', 'open_source'],
};

/** Which compensation options an account is allowed to offer. Paying contributors is a
 * company/university thing — student/team accounts only see unpaid/open-source. */
export const ALLOWED_COMPENSATIONS: Record<CreatorType, Compensation[]> = {
  student: ['unpaid_educational', 'open_source'],
  team: ['unpaid_educational', 'open_source'],
  company: ['paid', 'unpaid_educational', 'open_source'],
  university: ['paid', 'unpaid_educational', 'open_source'],
};

export function getDashboardPath(role: CreatorType): string {
  switch (role) {
    case 'company':
      return '/dashboard/company';
    case 'university':
      return '/dashboard/university';
    case 'student':
    case 'team':
    default:
      return '/dashboard/student';
  }
}

export function getDashboardLabel(role: CreatorType): string {
  switch (role) {
    case 'company':
      return 'Company Dashboard';
    case 'university':
      return 'University Dashboard';
    case 'student':
    case 'team':
    default:
      return 'Student Dashboard';
  }
}

export function isAllowedRole(profile: Profile | null, allowed: CreatorType[]): boolean {
  if (!profile) return false;
  return allowed.includes(profile.creator_type);
}
