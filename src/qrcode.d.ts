/** The part of `qrcode` the app uses (the package ships no types; kept local so no extra dependency is needed). */
declare module 'qrcode' {
  export function toDataURL(text: string, options?: { margin?: number; width?: number; color?: { dark?: string; light?: string } }): Promise<string>;
}
