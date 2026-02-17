import { useMemo } from 'react';
import type { SourceResponse } from '../../api';
import styles from './SourcePanel.module.css';

type SourcePanelProps = {
  source: SourceResponse | null;
  highlightSet: Set<number>;
  activeLine: number | null;
  onLineClick: (lineNo: number) => void;
};

type TokenKind = 'plain' | 'comment' | 'string' | 'keyword' | 'number' | 'type' | 'builtin';

type HighlightToken = {
  text: string;
  kind: TokenKind;
};

type LexerState = {
  inBlockComment: boolean;
  inRawString: boolean;
};

const goKeywords = new Set([
  'break',
  'case',
  'chan',
  'const',
  'continue',
  'default',
  'defer',
  'else',
  'fallthrough',
  'for',
  'func',
  'go',
  'goto',
  'if',
  'import',
  'interface',
  'map',
  'package',
  'range',
  'return',
  'select',
  'struct',
  'switch',
  'type',
  'var',
]);

const goBuiltins = new Set(['true', 'false', 'nil', 'iota']);

function isGoFile(file: string): boolean {
  return file.toLowerCase().endsWith('.go');
}

function pushToken(tokens: HighlightToken[], text: string, kind: TokenKind) {
  if (!text) return;
  tokens.push({ text, kind });
}

function readQuotedLiteral(line: string, start: number, quote: '"' | "'"): number {
  let idx = start + 1;
  while (idx < line.length) {
    const ch = line[idx];
    if (ch === '\\') {
      idx += 2;
      continue;
    }
    if (ch === quote) return idx + 1;
    idx += 1;
  }
  return line.length;
}

function readWord(line: string, start: number): number {
  let idx = start;
  while (idx < line.length && /[A-Za-z0-9_]/.test(line[idx])) idx += 1;
  return idx;
}

function readNumber(line: string, start: number): number {
  let idx = start;
  while (idx < line.length && /[0-9A-Fa-f_xX.]/.test(line[idx])) idx += 1;
  return idx;
}

function tokenizeGoLine(line: string, state: LexerState): { tokens: HighlightToken[]; nextState: LexerState } {
  const tokens: HighlightToken[] = [];
  const nextState: LexerState = { ...state };

  let i = 0;
  while (i < line.length) {
    if (nextState.inBlockComment) {
      const end = line.indexOf('*/', i);
      if (end === -1) {
        pushToken(tokens, line.slice(i), 'comment');
        i = line.length;
        break;
      }
      pushToken(tokens, line.slice(i, end + 2), 'comment');
      i = end + 2;
      nextState.inBlockComment = false;
      continue;
    }

    if (nextState.inRawString) {
      const end = line.indexOf('`', i);
      if (end === -1) {
        pushToken(tokens, line.slice(i), 'string');
        i = line.length;
        break;
      }
      pushToken(tokens, line.slice(i, end + 1), 'string');
      i = end + 1;
      nextState.inRawString = false;
      continue;
    }

    const ch = line[i];
    const next = line[i + 1];

    if (ch === '/' && next === '/') {
      pushToken(tokens, line.slice(i), 'comment');
      break;
    }

    if (ch === '/' && next === '*') {
      const end = line.indexOf('*/', i + 2);
      if (end === -1) {
        pushToken(tokens, line.slice(i), 'comment');
        nextState.inBlockComment = true;
        break;
      }
      pushToken(tokens, line.slice(i, end + 2), 'comment');
      i = end + 2;
      continue;
    }

    if (ch === '`') {
      const end = line.indexOf('`', i + 1);
      if (end === -1) {
        pushToken(tokens, line.slice(i), 'string');
        nextState.inRawString = true;
        break;
      }
      pushToken(tokens, line.slice(i, end + 1), 'string');
      i = end + 1;
      continue;
    }

    if (ch === '"' || ch === "'") {
      const end = readQuotedLiteral(line, i, ch as '"' | "'");
      pushToken(tokens, line.slice(i, end), 'string');
      i = end;
      continue;
    }

    if (/[0-9]/.test(ch)) {
      const end = readNumber(line, i);
      pushToken(tokens, line.slice(i, end), 'number');
      i = end;
      continue;
    }

    if (/[A-Za-z_]/.test(ch)) {
      const end = readWord(line, i);
      const word = line.slice(i, end);
      if (goKeywords.has(word)) {
        pushToken(tokens, word, 'keyword');
      } else if (goBuiltins.has(word)) {
        pushToken(tokens, word, 'builtin');
      } else if (/^[A-Z]/.test(word)) {
        pushToken(tokens, word, 'type');
      } else {
        pushToken(tokens, word, 'plain');
      }
      i = end;
      continue;
    }

    pushToken(tokens, ch, 'plain');
    i += 1;
  }

  return { tokens, nextState };
}

function tokenClass(kind: TokenKind): string {
  switch (kind) {
    case 'comment':
      return styles.tokenComment;
    case 'string':
      return styles.tokenString;
    case 'keyword':
      return styles.tokenKeyword;
    case 'number':
      return styles.tokenNumber;
    case 'type':
      return styles.tokenType;
    case 'builtin':
      return styles.tokenBuiltin;
    default:
      return styles.tokenPlain;
  }
}

export function SourcePanel(props: SourcePanelProps) {
  const { source, highlightSet, activeLine, onLineClick } = props;

  if (!source) {
    return <div className={styles.empty}>Select a function, data-flow node, or source reference to view code.</div>;
  }

  const rows = useMemo(() => {
    const lines = source.content.split('\n');
    if (!isGoFile(source.file)) {
      return lines.map((line, idx) => ({
        lineNo: idx + 1,
        tokens: [{ text: line, kind: 'plain' as const }],
      }));
    }

    let state: LexerState = { inBlockComment: false, inRawString: false };
    return lines.map((line, idx) => {
      const { tokens, nextState } = tokenizeGoLine(line, state);
      state = nextState;
      return {
        lineNo: idx + 1,
        tokens,
      };
    });
  }, [source.content, source.file]);

  return (
    <div className={styles.wrapper}>
      <div className={styles.fileName}>{source.file}</div>
      <pre className={styles.pre}>
        {rows.map((row) => {
          const lineNo = row.lineNo;
          const className = [styles.line, highlightSet.has(lineNo) ? styles.highlight : '', activeLine === lineNo ? styles.active : '']
            .filter(Boolean)
            .join(' ');

          return (
            <span key={lineNo} className={className} onClick={() => onLineClick(lineNo)}>
              {lineNo}{' '}
              {row.tokens.length === 0 ? (
                <span className={styles.tokenPlain} />
              ) : (
                row.tokens.map((token, idx) => (
                  <span key={`${lineNo}:${idx}`} className={tokenClass(token.kind)}>
                    {token.text}
                  </span>
                ))
              )}
            </span>
          );
        })}
      </pre>
    </div>
  );
}
