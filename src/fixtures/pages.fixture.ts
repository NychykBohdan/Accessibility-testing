import { test as base, type Cookie } from '@playwright/test';
import { env } from '../config/env.ts';
import {
  CartPage,
  CheckoutCompletePage,
  CheckoutStepOnePage,
  CheckoutStepTwoPage,
  InventoryPage,
  ItemPage,
  LoginPage,
} from '../pages/index.ts';

export interface PageFixtures {
  loginPage: LoginPage;
  inventoryPage: InventoryPage;
  itemPage: ItemPage;
  cartPage: CartPage;
  checkoutStepOnePage: CheckoutStepOnePage;
  checkoutStepTwoPage: CheckoutStepTwoPage;
  checkoutCompletePage: CheckoutCompletePage;
  /** `page` authenticated as the standard user and opened on the inventory page. */
  loggedInPage: InventoryPage;
}

interface AuthSession {
  /** Session cookies of the standard user; refreshed via UI login when close to expiry. */
  cookies(): Promise<Cookie[]>;
}

interface WorkerFixtures {
  authSession: AuthSession;
}

/** saucedemo's session cookie lives for 10 minutes; re-login when less than this remains. */
const COOKIE_REFRESH_MARGIN_SEC = 60;

export const test = base.extend<PageFixtures, WorkerFixtures>({
  // Logs in through the real UI once per worker and reuses the resulting session cookies
  // (a lightweight storageState) for every test that needs an authenticated page.
  authSession: [
    async ({ browser }, use) => {
      let cached: Cookie[] = [];

      const loginViaUi = async (): Promise<Cookie[]> => {
        const context = await browser.newContext({ baseURL: env.baseURL });
        try {
          const page = await context.newPage();
          const loginPage = new LoginPage(page);
          await loginPage.goto();
          await loginPage.login(env.users.standard);
          await page.waitForURL('**/inventory.html');
          return (await context.storageState()).cookies;
        } finally {
          await context.close();
        }
      };

      const isFresh = (cookies: Cookie[]): boolean => {
        const nowSec = Date.now() / 1000;
        return (
          cookies.length > 0 &&
          cookies.every((c) => c.expires === -1 || c.expires - nowSec > COOKIE_REFRESH_MARGIN_SEC)
        );
      };

      await use({
        async cookies() {
          if (!isFresh(cached)) cached = await loginViaUi();
          return cached;
        },
      });
    },
    { scope: 'worker' },
  ],

  loginPage: async ({ page }, use) => use(new LoginPage(page)),
  inventoryPage: async ({ page }, use) => use(new InventoryPage(page)),
  itemPage: async ({ page }, use) => use(new ItemPage(page)),
  cartPage: async ({ page }, use) => use(new CartPage(page)),
  checkoutStepOnePage: async ({ page }, use) => use(new CheckoutStepOnePage(page)),
  checkoutStepTwoPage: async ({ page }, use) => use(new CheckoutStepTwoPage(page)),
  checkoutCompletePage: async ({ page }, use) => use(new CheckoutCompletePage(page)),

  loggedInPage: async ({ page, context, authSession }, use) => {
    await context.addCookies(await authSession.cookies());
    const inventoryPage = new InventoryPage(page);
    await inventoryPage.goto();
    // The SPA renders after load; keyboard tests must not start pressing Tab before that.
    await inventoryPage.items.first().waitFor();
    await use(inventoryPage);
  },
});

export { expect } from '@playwright/test';
