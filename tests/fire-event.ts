export function fireEvent(element: Element, type: string) {
  const event = new Event(type, { bubbles: true, cancelable: true });
  element.dispatchEvent(event);
}

export function fireClick(element: Element) {
  fireEvent(element, "click");
}

export function fireInput(element: HTMLInputElement, value: string) {
  element.value = value;
  fireEvent(element, "input");
}
