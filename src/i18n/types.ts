/**
 * An Arabic namespace must translate every key of its English counterpart. Extra keys are
 * allowed so plural messages can carry the Arabic-only forms (`.zero`, `.two`, `.few`, `.many`).
 */
export type Translation<T> = Record<keyof T, string> & Record<string, string>
