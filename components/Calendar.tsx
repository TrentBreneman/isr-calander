"use client";

import React, { useState, useEffect } from "react";
import styles from "./Calendar.module.css";

interface CalendarEvent {
  id: string;
  title: string;
  startDate: string; // ISO string YYYY-MM-DD
  endDate?: string;   // ISO string YYYY-MM-DD
  time?: string;      // HH:mm
  color: string;
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
  const [newEvent, setNewEvent] = useState({ 
    title: "", 
    startDate: "", 
    endDate: "", 
    time: "", 
    color: COLORS[0] 
  });

  // Load events from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("company-events");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Migration: handle old format where it was just 'date'
        const migrated = parsed.map((e: any) => ({
          ...e,
          startDate: e.startDate || e.date,
          endDate: e.endDate || e.date
        }));
        setEvents(migrated);
      } catch (e) {
        console.error("Failed to load events", e);
      }
    }
  }, []);

  // Save events to localStorage
  useEffect(() => {
    localStorage.setItem("company-events", JSON.stringify(events));
  }, [events]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const today = () => setCurrentDate(new Date());

  const handleAddEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEvent.title || !newEvent.startDate) return;

    const event: CalendarEvent = {
      id: Math.random().toString(36).substring(2, 9),
      title: newEvent.title,
      startDate: newEvent.startDate,
      endDate: newEvent.endDate || newEvent.startDate,
      time: newEvent.time,
      color: newEvent.color,
    };

    setEvents([...events, event]);
    setShowModal(false);
    setNewEvent({ title: "", startDate: "", endDate: "", time: "", color: COLORS[0] });
  };

  const deleteEvent = (id: string) => {
    setEvents(events.filter(e => e.id !== id));
  };

  const isWithinRange = (dateStr: string, start: string, end: string) => {
    return dateStr >= start && dateStr <= end;
  };

  // Calendar days grid
  const days = [];
  // Padding for previous month
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push(<div key={`empty-${i}`} className={styles.dayEmpty}></div>);
  }
  // Days of current month
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
                if(confirm(`Delete "${event.title}"?`)) deleteEvent(event.id);
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
        <div className={styles.modalOverlay} onClick={() => setShowModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h3>Add New Event</h3>
            <form onSubmit={handleAddEvent}>
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
                <button type="button" onClick={() => setShowModal(false)} className={styles.btnSecondary}>Cancel</button>
                <button type="submit" className={styles.btnPrimary}>Save Event</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
