import type { CreatorType } from '@/lib/types';
import type { Profile } from '@/lib/types';

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
