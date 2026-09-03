export type TranslatedResult<T = unknown> = {
  messageKey: string;
  messageArgs?: Record<string, unknown>;
  data?: T;
};

export function isTranslatedResult(
  value: unknown,
): value is TranslatedResult {
  return (
    typeof value === 'object' &&
    value !== null &&
    'messageKey' in value &&
    typeof (value as TranslatedResult).messageKey === 'string'
  );
}
