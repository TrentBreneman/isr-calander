// components/Automizer/HitchhikersReview.tsx
"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import type {
  HitchhikersGuide,
  HGChallenge,
  HGSection,
  HGSubsection,
  HGSectionNumber,
} from "@/lib/automizer/types";
import { HG_SECTION_TITLES } from "@/lib/automizer/types";
import styles from "./Automizer.module.css";

interface HitchhikersReviewProps {
  document: HitchhikersGuide;
  onChange: (doc: HitchhikersGuide) => void; 
}

const ROMAN_ORDER: HGSectionNumber[] = [
  "I",
  "II",
  "III",
  "IV",
  "V",
  "VI",
  "VII",
  "VIII",
  "IX",
];

function SubsectionEditor({
  sub,
  onChange,
  onRemove,
}: {
  sub: HGSubsection;
  onChange: (updatedSub: HGSubsection) => void;
  onRemove: () => void;
}) {
  return (
    <div className={styles.hgSubsection}>
      <div className={styles.hgSubsectionHeader}>
        <span className={styles.hgAlphaLabel}>{sub.label}.</span>
        <textarea
          className={styles.fieldInput}
          value={
            Array.isArray(sub.content) ? sub.content.join("\n") : sub.content
          }
          onChange={(e) =>
            onChange({ ...sub, content: e.target.value.split("\n") })
          }
          placeholder="Subsection content..."
          rows={Math.max(
            2,
            Array.isArray(sub.content) ? sub.content.length : 1,
          )}
        />
        <button
          className={styles.removeBtn}
          onClick={onRemove}
          aria-label="Remove subsection"
        >
          <Trash2 size={12} />
        </button>
      </div>
      <div className={styles.hgPoints}>
        {sub.points.map((pt, i) => {
          const isObj = typeof pt !== "string";
          const pointText = isObj ? pt.text : pt;
          const subPoints = isObj ? pt.subPoints : [];

          return (
            <div key={i} className={styles.hgPointEditor}>
              <div className={styles.hgPointRow}>
                <span className={styles.hgPointNum}>{i + 1}.</span>
                <input
                  type="text"
                  className={styles.fieldInput}
                  value={pointText}
                  onChange={(e) => {
                    const newPoints = [...sub.points];
                    if (isObj) {
                      newPoints[i] = { ...pt, text: e.target.value };
                    } else {
                      newPoints[i] = e.target.value;
                    }
                    onChange({ ...sub, points: newPoints });
                  }}
                  placeholder="Supporting point..."
                />
                <button
                  className={styles.removeBtn}
                  onClick={() =>
                    onChange({
                      ...sub,
                      points: sub.points.filter((_, idx) => idx !== i),
                    })
                  }
                  aria-label="Remove point"
                >
                  <Trash2 size={11} />
                </button>
              </div>

              {isObj && subPoints.length > 0 && (
                <div className={styles.hgSubPoints}>
                  {subPoints.map((subPt, subI) => (
                    <div key={subI} className={styles.hgPointRow}>
                      <span className={styles.hgPointNum}>
                        {/* We can use letters for sub-points like a, b, c */}
                        {String.fromCharCode(97 + subI)}.
                      </span>
                      <input
                        type="text"
                        className={styles.fieldInput}
                        value={subPt}
                        onChange={(e) => {
                          const newPoints = [...sub.points];
                          const parentPoint = newPoints[i];
                          if (typeof parentPoint !== "string") {
                            const newSubPoints = [...parentPoint.subPoints];
                            newSubPoints[subI] = e.target.value;
                            newPoints[i] = {
                              ...parentPoint,
                              subPoints: newSubPoints,
                            };
                            onChange({ ...sub, points: newPoints });
                          }
                        }}
                        placeholder="Nested point..."
                      />
                      <button
                        className={styles.removeBtn}
                        onClick={() => {
                          const newPoints = [...sub.points];
                          const parentPoint = newPoints[i];
                          if (typeof parentPoint !== "string") {
                            const newSubPoints = parentPoint.subPoints.filter(
                              (_, idx) => idx !== subI,
                            );
                            newPoints[i] = {
                              ...parentPoint,
                              subPoints: newSubPoints,
                            };
                            onChange({ ...sub, points: newPoints });
                          }
                        }}
                        aria-label="Remove nested point"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        <button
          className={styles.addItemBtn}
          onClick={() => onChange({ ...sub, points: [...sub.points, ""] })}
        >
          <Plus size={12} /> Add Point
        </button>
      </div>
    </div>
  );
}

function SectionEditor({
  numeral,
  section,
  onChange,
}: {
  numeral: HGSectionNumber;
  section: HGSection | undefined;
  onChange: (updatedSec: HGSection) => void; 
}) {
  const [expanded, setExpanded] = useState(!!section);
  const current: HGSection = section ?? {
    number: numeral,
    title: HG_SECTION_TITLES[numeral],
    subsections: [],
  };

  const addSubsection = () => {
    const nextLabel = String.fromCharCode(65 + current.subsections.length);
    onChange({
      ...current,
      subsections: [
        ...current.subsections,
        { label: nextLabel, content: [], points: [] },
      ],
    });
  };

  return (
    <div className={styles.hgSectionCard}>
      <div
        className={`${styles.hgSectionHeader} ${!section ? styles.hgSectionMissing : ""}`}
        onClick={() => setExpanded(!expanded)}
      >
        <span className={styles.hgRomanNumeral}>{numeral}.</span>
        <span className={styles.hgSectionTitle}>{current.title}</span>
        {!section && <span className={styles.hgMissingBadge}>Missing</span>}
        {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </div>

      {expanded && (
        <div className={styles.hgSectionBody}>
          {current.subsections.map((sub, i) => (
            <SubsectionEditor
              key={i}
              sub={sub}
              onChange={(updatedSub) => {
                const subs = [...current.subsections];
                subs[i] = updatedSub;
                onChange({ ...current, subsections: subs });
              }}
              onRemove={() =>
                onChange({
                  ...current,
                  subsections: current.subsections.filter(
                    (_, idx) => idx !== i,
                  ),
                })
              }
            />
          ))}
          <button className={styles.addItemBtn} onClick={addSubsection}>
            <Plus size={13} /> Add Subsection
          </button>
        </div>
      )}
    </div>
  );
}

function ChallengeEditor({
  challenge,
  onChange,
  onRemove,
}: {
  challenge: HGChallenge;
  onChange: (updatedChal: HGChallenge) => void; 
  onRemove: () => void;
}) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className={styles.challengeCard}>
      <div
        className={styles.challengeCardHeader}
        onClick={() => setExpanded(!expanded)}
      >
        <input
          type="text"
          value={challenge.title}
          onChange={(e) => onChange({ ...challenge, title: e.target.value })}
          className={styles.challengeTitleInput}
          onClick={(e) => e.stopPropagation()}
          placeholder="Challenge Title"
        />
        <div className={styles.challengeCardActions}>
          <button
            className={styles.removeCardBtn}
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            aria-label="Remove challenge"
          >
            <Trash2 size={14} />
          </button>
          {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </div>
      </div>

      {expanded && (
        <div className={styles.challengeCardBody}>
          {ROMAN_ORDER.map((numeral) => (
            <SectionEditor
              key={numeral}
              numeral={numeral}
              section={challenge.sections[numeral]}
              onChange={(updatedSec) =>
                onChange({
                  ...challenge,
                  sections: { ...challenge.sections, [numeral]: updatedSec },
                })
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function HitchhikersReview({
  document: doc,
  onChange,
}: HitchhikersReviewProps) {
  const addChallenge = () => {
    onChange({
      ...doc,
      challenges: [
        ...doc.challenges,
        {
          id: `hg-challenge-new-${Date.now()}`,
          title: "New Challenge",
          sections: {},
        },
      ],
    });
  };

  return (
    <div className={styles.reviewContainer}>
      <div className={styles.reviewSection}>
        <div className={styles.reviewSectionHeader}>
          <h4 className={styles.reviewSectionTitle}>
            Hitchhiker&apos;s Guide Challenges
          </h4>
          <span className={styles.reviewSectionCount}>
            {doc.challenges.length} challenge
            {doc.challenges.length !== 1 ? "s" : ""}
          </span>
        </div>

        {doc.challenges.map((challenge, i) => (
          <ChallengeEditor
            key={challenge.id}
            challenge={challenge}
            onChange={(updatedChal) => {
              const newChallenges = [...doc.challenges];
              newChallenges[i] = updatedChal;
              onChange({ ...doc, challenges: newChallenges });
            }}
            onRemove={() =>
              onChange({
                ...doc,
                challenges: doc.challenges.filter((_, idx) => idx !== i),
              })
            }
          />
        ))}

        <button className={styles.addChallengeBtn} onClick={addChallenge}>
          <Plus size={15} /> Add Challenge
        </button>
      </div>
    </div>
  );
}
