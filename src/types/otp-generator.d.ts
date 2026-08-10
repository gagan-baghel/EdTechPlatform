/**
 * `otp-generator` ships no types and has no @types package. Declaring only
 * the one function this codebase calls, rather than pulling in an untyped
 * module wholesale — an inaccurate wide declaration would be worse than none.
 */
declare module "otp-generator" {
  export interface OtpOptions {
    digits?: boolean
    lowerCaseAlphabets?: boolean
    upperCaseAlphabets?: boolean
    specialChars?: boolean
  }
  export function generate(length: number, options?: OtpOptions): string
  const _default: { generate: typeof generate }
  export default _default
}
