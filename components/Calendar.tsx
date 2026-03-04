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
      "PRODID:-//Company Calendar//EN",
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
        // For simplicity, we make it a 1 hour event if no end time exists
        // This is a naive way to add 1 hour, but it works for simple cases.
        // A better way would be using Date objects.
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
        // Add 1 day to end date for all-day exclusivity
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

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

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
    if(!confirm(`Delete this event?`)) return;

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

  const isWithinRange = (dateStr: string, start: string, end: string) => {
    return dateStr >= start && dateStr <= end;
  };

  if (loading) return <div className={styles.loading}>Loading Calendar...</div>;

  const days = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push(<div key={`empty-${i}`} className={styles.dayEmpty}></div>);
  }
  
  for (let i = 1; i <= daysInMonth; i++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(i).padStart(2, "0")}`;
    const dayEvents = events.filter(e => isWithinRange(dateStr, e.startDate, e.endDate || e.startDate));
    const isToday = new Date().toDateString() === new Date(year, month, i).toDateString();

    days.push(
      <div key={i} className={`${styles.day} ${isToday ? styles.today : ""}`}>
        <span className={styles.dayNumber}>{i}</span>
        <div className={styles.eventList}>
          {dayEvents.map(event => (
            <div 
              key={`${event.id}-${dateStr}`} 
              className={styles.eventItem} 
              style={{ backgroundColor: event.color }}
              title={`${event.title}${event.time ? ` at ${event.time}` : ""}`}
              onClick={(e) => {
                e.stopPropagation();
                openEditModal(event);
              }}
            >
              {event.time && <span className={styles.eventTime}>{event.time} </span>}
              {event.title}
            </div>
          ))}
        </div>
        <button 
          className={styles.addDayBtn}
          onClick={() => {
            setNewEvent({ ...newEvent, startDate: dateStr, endDate: dateStr });
            setShowModal(true);
          }}
        >
          +
        </button>
      </div>
    );
  }

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
        {DAYS_OF_WEEK.map(day => (
          <div key={day} className={styles.dayHeader}>{day}</div>
        ))}
        {days}
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
