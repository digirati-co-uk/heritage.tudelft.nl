#!/usr/bin/env node

import { argv } from "node:process";
import { Command } from "commander";
import { buildCommand } from "./commands/build";
import { generateCommand } from "./commands/generate.ts";
import { initCommand } from "./commands/init.ts";
import { serveCommand } from "./commands/serve.ts";
import { validateCommand } from "./commands/validate.ts";

const program = new Command();

program
  .command("build")
  .description("Build headless static site")
  .option("--no-cache", "Disable caching")
  .option("-w, --watch", "Watch for changes")
  .option("-s, --scripts <path>", "Build scripts")
  .option("--debug", "Debug")
  .option("--validate", "Validate config before building")
  .option("-e, --exact <path>", "Build single path only")
  .option("-c, --config <path>", "Path to config file")
  .option("--stores <name...>", "Names of stores to build")
  .option("--no-emit", "Disable emitting")
  .option("--no-extract", "Disable extraction")
  .option("--no-enrich", "Disable enrichment")
  .option("--no-client", "Disable client.js building")
  .option("--no-generate", "Disable IIIF generator")
  .option("--html", "Include HTML in build")
  .option("--python", "Allow python scripts")
  .option("--topics", "Flush topic data to /topics folder")
  .option("-o, --out <path>", "Output path")
  .action(buildCommand);

program
  //
  .command("serve")
  .description("Serve headless static site")
  .option("--no-build", "Build initial assets")
  .option("--no-watch", "Watch for changes")
  .option("--scripts", "Build scripts")
  .action(serveCommand);

program
  //
  .command("generate")
  .description("Run IIIF generators")
  .option("--no-cache", "Disable caching")
  .action(generateCommand);

program
  //
  .command("validate")
  .description("Validate config")
  .action(validateCommand);

program
  //
  .command("init")
  .description("Initialize config")
  .action(initCommand);

program.parse(argv);
