"use client";

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Plus, Trash2, GripVertical } from 'lucide-react';
import type { GauntletDocument, GauntletChallenge } from '@/lib/automizer/types';
import styles from './Automizer.module.css';

interface GauntletReviewProps {
  document: GauntletDocument;
  onChange: (doc: GauntletDocument) => void;
}

interface ChallengeCardProps {
  challenge: GauntletChallenge;
  sectionIndex: number;
  challengeIndex: number;
  onChange: (updated: GauntletChallenge) => void;
  onRemove: () => void;
}

function EditableList({
  items,
  onChange,
  placeholder,
}: {
  items: string[];
  onChange: (updated: string[]) => void;
  placeholder?: string;
}) {
  return (
    <div className={styles.editableList}>
      {items.map((item, i) => (
        <div key={i} className={styles.editableListItem}>
          <GripVertical size={14} className={styles.dragHandle} />
          <input
            type="text"
            value={item}
            onChange={(e) => {
              const updated = [...items];
              updated[i] = e.target.value;
              onChange(updated);
            }}
            className={styles.editableListInput}
            placeholder={placeholder}
          />
          <button
            className={styles.removeBtn}
            onClick={() => onChange(items.filter((_, idx) => idx !== i))}
            aria-label="Remove item"
          >
            <Trash2 size={13} />
          </button>
        </div>
      ))}
      <button
        className={styles.addItemBtn}
        onClick={() => onChange([...items, ''])}
      >
        <Plus size={13} /> Add
      </button>
    </div>
  );
}

function ChallengeCard({ challenge, onChange, onRemove }: ChallengeCardProps) {
  const [expanded, setExpanded] = useState(true);

  const update = (patch: Partial<GauntletChallenge>) => {
    onChange({ ...challenge, ...patch });
  };

  const targetOutcomeOptions = challenge.modelComponents.possibleOutcomes;

  return (
    <div className={styles.challengeCard}>
      <div className={styles.challengeCardHeader} onClick={() => setExpanded(!expanded)}>
        <div className={styles.challengeCardTitle}>
          <GripVertical size={16} className={styles.dragHandle} />
          <input
            type="text"
            value={challenge.title}
            onChange={(e) => update({ title: e.target.value })}
            className={styles.challengeTitleInput}
            onClick={(e) => e.stopPropagation()}
            placeholder="Challenge Title"
          />
        </div>
        <div className={styles.challengeCardActions}>
          <button
            className={styles.removeCardBtn}
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            aria-label="Remove challenge"
          >
            <Trash2 size={14} />
          </button>
          {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </div>
      </div>

      {expanded && (
        <div className={styles.challengeCardBody}>
          {/* Scenario */}
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Scenario</label>
            <textarea
              className={styles.fieldTextarea}
              value={challenge.scenario.join('\n\n')}
              onChange={(e) =>
                update({ scenario: e.target.value.split('\n\n').filter(Boolean) })
              }
              rows={5}
              placeholder="Enter the scenario text. Separate paragraphs with a blank line."
            />
          </div>

          {/* Task */}
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Task</label>
            <textarea
              className={styles.fieldTextarea}
              value={challenge.task}
              onChange={(e) => update({ task: e.target.value })}
              rows={2}
              placeholder="The participant task description"
            />
          </div>

          {/* Model Components */}
          <div className={styles.sectionDivider}>Model Components</div>

          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Goal / Objective</label>
            <input
              type="text"
              className={styles.fieldInput}
              value={challenge.modelComponents.goal}
              onChange={(e) =>
                update({ modelComponents: { ...challenge.modelComponents, goal: e.target.value } })
              }
              placeholder="The single Goal/Objective"
            />
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Relevant Factors</label>
            <EditableList
              items={challenge.modelComponents.relevantFactors}
              onChange={(items) =>
                update({ modelComponents: { ...challenge.modelComponents, relevantFactors: items } })
              }
              placeholder="Add a factor..."
            />
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Possible Outcomes</label>
            <EditableList
              items={challenge.modelComponents.possibleOutcomes}
              onChange={(items) =>
                update({ modelComponents: { ...challenge.modelComponents, possibleOutcomes: items } })
              }
              placeholder="Add an outcome..."
            />
          </div>

          {/* Target Outcome */}
          <div className={styles.sectionDivider}>Target Outcome</div>

          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Target Outcome</label>
            {targetOutcomeOptions.length > 0 ? (
              <select
                className={styles.fieldSelect}
                value={challenge.targetOutcome.name}
                onChange={(e) =>
                  update({ targetOutcome: { ...challenge.targetOutcome, name: e.target.value } })
                }
              >
                <option value="">— Select from Possible Outcomes —</option>
                {targetOutcomeOptions.map((o, i) => (
                  <option key={i} value={o}>{o}</option>
                ))}
                <option value="__custom__">Other (type below)</option>
              </select>
            ) : (
              <input
                type="text"
                className={styles.fieldInput}
                value={challenge.targetOutcome.name}
                onChange={(e) =>
                  update({ targetOutcome: { ...challenge.targetOutcome, name: e.target.value } })
                }
                placeholder="Enter target outcome (add Possible Outcomes above first)"
              />
            )}
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Target Outcome Explanation</label>
            <textarea
              className={styles.fieldTextarea}
              value={challenge.targetOutcome.explanation}
              onChange={(e) =>
                update({ targetOutcome: { ...challenge.targetOutcome, explanation: e.target.value } })
              }
              rows={4}
              placeholder="Explain why this is the target outcome..."
            />
          </div>

          {/* Alternate Components */}
          <div className={styles.sectionDivider}>Alternate Components</div>

          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Alternate Goal Options</label>
            <EditableList
              items={challenge.alternateComponents.goals}
              onChange={(items) =>
                update({ alternateComponents: { ...challenge.alternateComponents, goals: items } })
              }
              placeholder="Alternate goal..."
            />
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Alternate Factor Options</label>
            <EditableList
              items={challenge.alternateComponents.factors}
              onChange={(items) =>
                update({ alternateComponents: { ...challenge.alternateComponents, factors: items } })
              }
              placeholder="Alternate factor..."
            />
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Alternate Outcome Options</label>
            <EditableList
              items={challenge.alternateComponents.outcomes}
              onChange={(items) =>
                update({ alternateComponents: { ...challenge.alternateComponents, outcomes: items } })
              }
              placeholder="Alternate outcome..."
            />
          </div>

          {/* Hints */}
          <div className={styles.sectionDivider}>Hints</div>

          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Goal Hints</label>
            <EditableList
              items={challenge.hints.goalHints}
              onChange={(items) =>
                update({ hints: { ...challenge.hints, goalHints: items } })
              }
              placeholder="Goal hint..."
            />
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Factor Hints</label>
            <EditableList
              items={challenge.hints.factorHints}
              onChange={(items) =>
                update({ hints: { ...challenge.hints, factorHints: items } })
              }
              placeholder="Factor hint..."
            />
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Outcome Hints</label>
            <EditableList
              items={challenge.hints.outcomeHints}
              onChange={(items) =>
                update({ hints: { ...challenge.hints, outcomeHints: items } })
              }
              placeholder="Outcome hint..."
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default function GauntletReview({ document: doc, onChange }: GauntletReviewProps) {
  const addChallenge = (sectionIndex: number) => {
    const updated = { ...doc };
    updated.sections[sectionIndex].challenges.push({
      id: `challenge-new-${Date.now()}`,
      title: 'New Challenge',
      challengeType: 'standard',
      scenario: [],
      task: '',
      modelComponents: { goal: '', relevantFactors: [], possibleOutcomes: [] },
      targetOutcome: { name: '', explanation: '' },
      alternateComponents: { goals: [], factors: [], outcomes: [] },
      hints: { goalHints: [], factorHints: [], outcomeHints: [] },
    });
    onChange(updated);
  };

  return (
    <div className={styles.reviewContainer}>
      {doc.sections.map((section, si) => (
        <div key={si} className={styles.reviewSection}>
          <div className={styles.reviewSectionHeader}>
            <h4 className={styles.reviewSectionTitle}>{section.sectionTitle}</h4>
            <span className={styles.reviewSectionCount}>
              {section.challenges.length} challenge{section.challenges.length !== 1 ? 's' : ''}
            </span>
          </div>

          {section.challenges.map((challenge, ci) => (
            <ChallengeCard
              key={challenge.id}
              challenge={challenge}
              sectionIndex={si}
              challengeIndex={ci}
              onChange={(updated) => {
                const newDoc = { ...doc };
                newDoc.sections[si].challenges[ci] = updated;
                onChange(newDoc);
              }}
              onRemove={() => {
                const newDoc = { ...doc };
                newDoc.sections[si].challenges = newDoc.sections[si].challenges.filter(
                  (_, idx) => idx !== ci
                );
                onChange(newDoc);
              }}
            />
          ))}

          <button
            className={styles.addChallengeBtn}
            onClick={() => addChallenge(si)}
          >
            <Plus size={15} /> Add Challenge
          </button>
        </div>
      ))}
    </div>
  );
}
