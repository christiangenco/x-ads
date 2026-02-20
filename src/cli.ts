import { Command } from "commander";

const program = new Command();

program
  .name("x-ads")
  .description("CLI tool for managing X (Twitter) ad campaigns")
  .version("0.1.0");

program.parse();
