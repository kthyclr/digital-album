/**
 * Timezone-aware relationship duration, countdown, and anniversary calculations.
 * Never displays negative elapsed time.
 */

export interface RelationshipDurationResult {
  isFutureStart: boolean;
  startDateFormatted: string;
  totalDays: number;
  years: number;
  months: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  nextMilestoneTitle: string;
  nextMilestoneDateFormatted: string;
  daysUntilNextMilestone: number;
}

export function parseIsoDateInLocal(dateStr: string): Date {
  // Parse YYYY-MM-DD safely at midnight local time
  const parts = dateStr.split('-').map((p) => parseInt(p, 10));
  if (parts.length === 3 && !parts.some(isNaN)) {
    return new Date(parts[0], parts[1] - 1, parts[2], 0, 0, 0, 0);
  }
  const fallback = new Date(dateStr);
  return isNaN(fallback.getTime()) ? new Date(2026, 8, 15, 0, 0, 0) : fallback;
}

export function calculateRelationshipDuration(
  startDateStr: string,
  now: Date = new Date()
): RelationshipDurationResult {
  const startDate = parseIsoDateInLocal(startDateStr);
  const startDateFormatted = startDate.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const diffMs = now.getTime() - startDate.getTime();
  const isFutureStart = diffMs < 0;
  const absMs = Math.abs(diffMs);

  const totalSeconds = Math.floor(absMs / 1000);
  const totalDays = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  // Calculate calendar years, months, days
  const earlier = isFutureStart ? now : startDate;
  const later = isFutureStart ? startDate : now;

  let years = later.getFullYear() - earlier.getFullYear();
  let months = later.getMonth() - earlier.getMonth();
  let days = later.getDate() - earlier.getDate();

  if (days < 0) {
    months -= 1;
    const prevMonth = new Date(later.getFullYear(), later.getMonth(), 0);
    days += prevMonth.getDate();
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }

  // Upcoming milestone or monthsary/anniversary calculation
  let nextMilestoneTitle = 'Our Story Begins';
  let nextTargetDate = new Date(startDate);

  if (!isFutureStart) {
    // Find next monthly or yearly anniversary on the 15th (or start day-of-month)
    const startDay = startDate.getDate();
    let candidate = new Date(
      now.getFullYear(),
      now.getMonth(),
      startDay,
      0,
      0,
      0
    );
    if (candidate.getTime() <= now.getTime()) {
      candidate = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        startDay,
        0,
        0,
        0
      );
    }
    nextTargetDate = candidate;
    const monthsDiff =
      (candidate.getFullYear() - startDate.getFullYear()) * 12 +
      (candidate.getMonth() - startDate.getMonth());

    if (monthsDiff > 0 && monthsDiff % 12 === 0) {
      const yrCount = monthsDiff / 12;
      nextMilestoneTitle = `${yrCount} Year Anniversary`;
    } else {
      nextMilestoneTitle = `Month ${Math.max(1, monthsDiff)} Monthsary`;
    }
  }

  const msUntilNext = Math.max(0, nextTargetDate.getTime() - now.getTime());
  const daysUntilNextMilestone = Math.ceil(msUntilNext / 86400000);
  const nextMilestoneDateFormatted = nextTargetDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return {
    isFutureStart,
    startDateFormatted,
    totalDays,
    years: Math.max(0, years),
    months: Math.max(0, months),
    days: Math.max(0, days),
    hours: Math.max(0, hours),
    minutes: Math.max(0, minutes),
    seconds: Math.max(0, seconds),
    nextMilestoneTitle,
    nextMilestoneDateFormatted,
    daysUntilNextMilestone,
  };
}

export function formatReadableDate(isoDate: string): string {
  if (!isoDate) return '';
  const date = parseIsoDateInLocal(isoDate);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function getMonthYearLabel(year: number, month: number): string {
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export function getTodayIsoString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function isSameMonthAndDayFromEarlierYear(
  memoryDateIso: string,
  today: Date = new Date()
): boolean {
  const parts = memoryDateIso.split('-').map((n) => parseInt(n, 10));
  if (parts.length !== 3 || parts.some(isNaN)) return false;
  const [y, m, d] = parts;
  return (
    y < today.getFullYear() &&
    m === today.getMonth() + 1 &&
    d === today.getDate()
  );
}

export interface BirthdayInfo {
  partnerKey: 'partnerOne' | 'partnerTwo';
  partnerName: string;
  affectionateName: string;
  funnyName: string;
  birthdayIso: string;
  month: number;
  day: number;
  birthYear?: number;
  hasYear: boolean;
  formattedBirthday: string;
  daysUntil: number;
  isToday: boolean;
  isTomorrow: boolean;
  isWithinAWeek: boolean;
  turningAge?: number;
  currentAge?: number;
  nextBirthdayDate: Date;
  nextBirthdayFormatted: string;
}

export function parseBirthdayComponents(birthdayIso: string): {
  year?: number;
  month: number;
  day: number;
} | null {
  if (!birthdayIso || typeof birthdayIso !== 'string') return null;
  const clean = birthdayIso.trim();
  const parts = clean.split('-').map((p) => parseInt(p, 10));

  if (parts.length === 3 && !parts.some(isNaN)) {
    // YYYY-MM-DD
    const [y, m, d] = parts;
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return { year: y, month: m, day: d };
    }
  } else if (parts.length === 2 && !parts.some(isNaN)) {
    // MM-DD
    const [m, d] = parts;
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return { month: m, day: d };
    }
  }
  return null;
}

export function calculateBirthdayInfo(
  birthdayIso: string | undefined,
  partnerKey: 'partnerOne' | 'partnerTwo',
  partnerName: string,
  affectionateName: string,
  funnyName: string,
  now: Date = new Date()
): BirthdayInfo | null {
  if (!birthdayIso) return null;
  const parsed = parseBirthdayComponents(birthdayIso);
  if (!parsed) return null;

  const { year, month, day } = parsed;
  const hasYear = typeof year === 'number' && year > 1900 && year <= now.getFullYear() + 1;

  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const thisYearBirthday = new Date(now.getFullYear(), month - 1, day, 0, 0, 0, 0);

  let nextBirthdayDate: Date;
  let isToday = false;
  let daysUntil = 0;

  if (thisYearBirthday.getTime() === todayMidnight.getTime()) {
    isToday = true;
    daysUntil = 0;
    nextBirthdayDate = thisYearBirthday;
  } else if (thisYearBirthday.getTime() > todayMidnight.getTime()) {
    nextBirthdayDate = thisYearBirthday;
    daysUntil = Math.round((nextBirthdayDate.getTime() - todayMidnight.getTime()) / 86400000);
  } else {
    nextBirthdayDate = new Date(now.getFullYear() + 1, month - 1, day, 0, 0, 0, 0);
    daysUntil = Math.round((nextBirthdayDate.getTime() - todayMidnight.getTime()) / 86400000);
  }

  const isTomorrow = daysUntil === 1;
  const isWithinAWeek = daysUntil > 0 && daysUntil <= 7;

  let turningAge: number | undefined;
  let currentAge: number | undefined;

  if (hasYear && year) {
    turningAge = nextBirthdayDate.getFullYear() - year;
    currentAge = isToday
      ? turningAge
      : (thisYearBirthday.getTime() > todayMidnight.getTime() ? turningAge - 1 : turningAge);
  }

  const monthName = nextBirthdayDate.toLocaleDateString('en-US', { month: 'long' });
  const formattedBirthday = hasYear && year
    ? `${monthName} ${day}, ${year}`
    : `${monthName} ${day}`;

  const nextBirthdayFormatted = nextBirthdayDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return {
    partnerKey,
    partnerName,
    affectionateName,
    funnyName,
    birthdayIso,
    month,
    day,
    birthYear: hasYear ? year : undefined,
    hasYear,
    formattedBirthday,
    daysUntil,
    isToday,
    isTomorrow,
    isWithinAWeek,
    turningAge,
    currentAge,
    nextBirthdayDate,
    nextBirthdayFormatted,
  };
}

export function getUpcomingBirthdays(
  coupleConfig: {
    partnerOneName: string;
    partnerTwoName: string;
    affectionateLabelOne: string;
    affectionateLabelTwo: string;
    funnyLabelOne: string;
    funnyLabelTwo: string;
    partnerOneBirthday?: string;
    partnerTwoBirthday?: string;
  },
  now: Date = new Date()
): BirthdayInfo[] {
  const list: BirthdayInfo[] = [];

  const b1 = calculateBirthdayInfo(
    coupleConfig.partnerOneBirthday,
    'partnerOne',
    coupleConfig.partnerOneName,
    coupleConfig.affectionateLabelOne,
    coupleConfig.funnyLabelOne,
    now
  );
  if (b1) list.push(b1);

  const b2 = calculateBirthdayInfo(
    coupleConfig.partnerTwoBirthday,
    'partnerTwo',
    coupleConfig.partnerTwoName,
    coupleConfig.affectionateLabelTwo,
    coupleConfig.funnyLabelTwo,
    now
  );
  if (b2) list.push(b2);

  // Sort by whoever's birthday is coming soonest
  return list.sort((a, b) => a.daysUntil - b.daysUntil);
}

