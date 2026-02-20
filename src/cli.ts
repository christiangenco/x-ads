import { Command } from "commander";

const program = new Command();

program
  .name("x-ads")
  .description("CLI tool for managing X (Twitter) ad campaigns")
  .version("0.1.0");

const auth = program
  .command("auth")
  .description("Authenticate with X (OAuth 1.0a)");

auth
  .command("login", { isDefault: true })
  .description("Run OAuth 1.0a 3-legged flow to obtain access tokens")
  .action(async () => {
    const { runAuth } = await import("./auth.js");
    await runAuth();
  });

auth
  .command("status")
  .description("Verify tokens work and list accessible ad accounts")
  .action(async () => {
    const { authStatus } = await import("./auth.js");
    await authStatus();
  });

program.parse();
