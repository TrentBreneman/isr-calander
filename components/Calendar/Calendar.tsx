"use client";

import React, { useState, useEffect } from "react";
import styles from "./Calendar.module.css";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface CalendarEvent {
  id: string;
  title: string;
  startDate: string; // ISO string YYYY-MM-DD
  endDate?: string;   // ISO string YYYY-MM-DD
  time?: string;      // HH:mm
  color: string;
  user_id?: string;
}

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const COLORS = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899"];

// Helper functions for calendar logic
function getWeeks(year: number, month: number) {
  const firstDayOfMonth = new Date(year, month, 1);
  const startDay = firstDayOfMonth.getDay();
  
  const days = [];
  
  // Padding for start of month
  const prevMonthLastDay = new Date(year, month, 0).getDate();
  for (let i = startDay - 1; i >= 0; i--) {
    days.push({
      date: new Date(year, month - 1, prevMonthLastDay - i),
      isCurrentMonth: false
    });
  }
  
  // Current month days
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  for (let i = 1; i <= daysInMonth; i++) {
    days.push({
      date: new Date(year, month, i),
      isCurrentMonth: true
    });
  }
  
  // Padding for end of month
  const remaining = (7 - (days.length % 7)) % 7;
  for (let i = 1; i <= remaining; i++) {
    days.push({
      date: new Date(year, month + 1, i),
      isCurrentMonth: false
    });
  }
  
  const weeks = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }
  return weeks;
}

function formatDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatTime12h(timeStr: string | undefined) {
  if (!timeStr) return "";
  const [h, m] = timeStr.split(":");
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const h12 = hour % 12 || 12;
  return `${h12}:${m} ${ampm}`;
}

interface EventLayout {
  event: CalendarEvent;
  startCol: number;
  span: number;
  gridRow: number;
}

function layoutEventsForWeek(events: CalendarEvent[], weekDays: {date: Date}[]) {
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
            break;
          }
          slot++;
        }
        // Fallback for many all-day events
        if (layout.length > 0 && layout[layout.length - 1].event.id !== event.id) {
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

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [newEvent, setNewEvent] = useState({ 
    title: "", 
    startDate: "", 
    endDate: "", 
    time: "", 
    color: COLORS[0] 
  });
  
  const router = useRouter();
  const supabase = createClient();

  // Check auth and load events
  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      
      if (!user) {
        router.push("/login");
        return;
      }

      await fetchEvents();
      setLoading(false);
    }
    init();
  }, [router]);

  async function fetchEvents() {
    const { data, error } = await supabase
      .from('events')
      .select('*');
    
    if (error) {
      console.error("Error fetching events:", error);
    } else if (data) {
      const mappedEvents = data.map((e: any) => ({
        ...e,
        startDate: e.start_date,
        endDate: e.end_date
      }));
      setEvents(mappedEvents as CalendarEvent[]);
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const handleExportICS = () => {
    if (events.length === 0) return;

    let icsContent = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//iSolvRisk Calendar//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
    ].join("\r\n") + "\r\n";

    events.forEach(event => {
      const start = event.startDate.replace(/-/g, "");
      const end = (event.endDate || event.startDate).replace(/-/g, "");

      let dtStartValue = "";
      let dtEndValue = "";

      if (event.time) {
        const timeStr = event.time.replace(":", "") + "00";
        dtStartValue = `:${start}T${timeStr}`;
        const startDateObj = new Date(event.startDate + "T" + event.time);
        const endDateObj = new Date(startDateObj.getTime() + 60 * 60 * 1000);
        const endYear = endDateObj.getFullYear();
        const endMonth = String(endDateObj.getMonth() + 1).padStart(2, "0");
        const endDay = String(endDateObj.getDate()).padStart(2, "0");
        const endHour = String(endDateObj.getHours()).padStart(2, "0");
        const endMin = String(endDateObj.getMinutes()).padStart(2, "0");
        dtEndValue = `:${endYear}${endMonth}${endDay}T${endHour}${endMin}00`;
      } else {
        dtStartValue = `;VALUE=DATE:${start}`;
        const endDateObj = new Date(event.endDate || event.startDate);
        endDateObj.setDate(endDateObj.getDate() + 1);
        const endYear = endDateObj.getFullYear();
        const endMonth = String(endDateObj.getMonth() + 1).padStart(2, "0");
        const endDay = String(endDateObj.getDate()).padStart(2, "0");
        dtEndValue = `;VALUE=DATE:${endYear}${endMonth}${endDay}`;
      }

      icsContent += [
        "BEGIN:VEVENT",
        `UID:${event.id}@companycalendar.com`,
        `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").split(".")[0]}Z`,
        `DTSTART${dtStartValue}`,
        `DTEND${dtEndValue}`,
        `SUMMARY:${event.title}`,
        "END:VEVENT",
      ].join("\r\n") + "\r\n";
    });

    icsContent += "END:VCALENDAR";

    const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
    const link = document.body.appendChild(document.createElement("a"));
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute("download", "company-calendar.ics");
    link.click();
    link.remove();
  };
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const today = () => setCurrentDate(new Date());

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEvent.title || !newEvent.startDate || !user) return;

    const eventData = {
      title: newEvent.title,
      start_date: newEvent.startDate,
      end_date: newEvent.endDate || newEvent.startDate,
      time: newEvent.time,
      color: newEvent.color,
      user_id: user.id
    };

    if (editingEvent) {
      const { error } = await supabase
        .from('events')
        .update(eventData)
        .eq('id', editingEvent.id);

      if (error) {
        alert("Error updating event: " + error.message);
      } else {
        await fetchEvents();
        closeModal();
      }
    } else {
      const { error } = await supabase
        .from('events')
        .insert([eventData]);

      if (error) {
        alert("Error adding event: " + error.message);
      } else {
        await fetchEvents();
        closeModal();
      }
    }
  };

  const deleteEvent = async (id: string) => {
    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', id);

    if (error) {
      alert("Error deleting event: " + error.message);
    } else {
      setEvents(events.filter(e => e.id !== id));
      closeModal();
    }
  };

  const openEditModal = (event: CalendarEvent) => {
    setEditingEvent(event);
    setNewEvent({
      title: event.title,
      startDate: event.startDate,
      endDate: event.endDate || event.startDate,
      time: event.time || "",
      color: event.color
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingEvent(null);
    setNewEvent({ title: "", startDate: "", endDate: "", time: "", color: COLORS[0] });
  };

  if (loading) return <div className={styles.loading}>Loading Calendar...</div>;

  const weeks = getWeeks(year, month);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.userInfo}>
          <span>Logged in as <strong>{user?.email}</strong></span>
          <button onClick={handleLogout} className={styles.btnLogout}>Sign Out</button>
        </div>
        <button onClick={handleExportICS} className={styles.btnSecondary} style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}>
          Sync to Apple Calendar
        </button>
      </div>
      
      <div className={styles.controls}>
        <div className={styles.monthInfo}>
          <h2>{MONTHS[month]} {year}</h2>
        </div>
        <div className={styles.nav}>
          <button onClick={today} className={styles.btnSecondary}>Today</button>
          <button onClick={prevMonth} className={styles.btnNav}>&larr;</button>
          <button onClick={nextMonth} className={styles.btnNav}>&rarr;</button>
          <button onClick={() => setShowModal(true)} className={styles.btnPrimary}>Add Event</button>
        </div>
      </div>

      <div className={styles.calendarGrid}>
        <div className={styles.dayHeaders}>
          {DAYS_OF_WEEK.map(day => (
            <div key={day} className={styles.dayHeader}>{day}</div>
          ))}
        </div>
        
        {weeks.map((week, weekIdx) => {
          const layouts = layoutEventsForWeek(events, week);
          return (
            <div key={weekIdx} className={styles.week}>
              {/* Day backgrounds and numbers */}
              {week.map((day, dayIdx) => {
                const dateStr = formatDate(day.date);
                const isToday = new Date().toDateString() === day.date.toDateString();
                return (
                  <React.Fragment key={dateStr}>
                    <div 
                      className={`${styles.dayBackground} ${isToday ? styles.today : ""} ${!day.isCurrentMonth ? styles.notCurrentMonth : ""}`}
                      style={{ gridColumn: dayIdx + 1 }}
                    />
                    <div className={`${styles.dayNumberContainer} ${!day.isCurrentMonth ? styles.notCurrentMonth : ""} ${isToday ? styles.today : ""}`} style={{ gridColumn: dayIdx + 1 }}>
                      {day.isCurrentMonth && <span className={styles.dayNumber}>{day.date.getDate()}</span>}
                    </div>
                    {day.isCurrentMonth && (
                      <button 
                        className={styles.addDayBtn}
                        style={{ gridColumn: dayIdx + 1 }}
                        onClick={() => {
                          setNewEvent({ ...newEvent, startDate: dateStr, endDate: dateStr });
                          setShowModal(true);
                        }}
                      >
                        +
                      </button>
                    )}
                  </React.Fragment>
                );
              })}

              {/* Event bars */}
              {layouts.map(({ event, startCol, span, gridRow }, layoutIdx) => {
                const eStart = event.startDate;
                const eEnd = event.endDate || event.startDate;
                const weekStart = formatDate(week[0].date);
                const weekEnd = formatDate(week[6].date);
                
                const isStart = eStart >= weekStart && eStart <= weekEnd;
                const isEnd = eEnd >= weekStart && eEnd <= weekEnd;
                const isMultiDay = eStart !== eEnd;

                let className = styles.eventBar;
                if (isMultiDay) {
                  if (isStart && isEnd) className += ` ${styles.singleDay}`;
                  else if (isStart) className += ` ${styles.multiDayStart}`;
                  else if (isEnd) className += ` ${styles.multiDayEnd}`;
                  else className += ` ${styles.multiDayMiddle}`;
                } else {
                  className += ` ${styles.singleDay}`;
                }

                return (
                  <div 
                    key={`${event.id}-${layoutIdx}`}
                    className={className}
                    style={{ 
                      gridColumn: `${startCol} / span ${span}`,
                      gridRow: gridRow,
                      backgroundColor: event.color
                    }}
                    title={`${event.title}${event.time ? ` at ${formatTime12h(event.time)}` : ""}`}
                    onClick={() => openEditModal(event)}
                  >
                    {isStart && event.time && <span className={styles.eventTime}>{formatTime12h(event.time)}</span>}
                    {isStart && <span className={styles.eventTitle}>{event.title}</span>}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {showModal && (
        <div className={styles.modalOverlay} onClick={closeModal}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h3>{editingEvent ? "Edit Event" : "Add New Event"}</h3>
            <form onSubmit={handleSaveEvent}>
              <div className={styles.formGroup}>
                <label>Event Title</label>
                <input 
                  autoFocus
                  type="text" 
                  value={newEvent.title} 
                  onChange={e => setNewEvent({...newEvent, title: e.target.value})}
                  placeholder="e.g. Team Meeting"
                  required
                />
              </div>
              <div className={styles.row}>
                <div className={styles.formGroup}>
                  <label>Start Date</label>
                  <input 
                    type="date" 
                    value={newEvent.startDate} 
                    onChange={e => {
                      const newStart = e.target.value;
                      setNewEvent(prev => ({
                        ...prev, 
                        startDate: newStart,
                        endDate: (prev.endDate && prev.endDate < newStart) ? newStart : prev.endDate
                      }));
                    }}
                    required
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>End Date</label>
                  <input 
                    type="date" 
                    value={newEvent.endDate || newEvent.startDate} 
                    min={newEvent.startDate}
                    onChange={e => setNewEvent({...newEvent, endDate: e.target.value})}
                    required
                  />
                </div>
              </div>
              <div className={styles.formGroup}>
                <label>Time (optional)</label>
                <input 
                  type="time" 
                  value={newEvent.time} 
                  onChange={e => setNewEvent({...newEvent, time: e.target.value})}
                />
              </div>
              <div className={styles.formGroup}>
                <label>Label Color</label>
                <div className={styles.colorPicker}>
                  {COLORS.map(c => (
                    <div 
                      key={c} 
                      className={`${styles.colorOption} ${newEvent.color === c ? styles.selectedColor : ""}`}
                      style={{ backgroundColor: c }}
                      onClick={() => setNewEvent({...newEvent, color: c})}
                    />
                  ))}
                </div>
              </div>
              <div className={styles.modalActions}>
                {editingEvent && (
                  <button 
                    type="button" 
                    onClick={() => deleteEvent(editingEvent.id)} 
                    className={styles.btnDelete}
                    style={{ marginRight: 'auto' }}
                  >
                    Delete
                  </button>
                )}
                <button type="button" onClick={closeModal} className={styles.btnSecondary}>Cancel</button>
                <button type="submit" className={styles.btnPrimary}>
                  {editingEvent ? "Update Event" : "Save Event"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
