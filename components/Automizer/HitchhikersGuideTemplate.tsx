/* eslint-disable @next/next/no-head-element */
import React from 'react';
import { HitchhikersGuide } from '@/lib/automizer/types';

interface TemplateProps {
  document: HitchhikersGuide;
}

// This is a simplified template focusing on structure.
// It will be rendered to a static string and then converted to PDF.
export const HitchhikersGuideTemplate: React.FC<TemplateProps> = ({ document }) => {
  const { metadata, challenges } = document;

  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <title>{metadata.title || 'Hitchhiker’s Guide'}</title>
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
            .metadata {
                font-size: 10pt;
                color: #333;
            }
            .challenge {
                margin-bottom: 40px;
                page-break-before: always;
            }
            .challenge:first-child {
                page-break-before: auto;
            }
            .romanSection {
                margin-bottom: 20px;
            }
            .romanSection h3 {
                page-break-after: avoid;
            }
            .alphaSection {
                display: flex;
                margin-left: 20px;
                page-break-inside: avoid;
            }
            .alphaLabel {
                width: 20px;
                flex-shrink: 0;
            }
            .alphaContent {
                flex-grow: 1;
            }
            .alphaContent p {
                margin-top: 0;
            }
            .numericList {
                margin-left: 20px;
                padding-left: 20px;
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

          {challenges.map((challenge, challengeIndex) => (
            <div key={challenge.id} className="challenge" style={challengeIndex === 0 ? { pageBreakBefore: 'auto' } : {}}>
              <h2>{challenge.title}</h2>
              {challenge.subtitle && <h3>{challenge.subtitle}</h3>}

              {Object.values(challenge.sections).map((section) => (
                <div key={section.number} className="romanSection">
                  <h3 style={{ pageBreakAfter: 'avoid' }}>
                    {section.number}. {section.title}
                  </h3>
                  {section.subsections.map((subsection, subIndex) => (
                    <div key={subIndex} className="alphaSection">
                      {subsection.label !== 'intro' && (
                        <p className="alphaLabel">{subsection.label}.</p>
                      )}
                      <div className="alphaContent">
                        {subsection.content.map((p, pIndex) => (
                          <p key={pIndex} style={{marginTop: 0}}>{p}</p>
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
