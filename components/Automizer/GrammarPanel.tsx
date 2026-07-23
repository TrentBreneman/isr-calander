"use client";

import React from 'react';
import { Sparkles, CheckCircle, XCircle } from 'lucide-react';
import type { GrammarSuggestion } from '@/lib/automizer/types';
import styles from './Automizer.module.css';

interface GrammarPanelProps {
  suggestions: GrammarSuggestion[];
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
  onAcceptAll: () => void;
}

export default function GrammarPanel({ suggestions, onAccept, onReject, onAcceptAll }: GrammarPanelProps) {
  const pending = suggestions.filter(s => s.accepted === undefined);
  const accepted = suggestions.filter(s => s.accepted === true);

  return (
    <div className={styles.grammarPanel}>
      <div className={styles.grammarHeader}>
        <Sparkles size={15} />
        <span>Grammar & Style Review</span>
        <span className={styles.grammarBadge}>{pending.length} pending</span>
        {pending.length > 0 && (
          <button className={styles.grammarAcceptAll} onClick={onAcceptAll}>
            Accept All
          </button>
        )}
      </div>

      {suggestions.length === 0 && (
        <div className={styles.grammarComingSoon}>
          <Sparkles size={20} />
          <p>Grammar review integration coming soon.</p>
          <p className={styles.grammarSubtext}>
            LanguageTool integration will provide real-time spelling, grammar,
            punctuation, and iSolvRisk style suggestions here.
          </p>
        </div>
      )}

      {suggestions.map((s) => (
        <div
          key={s.id}
          className={`${styles.grammarCard} ${
            s.accepted === true
              ? styles.grammarAccepted
              : s.accepted === false
              ? styles.grammarRejected
              : ''
          }`}
        >
          <div className={styles.grammarOriginal}>
            <span className={styles.grammarLabel}>Original</span>
            <span className={styles.grammarText}>&ldquo;{s.original}&rdquo;</span>
          </div>
          <div className={styles.grammarSuggested}>
            <span className={styles.grammarLabel}>Suggested</span>
            <span className={styles.grammarText}>&ldquo;{s.suggested}&rdquo;</span>
          </div>
          <div className={styles.grammarReason}>{s.reason}</div>
          {s.accepted === undefined && (
            <div className={styles.grammarActions}>
              <button
                className={styles.grammarAcceptBtn}
                onClick={() => onAccept(s.id)}
              >
                <CheckCircle size={13} /> Accept
              </button>
              <button
                className={styles.grammarRejectBtn}
                onClick={() => onReject(s.id)}
              >
                <XCircle size={13} /> Reject
              </button>
            </div>
          )}
          {s.accepted === true && (
            <div className={styles.grammarStatus}>
              <CheckCircle size={13} /> Accepted
            </div>
          )}
          {s.accepted === false && (
            <div className={styles.grammarStatusRejected}>
              <XCircle size={13} /> Rejected
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
