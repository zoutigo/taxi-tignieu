import { test, expect } from "@playwright/test";

const e2eLoginEmail = process.env.NEXT_PUBLIC_E2E_TEST_USER_EMAIL ?? "e2e@example.com";
const e2eLoginName = process.env.NEXT_PUBLIC_E2E_TEST_USER_NAME ?? "Utilisateur E2E";

test.beforeEach(async ({ request }) => {
  await request.post("/api/test-utils/reset-e2e-user");
});

test("un utilisateur sans téléphone est redirigé vers le formulaire après connexion", async ({
  page,
}) => {
  await page.addInitScript(
    ({ email, name }) => {
      window.__E2E_AUTH_PROVIDER__ = "mock-google";
      window.__E2E_LOGIN_EMAIL__ = email;
      window.__E2E_LOGIN_NAME__ = name;
    },
    { email: e2eLoginEmail, name: e2eLoginName }
  );

  await page.goto("/");
  await page.getByRole("button", { name: "Login" }).click();
  await page.waitForURL(/\/profil\/completer-telephone/);
  await expect(page).toHaveURL(/\/profil\/completer-telephone/);
  await expect(
    page.getByRole("heading", { name: "Ajoutez votre numéro" })
  ).toBeVisible();
});
