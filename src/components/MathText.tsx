import { useMemo } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";

interface MathTextProps {
  text: string;
  className?: string;
}

/**
 * Renders text with LaTeX math expressions.
 * Supports: $...$, $$...$$, \(...\), \[...\]
 */
const MathText = ({ text, className = "" }: MathTextProps) => {
  const hasMath = useMemo(() => {
    if (!text) return false;
    return /\$|\\\(|\\\[/.test(text);
  }, [text]);

  const html = useMemo(() => {
    if (!text || !hasMath) return "";

    try {
      let result = text;

      // Display math: $$...$$ 
      result = result.replace(/\$\$([\s\S]*?)\$\$/g, (_, math) => {
        try {
          return katex.renderToString(math.trim(), { displayMode: true, throwOnError: false });
        } catch {
          return `$$${math}$$`;
        }
      });

      // Display math: \[...\]
      result = result.replace(/\\\[([\s\S]*?)\\\]/g, (_, math) => {
        try {
          return katex.renderToString(math.trim(), { displayMode: true, throwOnError: false });
        } catch {
          return `\\[${math}\\]`;
        }
      });

      // Inline math: \(...\)
      result = result.replace(/\\\(([\s\S]*?)\\\)/g, (_, math) => {
        try {
          return katex.renderToString(math.trim(), { displayMode: false, throwOnError: false });
        } catch {
          return `\\(${math}\\)`;
        }
      });

      // Inline math: $...$  (single dollar, not already processed)
      result = result.replace(/\$([^\$]+?)\$/g, (_, math) => {
        try {
          return katex.renderToString(math.trim(), { displayMode: false, throwOnError: false });
        } catch {
          return `$${math}$`;
        }
      });

      return result;
    } catch {
      return text;
    }
  }, [text, hasMath]);

  if (!hasMath) {
    return <span className={className}>{text}</span>;
  }

  return <span className={className} dangerouslySetInnerHTML={{ __html: html }} />;
};

export default MathText;
