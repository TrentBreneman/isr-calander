import { 
  format, 
  startOfMonth, 
  startOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  addDays 
} from "date-fns";

export interface CalendarEvent {
  id: string;
  title: string;
  startDate: string; // ISO string YYYY-MM-DD
  endDate?: string;   // ISO string YYYY-MM-DD
  time?: string;      // HH:mm
  color: string;
  user_id?: string;
}

export interface EventLayout {
  event: CalendarEvent;
  startCol: number;
  span: number;
  gridRow: number;
}

export function formatDate(date: Date) {
  return format(date, "yyyy-MM-dd");
}

export function getWeeks(year: number, month: number) {
  const monthStart = startOfMonth(new Date(year, month));
  const calendarStart = startOfWeek(monthStart);

  const allDays = eachDayOfInterval({
    start: calendarStart,
    end: addDays(calendarStart, 41)
  });

  const weeks = [];
  for (let i = 0; i < allDays.length; i += 7) {
    weeks.push(
      allDays.slice(i, i + 7).map(date => ({
        date,
        isCurrentMonth: isSameMonth(date, monthStart)
      }))
    );
  }
  return weeks;
}

export function layoutEventsForWeek(events: CalendarEvent[], weekDays: {date: Date}[]) {
  const weekStartStr = formatDate(weekDays[0].date);
  const weekEndStr = formatDate(weekDays[6].date);
  
  const weekEvents = events.filter(e => {
    const start = e.startDate;
    const end = e.endDate || e.startDate;
    return start <= weekEndStr && end >= weekStartStr;
  });

  // Sort: Multi-day events first, then by start date, then by time
  weekEvents.sort((a, b) => {
    const aEnd = a.endDate || a.startDate;
    const bEnd = b.endDate || b.startDate;
    const aIsMulti = a.startDate !== aEnd;
    const bIsMulti = b.startDate !== bEnd;

    if (aIsMulti && !bIsMulti) return -1;
    if (!aIsMulti && bIsMulti) return 1;
    
    if (a.startDate !== b.startDate) return a.startDate.localeCompare(b.startDate);
    
    if (a.time && b.time) return a.time.localeCompare(b.time);
    if (a.time) return 1;
    if (b.time) return -1;
    return 0;
  });

  const layout: EventLayout[] = [];
  const occupied = new Set<string>();

  weekEvents.forEach(event => {
    const eStart = event.startDate;
    const eEnd = event.endDate || event.startDate;
    const isMulti = eStart !== eEnd;
    
    let startCol = -1;
    let endCol = -1;
    
    for (let i = 0; i < 7; i++) {
      const dayStr = formatDate(weekDays[i].date);
      if (dayStr >= eStart && dayStr <= eEnd) {
        if (startCol === -1) startCol = i;
        endCol = i;
      }
    }
    
    if (startCol !== -1) {
      if (isMulti || !event.time) {
        // Multi-day or All-day: Use slots at the top (Rows 2-5)
        let slot = 0;
        let pushed = false;
        while (slot < 4) {
          let isFree = true;
          for (let c = startCol; c <= endCol; c++) {
            if (occupied.has(`${slot}-${c}`)) {
              isFree = false;
              break;
            }
          }
          
          if (isFree) {
            for (let c = startCol; c <= endCol; c++) {
              occupied.add(`${slot}-${c}`);
            }
            layout.push({
              event,
              startCol: startCol + 1,
              span: (endCol - startCol) + 1,
              gridRow: slot + 2
            });
            pushed = true;
            break;
          }
          slot++;
        }
        // Fallback for many all-day events
        if (!pushed) {
          layout.push({ event, startCol: startCol + 1, span: (endCol - startCol) + 1, gridRow: 5 });
        }
      } else {
        // Single-day Timed: Position vertically by hour (Rows 6-30)
        const hour = parseInt(event.time.split(":")[0], 10);
        layout.push({
          event,
          startCol: startCol + 1,
          span: 1,
          gridRow: hour + 6
        });
      }
    }
  });
  
  return layout;
}
