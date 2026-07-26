import { HGSectionNumber } from "./types";

export const normalize = (t: string) => t.replace(/\r\n/g, "\n");

export const toLines = (t: string) => t.split("\n");

export const matchHGSection = (t: string): HGSectionNumber | null => {
  const match = t.match(/^(I{1,3}|IV|V|VI{1,3}|VIII|IX)\./i);
  return match ? (match[1].toUpperCase() as HGSectionNumber) : null;
};

export const matchAlphaSubsection = (t: string): string | null => {
  const match = t.match(/^([A-Z])\.\s+/);
  return match ? match[1] : null;
};

export const matchNumberedPoint = (t: string): number | null => {
  const match = t.match(/^(\d+)\.\s+/);
  return match ? parseInt(match[1], 10) : null;
};

export const generateId = (prefix: string, index: number) =>
  `${prefix}-${index}`;

export const applyStyleDictionaryToObject = <T>(obj: T): T => obj;

export const err = (
  code: string,
  message: string,
  id?: string,
  field?: string,
) => ({ code, message, id, field });

export const warn = (
  code: string,
  message: string,
  id?: string,
  field?: string,
) => ({ code, message, id, field });
