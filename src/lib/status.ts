import { Status } from '@prisma/client';

export function calculatePopupStatus(startDate: Date, endDate?: Date | null): Status {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);

  if (start > today) {
    return 'upcoming';
  }

  if (endDate) {
    const end = new Date(endDate);
    end.setHours(0, 0, 0, 0);
    
    if (end < today) {
      return 'ended';
    }
  }

  return 'ongoing';
}
