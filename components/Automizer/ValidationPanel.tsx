"use client";

import React from 'react';
import { AlertCircle, AlertTriangle } from 'lucide-react';
import type { ParseError } from '@/lib/automizer/types';
import styles from './Automizer.module.css';

interface ValidationPanelProps {
  errors: ParseError[];
  warnings: ParseError[];
}

export default function ValidationPanel({ errors, warnings }: ValidationPanelProps) {
  if (errors.length === 0 && warnings.length === 0) {
    return (
      <div className={styles.validationSuccess}>
        <span className={styles.validationSuccessIcon}>✓</span>
        All sections validated successfully.
      </div>
    );
  }

  return (
    <div className={styles.validationPanel}>
      {errors.length > 0 && (
        <div className={styles.validationSection}>
          <div className={styles.validationHeader}>
            <AlertCircle size={14} />
            <span>{errors.length} Error{errors.length !== 1 ? 's' : ''}</span>
          </div>
          <ul className={styles.validationList}>
            {errors.map((e, i) => (
              <li key={i} className={styles.validationError}>
                <span className={styles.validationCode}>{e.code}</span>
                {e.message}
              </li>
            ))}
          </ul>
        </div>
      )}
      {warnings.length > 0 && (
        <div className={styles.validationSection}>
          <div className={styles.validationHeaderWarn}>
            <AlertTriangle size={14} />
            <span>{warnings.length} Warning{warnings.length !== 1 ? 's' : ''}</span>
          </div>
          <ul className={styles.validationList}>
            {warnings.map((w, i) => (
              <li key={i} className={styles.validationWarning}>
                <span className={styles.validationCode}>{w.code}</span>
                {w.message}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
