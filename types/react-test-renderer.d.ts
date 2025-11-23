declare module "react-test-renderer" {
  import * as React from "react";

  export interface ReactTestRendererJSON {
    type: string;
    props: Record<string, unknown>;
    children: ReactTestRendererJSON[] | string | null;
  }

  export interface ReactTestInstance {
    type: string | React.JSXElementConstructor<unknown>;
    props: Record<string, unknown>;
    children: Array<ReactTestInstance | string>;
    find(predicate: (node: ReactTestInstance) => boolean): ReactTestInstance;
    findAll(predicate: (node: ReactTestInstance) => boolean): ReactTestInstance[];
  }

  export interface ReactTestRenderer {
    root: ReactTestInstance;
    toJSON(): ReactTestRendererJSON | ReactTestRendererJSON[] | null;
    update(nextElement: React.ReactElement): void;
    unmount(nextElement?: React.ReactElement): void;
  }

  export function create(element: React.ReactElement): ReactTestRenderer;
  export function act(callback: () => void | Promise<void>): Promise<void> | void;
}
