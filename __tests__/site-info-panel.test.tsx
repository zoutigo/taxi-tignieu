/** @jest-environment jsdom */

import { act } from "react";
import { createRoot } from "react-dom/client";
import { SiteInfoPanel } from "@/components/dashboard/site-info-panel";
import { fireClick } from "@/tests/fire-event";

const fetchMock = jest.fn();
global.fetch = fetchMock as unknown as typeof fetch;

const sampleContact = {
  name: "Taxi Tignieu Charvieu",
  ownerName: "Hazem AYARI",
  phone: "04 95 78 54 00",
  email: "contact@test.fr",
  address: {
    street: "Rue de la République",
    streetNumber: "9",
    postalCode: "38230",
    city: "Tignieu",
    country: "France",
  },
};

describe("SiteInfoPanel", () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;

  beforeEach(() => {
    (global as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    fetchMock.mockReset();
  });

  it("enables editing and sends updated payload", async () => {
    await act(async () => {
      root.render(<SiteInfoPanel initialContact={sampleContact} />);
    });

    const editBtn = Array.from(container.querySelectorAll("button")).find((btn) =>
      btn.textContent?.includes("Modifier")
    );
    expect(editBtn).toBeTruthy();
    if (!editBtn) return;
    await act(async () => {
      fireClick(editBtn);
    });

    const phoneInput = Array.from(container.querySelectorAll("label"))
      .find((l) => l.textContent?.includes("Téléphone"))
      ?.querySelector("input") as HTMLInputElement | undefined;
    expect(phoneInput).toBeTruthy();
    if (!phoneInput) return;
    await act(async () => {
      phoneInput.value = "0660000000";
      const inputEvent = new Event("input", { bubbles: true, cancelable: true });
      phoneInput.dispatchEvent(inputEvent);
      const changeEvent = new Event("change", { bubbles: true, cancelable: true });
      phoneInput.dispatchEvent(changeEvent);
    });
    await act(async () => {});

    const saveBtn = Array.from(container.querySelectorAll("button")).find((btn) =>
      btn.textContent?.includes("Sauvegarder")
    );
    expect(saveBtn).toBeTruthy();
    if (!saveBtn) return;
    await act(async () => {
      fireClick(saveBtn);
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/settings/config",
      expect.objectContaining({
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: expect.any(String),
      })
    );
    const body = JSON.parse((fetchMock.mock.calls[0]?.[1] as RequestInit).body as string);
    expect(typeof body.phone).toBe("string");
    expect(body.name).toBe(sampleContact.name);
  });
});
