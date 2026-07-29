/* eslint-disable @next/next/no-head-element */
import React from "react";
import { GauntletDocument } from "@/lib/automizer/types";

interface TemplateProps {
  document: GauntletDocument;
}

// Simplified template focusing on structure; rendered to a static string
// and converted to PDF via Playwright.
export const GauntletTemplate: React.FC<TemplateProps> = ({ document }) => {
  const { metadata, sections } = document;

  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <title>{metadata.title || "Gauntlet Challenges"}</title>
        <style>
          {`
            body {
              font-family: 'Helvetica', sans-serif;
              font-size: 11pt;
              line-height: 1.4;
              margin: 0;
              padding: 0;
              color: #111;
            }
            .main {
              padding: 1in;
            }
            .metadata {
              font-size: 10pt;
              color: #333;
            }
            hr {
              border: 0;
              border-top: 1px solid #ccc;
              margin: 20px 0;
            }
            .sectionTitle {
              font-size: 15pt;
              margin-top: 0;
              page-break-after: avoid;
            }
            .challenge {
              margin-bottom: 32px;
              page-break-inside: auto;
            }
            .challengeTitle {
              font-size: 13pt;
              margin-bottom: 4px;
              page-break-after: avoid;
            }
            .blockHeading {
              font-size: 11.5pt;
              font-weight: 600;
              margin-top: 16px;
              margin-bottom: 4px;
              page-break-after: avoid;
            }
            .blockGroup {
              page-break-inside: avoid;
            }
            p {
              margin: 0 0 8px 0;
            }
            ul {
              margin: 0 0 8px 0;
              padding-left: 20px;
            }
            li {
              margin-bottom: 3px;
              page-break-inside: avoid;
            }
            .subheading {
              font-weight: 600;
              margin-top: 8px;
              margin-bottom: 2px;
              page-break-after: avoid;
            }
            .targetOutcomeBlock {
              page-break-inside: avoid;
              margin-top: 10px;
            }
            .targetOutcomeLabel {
              font-weight: 600;
            }
          `}
        </style>
      </head>
      <body>
        <div className="main">
          <h1>{metadata.title}</h1>
          <p className="metadata">
            <span>{metadata.date}</span> | <span>{metadata.author}</span>
          </p>
          <hr />

          {sections.map((section, sIndex) => (
            <div key={sIndex}>
              <h2 className="sectionTitle">{section.sectionTitle}</h2>

              {section.challenges.map((challenge) => (
                <div key={challenge.id} className="challenge">
                  <h3 className="challengeTitle">{challenge.title}</h3>

                  {/* Scenario */}
                  <div className="blockGroup">
                    <p className="blockHeading">Scenario</p>
                    {challenge.scenario.map((p, i) => (
                      <p key={i}>{p}</p>
                    ))}
                  </div>

                  {/* Task */}
                  <div className="blockGroup">
                    <p className="blockHeading">Task</p>
                    <p>{challenge.task}</p>
                  </div>

                  {/* Model Components */}
                  <p className="blockHeading">Model Components</p>

                  <div className="blockGroup">
                    <p className="subheading">Goal / Objective</p>
                    <ul>
                      <li>{challenge.modelComponents.goal}</li>
                    </ul>
                  </div>

                  <div className="blockGroup">
                    <p className="subheading">Relevant Factors</p>
                    <ul>
                      {challenge.modelComponents.relevantFactors.map((f, i) => (
                        <li key={i}>{f}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="blockGroup">
                    <p className="subheading">Possible Outcomes</p>
                    <ul>
                      {challenge.modelComponents.possibleOutcomes.map(
                        (o, i) => (
                          <li key={i}>{o}</li>
                        ),
                      )}
                    </ul>
                  </div>

                  {/* Target Outcome */}
                  <div className="targetOutcomeBlock">
                    <p>
                      <span className="targetOutcomeLabel">
                        Target Outcome:{" "}
                      </span>
                      {challenge.targetOutcome.name}
                    </p>
                    <p>{challenge.targetOutcome.explanation}</p>
                  </div>

                  {/* Alternate Components */}
                  <p className="blockHeading">Alternate Components</p>

                  <div className="blockGroup">
                    <p className="subheading">Alternate Goal Options</p>
                    <ul>
                      {challenge.alternateComponents.goals.map((g, i) => (
                        <li key={i}>{g}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="blockGroup">
                    <p className="subheading">Alternate Factor Options</p>
                    <ul>
                      {challenge.alternateComponents.factors.map((f, i) => (
                        <li key={i}>{f}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="blockGroup">
                    <p className="subheading">Alternate Outcome Options</p>
                    <ul>
                      {challenge.alternateComponents.outcomes.map((o, i) => (
                        <li key={i}>{o}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Hints */}
                  {(challenge.hints.goalHints.length > 0 ||
                    challenge.hints.factorHints.length > 0 ||
                    challenge.hints.outcomeHints.length > 0) && (
                    <>
                      <p className="blockHeading">Hints</p>
                      {challenge.hints.goalHints.length > 0 && (
                        <div className="blockGroup">
                          <p className="subheading">Goal Hints</p>
                          <ul>
                            {challenge.hints.goalHints.map((h, i) => (
                              <li key={i}>{h}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {challenge.hints.factorHints.length > 0 && (
                        <div className="blockGroup">
                          <p className="subheading">Factor Hints</p>
                          <ul>
                            {challenge.hints.factorHints.map((h, i) => (
                              <li key={i}>{h}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {challenge.hints.outcomeHints.length > 0 && (
                        <div className="blockGroup">
                          <p className="subheading">Outcome Hints</p>
                          <ul>
                            {challenge.hints.outcomeHints.map((h, i) => (
                              <li key={i}>{h}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      </body>
    </html>
  );
};
