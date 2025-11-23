/** @jest-environment jsdom */
/** @jest-environment jsdom */
import React from "react";
import renderer, { act } from "react-test-renderer";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

describe("ConfirmDialog", () => {
  beforeAll(() => {
    (globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
  });

  it("does not render when closed", () => {
    const tree = renderer.create(
      <ConfirmDialog open={false} onCancel={() => {}} onConfirm={() => {}} />
    );
    expect(tree.toJSON()).toBeNull();
  });

  it("calls onConfirm", () => {
    const onConfirm = jest.fn();
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <ConfirmDialog open title="Test" onCancel={() => {}} onConfirm={onConfirm} />
      );
    });
    const root = tree!.root;
    const confirm = root.find((n) => n.type === "button" && n.props.children === "Supprimer");
    act(() => {
      (confirm.props.onClick as () => void)();
    });
    expect(onConfirm).toHaveBeenCalled();
  });

  it("calls onCancel", () => {
    const onCancel = jest.fn();
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <ConfirmDialog open title="Test" onCancel={onCancel} onConfirm={() => {}} />
      );
    });
    const root = tree!.root;
    const cancel = root.find((n) => n.type === "button" && n.props.children === "Annuler");
    act(() => {
      (cancel.props.onClick as () => void)();
    });
    expect(onCancel).toHaveBeenCalled();
  });
});
