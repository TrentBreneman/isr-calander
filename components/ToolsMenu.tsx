"use client";

import React, { useState, useRef, useEffect } from "react";
import { Menu, X, CreditCard } from "lucide-react";
import styles from "./ToolsMenu.module.css";
import BusinessCardScanner from "./BusinessCardScanner";

export default function ToolsMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className={styles.container} ref={menuRef}>
      {isOpen && (
        <div className={styles.menu}>
          <button 
            className={styles.menuItem} 
            onClick={() => {
              setShowScanner(true);
              setIsOpen(false);
            }}
          >
            <CreditCard size={20} className={styles.menuIcon} />
            Business Card Scanner
          </button>
          {/* Add more tools here later */}
        </div>
      )}
      
      <button 
        className={styles.fab} 
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Open Tools Menu"
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {showScanner && (
        <BusinessCardScanner onClose={() => setShowScanner(false)} />
      )}
    </div>
  );
}
