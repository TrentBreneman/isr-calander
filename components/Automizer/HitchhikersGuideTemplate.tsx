/* eslint-disable @next/next/no-head-element */
import React from "react";
import { HitchhikersGuide } from "@/lib/automizer/types";

interface TemplateProps {
  document: HitchhikersGuide;
}

// This is a simplified template focusing on structure.
// It will be rendered to a static string and then converted to PDF.
export const HitchhikersGuideTemplate: React.FC<TemplateProps> = ({
  document,
}) => {
  const { metadata, challenges } = document;

  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <title>{metadata.title || "Hitchhiker’s Guide"}</title>
        <style>
          {`
            body {
              font-family: 'Helvetica', sans-serif;
              font-size: 11pt;
              line-height: 1.4;
              margin: 0;
              padding: 0;
            }
            .page {
              width: 8.5in;
              height: 11in;
              box-sizing: border-box;
              padding: 1in;
              padding-top: 1.2in; /* Make space for header */
              padding-bottom: 0.8in; /* Make space for footer */
              position: relative;
              page-break-after: always;
            }
            .header {
              position: fixed;
              top: 0.5in;
              left: 1in;
              right: 1in;
              height: 0.7in;
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              font-size: 9pt;
              color: #666;
            }
            .logo {
              width: 52px;
              height: auto;
            }
            .footer {
                position: fixed;
                bottom: 0.3in;
                right: 1in;
                font-size: 9pt;
                color: #666;
            }
            hr {
              border: 0;
              border-top: 1px solid #ccc;
              margin: 20px 0;
            }
            .main {
                padding: 1in;
            }
            h1 {
                font-size: 16pt;
                font-weight: 700;
                margin: 0 0 4px 0;
                page-break-after: avoid;
            }
            .metadata {
                font-size: 10pt;
                color: #333;
                margin: 0;
            }
            p {
                margin: 0 0 8px 0;
            }
            li {
                margin-bottom: 3px;
                page-break-inside: avoid;
            }
            /* Challenges flow naturally one after another (no forced
               page break) to match the approved iSolvRisk reference
               output. Only the heading itself is protected from being
               orphaned alone at the bottom of a page. */
            .challenge {
                margin-bottom: 28px;
                page-break-inside: auto;
            }
            .challengeTitle {
                font-size: 13pt;
                font-weight: 600;
                text-decoration: underline;
                margin: 0 0 10px 0;
                page-break-after: avoid;
            }
            .challengeSubtitle {
                font-size: 12pt;
                font-weight: 400;
                font-style: italic;
                margin: -4px 0 10px 0;
                page-break-after: avoid;
            }
            /* Formal MLA-style outline hierarchy:
                 I.   (flush left)
                    A.   (indented one level, 0.4in)
                       1.   (indented one more level, 0.8in)
               Each level uses a fixed-width label column so labels of
               different lengths (I. vs VIII.) still line up, and wrapped
               text hangs indented under the text, not the label. */
            .romanSection {
                margin-bottom: 16px;
                page-break-inside: auto;
            }
            .romanHeading {
                display: flex;
                margin: 0 0 6px 0;
                page-break-after: avoid;
            }
            .romanLabel {
                width: 0.4in;
                flex-shrink: 0;
                font-size: 11.5pt;
                font-weight: 600;
            }
            .romanTitle {
                flex-grow: 1;
                font-size: 11.5pt;
                font-weight: 600;
            }
            .alphaSection {
                display: flex;
                margin-left: 0.4in;
                margin-bottom: 6px;
                page-break-inside: avoid;
            }
            .alphaLabel {
                width: 0.35in;
                flex-shrink: 0;
            }
            .alphaContent {
                flex-grow: 1;
            }
            .alphaContent p {
                margin-top: 0;
            }
            .numericList {
                list-style-position: outside;
                margin: 4px 0 0 0.4in;
                padding-left: 0.35in;
            }
          `}
        </style>
      </head>
      <body>
        {/* The header and footer are tricky with page breaks.
            We will inject them using Playwright's page.pdf options. */}

        <div className="main">
          <h1>{metadata.title}</h1>
          <p className="metadata">
            <span>{metadata.date}</span> | <span>{metadata.author}</span>
          </p>
          <hr />

          {challenges.map((challenge) => (
            <div key={challenge.id} className="challenge">
              <h2 className="challengeTitle">{challenge.title}</h2>
              {challenge.subtitle && (
                <h3 className="challengeSubtitle">{challenge.subtitle}</h3>
              )}

              {Object.values(challenge.sections).map((section) => (
                <div key={section.number} className="romanSection">
                  <div className="romanHeading">
                    <span className="romanLabel">{section.number}.</span>
                    <span className="romanTitle">{section.title}</span>
                  </div>
                  {section.subsections.map((subsection, subIndex) => (
                    <div key={subIndex} className="alphaSection">
                      {subsection.label !== "intro" && (
                        <p className="alphaLabel">{subsection.label}.</p>
                      )}
                      <div className="alphaContent">
                        {subsection.content.map((p, pIndex) => (
                          <p key={pIndex} style={{ marginTop: 0 }}>
                            {p}
                          </p>
                        ))}
                        {subsection.points.length > 0 && (
                          <ol className="numericList">
                            {subsection.points.map((point, ptIndex) => (
                              <li key={ptIndex}>{point}</li>
                            ))}
                          </ol>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ))}
        </div>
      </body>
    </html>
  );
};
