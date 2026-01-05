declare module "nodemailer" {
  export function createTransport(options: unknown): {
    sendMail: (opts: unknown) => Promise<unknown>;
  };
  const nodemailer: { createTransport: typeof createTransport } & {
    default?: { createTransport: typeof createTransport };
  };
  export default nodemailer;
}
