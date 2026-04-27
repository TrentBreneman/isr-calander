"use client";

import React, { useState, useEffect } from "react";
import styles from "./Calendar.module.css";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { 
  format, 
  parseISO
} from "date-fns";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  getWeeks, 
  formatDate, 
  layoutEventsForWeek, 
  CalendarEvent 
} from "@/lib/calendar-utils";

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const COLORS = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899"];

function formatTime12h(timeStr: string | undefined) {
  if (!timeStr) return "";
  const [h, m] = timeStr.split(":");
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const h12 = hour % 12 || 12;
  return `${h12}:${m} ${ampm}`;
}

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showModal, setShowModal] = useState(false);
  const [detailEvent, setDetailEvent] = useState<CalendarEvent | null>(null);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [newEvent, setNewEvent] = useState({ 
    title: "", 
    startDate: "", 
    endDate: "", 
    time: "", 
    color: COLORS[0] 
  });
  
  const router = useRouter();
  const supabase = createClient();
  const queryClient = useQueryClient();

  // Check auth
  useEffect(() => {
    async function init() {
      let { data: { user } } = await supabase.auth.getUser();
      
      if (!user && process.env.NODE_ENV === 'development' && typeof window !== 'undefined' && localStorage.getItem('dev_bypass')) {
        user = { 
          id: '00000000-0000-0000-0000-000000000000', 
          email: 'dev@local.host',
          user_metadata: { full_name: 'Developer' }
        } as any;
      }
      
      setUser(user);
      if (!user) router.push("/login");
      setAuthLoading(false);
    }
    init();
  }, [router]);

  // Query events
  const { data: events = [], isLoading: eventsLoading } = useQuery({
    queryKey: ['events'],
    queryFn: async () => {
      const { data, error } = await supabase.from('events').select('*');
      if (error) throw error;
      return data.map((e: any) => ({
        ...e,
        startDate: e.start_date,
        endDate: e.end_date
      })) as CalendarEvent[];
    },
    enabled: !!user
  });

  // Mutations
  const saveMutation = useMutation({
    mutationFn: async (eventData: any) => {
      if (editingEvent) {
        const { error } = await supabase.from('events').update(eventData).eq('id', editingEvent.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('events').insert([eventData]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      closeModal();
    },
    onError: (error: any) => alert("Error saving event: " + error.message)
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('events').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      closeModal();
    },
    onError: (error: any) => alert("Error deleting event: " + error.message)
  });

  const handleLogout = async () => {
    localStorage.removeItem("dev_bypass");
    await supabase.auth.signOut();
    queryClient.clear();
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

    saveMutation.mutate({
      title: newEvent.title,
      start_date: newEvent.startDate,
      end_date: newEvent.endDate || newEvent.startDate,
      time: newEvent.time,
      color: newEvent.color,
      user_id: user.id
    });
  };

  const deleteEvent = (id: string) => {
    if (confirm("Are you sure you want to delete this event?")) {
      deleteMutation.mutate(id);
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

  if (authLoading || eventsLoading) return <div className={styles.loading}>Loading Calendar...</div>;

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
                    onClick={(e) => {
                      e.stopPropagation();
                      setDetailEvent(event);
                    }}
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

      {detailEvent && (
        <div className={styles.modalOverlay} onClick={() => setDetailEvent(null)}>
          <div className={styles.detailCard} onClick={e => e.stopPropagation()}>
            <div className={styles.detailHeader} style={{ borderLeft: `4px solid ${detailEvent.color}` }}>
              <h3>{detailEvent.title}</h3>
              <button className={styles.btnClose} onClick={() => setDetailEvent(null)}>&times;</button>
            </div>
            <div className={styles.detailBody}>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Date:</span>
                <span>
                  {format(parseISO(detailEvent.startDate), "PPP")}
                  {detailEvent.endDate && detailEvent.endDate !== detailEvent.startDate && (
                    <> - {format(parseISO(detailEvent.endDate), "PPP")}</>
                  )}
                </span>
              </div>
              {detailEvent.time && (
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Time:</span>
                  <span>{formatTime12h(detailEvent.time)}</span>
                </div>
              )}
            </div>
            <div className={styles.detailActions}>
              <button 
                className={styles.btnSecondary} 
                onClick={() => {
                  openEditModal(detailEvent);
                  setDetailEvent(null);
                }}
              >
                Edit
              </button>
              <button 
                className={styles.btnDelete} 
                onClick={() => {
                  deleteEvent(detailEvent.id);
                  setDetailEvent(null);
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
