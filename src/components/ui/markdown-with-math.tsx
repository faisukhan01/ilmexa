'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

interface MarkdownWithMathProps {
  children: string;
  className?: string;
}

function preprocessMath(text: string): string {
  // Normalize \( \) to $ $ and \[ \] to $$ $$ for remark-math
  return text
    .replace(/\\\[/g, '$$')
    .replace(/\\\]/g, '$$')
    .replace(/\\\(/g, '$')
    .replace(/\\\)/g, '$');
}

export function MarkdownWithMath({ children, className = '' }: MarkdownWithMathProps) {
  const processed = preprocessMath(children);

  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[
          [rehypeKatex, { throwOnError: false, strict: false, output: 'html' }],
        ]}
      >
        {processed}
      </ReactMarkdown>
    </div>
  );
}
