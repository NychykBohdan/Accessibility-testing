/**
 * Runtime configuration. Every value can be overridden through environment variables,
 * defaults point to the public saucedemo.com demo (credentials are public demo data, not secrets).
 */
export interface Credentials {
  readonly username: string;
  readonly password: string;
}

const password = process.env.SAUCE_PASSWORD ?? 'secret_sauce';

export const env = {
  baseURL: process.env.BASE_URL ?? 'https://www.saucedemo.com',
  users: {
    standard: {
      username: process.env.SAUCE_USERNAME ?? 'standard_user',
      password,
    },
    lockedOut: {
      username: process.env.SAUCE_LOCKED_USERNAME ?? 'locked_out_user',
      password,
    },
  } satisfies Record<string, Credentials>,
} as const;
