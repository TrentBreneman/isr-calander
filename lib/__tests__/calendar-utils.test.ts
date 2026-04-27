import { describe, it, expect } from 'vitest';
import { layoutEventsForWeek, CalendarEvent } from '../calendar-utils';

describe('layoutEventsForWeek', () => {
  const weekDays = [
    { date: new Date(2026, 3, 26) }, // Sun
    { date: new Date(2026, 3, 27) }, // Mon
    { date: new Date(2026, 3, 28) }, // Tue
    { date: new Date(2026, 3, 29) }, // Wed
    { date: new Date(2026, 3, 30) }, // Thu
    { date: new Date(2026, 4, 1) },  // Fri
    { date: new Date(2026, 4, 2) },  // Sat
  ];

  it('should layout a single day event correctly', () => {
    const events: CalendarEvent[] = [{
      id: '1',
      title: 'Test Event',
      startDate: '2026-04-27',
      color: 'red'
    }];
    const layout = layoutEventsForWeek(events, weekDays);
    expect(layout).toHaveLength(1);
    expect(layout[0].startCol).toBe(2); // Monday
    expect(layout[0].span).toBe(1);
    expect(layout[0].gridRow).toBe(2); // First slot
  });

  it('should handle multi-day events', () => {
    const events: CalendarEvent[] = [{
      id: '1',
      title: 'Multi-day',
      startDate: '2026-04-27',
      endDate: '2026-04-29',
      color: 'blue'
    }];
    const layout = layoutEventsForWeek(events, weekDays);
    expect(layout[0].startCol).toBe(2);
    expect(layout[0].span).toBe(3);
  });

  it('should stack overlapping all-day events', () => {
    const events: CalendarEvent[] = [
      { id: '1', title: 'E1', startDate: '2026-04-27', color: 'red' },
      { id: '2', title: 'E2', startDate: '2026-04-27', color: 'blue' }
    ];
    const layout = layoutEventsForWeek(events, weekDays);
    expect(layout).toHaveLength(2);
    expect(layout[0].gridRow).toBe(2);
    expect(layout[1].gridRow).toBe(3);
  });

  it('should position timed events in hour rows', () => {
    const events: CalendarEvent[] = [{
      id: '1',
      title: 'Timed Event',
      startDate: '2026-04-27',
      time: '14:00',
      color: 'green'
    }];
    const layout = layoutEventsForWeek(events, weekDays);
    expect(layout[0].gridRow).toBe(14 + 6); // hour + 6
  });
});
