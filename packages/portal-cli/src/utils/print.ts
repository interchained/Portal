/**
 * Terminal output helpers — consistent Portal CLI style.
 */

import pc from "picocolors";

export const icon = {
  pass:  pc.green("✓"),
  warn:  pc.yellow("⚠"),
  fail:  pc.red("✗"),
  info:  pc.cyan("ℹ"),
  arrow: pc.dim("→"),
  dot:   pc.dim("·"),
  spark: pc.yellow("⚡"),
};

export function header(text: string): void {
  console.log("\n" + pc.bold(pc.cyan(text)));
  console.log(pc.dim("─".repeat(Math.min(text.length + 2, 60))));
}

export function success(text: string): void {
  console.log(`${icon.pass} ${text}`);
}

export function warn(text: string): void {
  console.log(`${icon.warn} ${pc.yellow(text)}`);
}

export function fail(text: string): void {
  console.log(`${icon.fail} ${pc.red(text)}`);
}

export function info(text: string): void {
  console.log(`${icon.info} ${pc.dim(text)}`);
}

export function step(text: string): void {
  console.log(`${icon.arrow} ${text}`);
}

export function blank(): void {
  console.log();
}

export function banner(): void {
  console.log(
    pc.bold(
      `\n  ${pc.cyan("⬡")} ${pc.white("Portal")} ${pc.dim("by Interchained")}  ${pc.dim("─")}  ${pc.dim("agent-native web framework")}\n`
    )
  );
}

export function summaryLine(pass: number, warn: number, fail: number): void {
  const parts = [
    pass > 0 ? pc.green(`${pass} passed`) : null,
    warn > 0 ? pc.yellow(`${warn} warnings`) : null,
    fail > 0 ? pc.red(`${fail} failed`)  : null,
  ].filter(Boolean);
  console.log("\n" + pc.bold("Summary: ") + parts.join(pc.dim("  ·  ")));
}
