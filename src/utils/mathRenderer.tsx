import React from 'react';
import katex from 'katex';

interface MathTextProps {
  text: string;
  className?: string;
}

export const MathText: React.FC<MathTextProps> = ({ text, className = '' }) => {
  if (!text) return null;

  // Split by $$...$$ for block math, then by $...$ for inline math
  const renderFormattedText = (rawText: string) => {
    // Regex for block math ($$...$$) and inline math ($...$)
    // Avoid matching escaped dollars (\$)
    const regex = /(\$\$[\s\S]*?\$\$|\$[^$\n]+\$)/g;
    const parts = rawText.split(regex);

    return parts.map((part, index) => {
      if (part.startsWith('$$') && part.endsWith('$$') && part.length > 4) {
        const math = part.slice(2, -2).trim();
        try {
          const html = katex.renderToString(math, {
            displayMode: true,
            throwOnError: false,
          });
          return (
            <div
              key={index}
              className="my-2 overflow-x-auto py-1 text-center"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          );
        } catch {
          return (
            <div key={index} className="my-1 font-mono text-indigo-400">
              {part}
            </div>
          );
        }
      } else if (part.startsWith('$') && part.endsWith('$') && part.length > 2) {
        const math = part.slice(1, -1).trim();
        try {
          const html = katex.renderToString(math, {
            displayMode: false,
            throwOnError: false,
          });
          return (
            <span
              key={index}
              className="inline-block px-0.5 text-indigo-200"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          );
        } catch {
          return (
            <span key={index} className="font-mono text-indigo-400">
              {part}
            </span>
          );
        }
      } else {
        // Plain text with line breaks and inline formatting (<u>, <b>, <i>) preserved
        if (
          !part.includes('<u>') &&
          !part.includes('<b>') &&
          !part.includes('<i>') &&
          !part.includes('<U>') &&
          !part.includes('<B>') &&
          !part.includes('<I>')
        ) {
          return (
            <span key={index} className="whitespace-pre-line">
              {part}
            </span>
          );
        }

        const inlineRegex = /(<u>[\s\S]*?<\/u>|<b>[\s\S]*?<\/b>|<i>[\s\S]*?<\/i>)/gi;
        const segments = part.split(inlineRegex);

        return (
          <span key={index} className="whitespace-pre-line">
            {segments.map((seg, sIdx) => {
              if (/^<u>[\s\S]*?<\/u>$/i.test(seg)) {
                const inner = seg.replace(/^<u>/i, '').replace(/<\/u>$/i, '');
                return (
                  <u
                    key={sIdx}
                    className="underline underline-offset-4 decoration-2 decoration-amber-400 text-amber-300 font-bold"
                  >
                    {inner}
                  </u>
                );
              }
              if (/^<b>[\s\S]*?<\/b>$/i.test(seg)) {
                const inner = seg.replace(/^<b>/i, '').replace(/<\/b>$/i, '');
                return (
                  <strong key={sIdx} className="font-bold text-white">
                    {inner}
                  </strong>
                );
              }
              if (/^<i>[\s\S]*?<\/i>$/i.test(seg)) {
                const inner = seg.replace(/^<i>/i, '').replace(/<\/i>$/i, '');
                return (
                  <em key={sIdx} className="italic text-slate-200">
                    {inner}
                  </em>
                );
              }
              return <span key={sIdx}>{seg}</span>;
            })}
          </span>
        );
      }
    });
  };

  return <div className={`leading-relaxed ${className}`}>{renderFormattedText(text)}</div>;
};
