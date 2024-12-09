import { SingleBar } from "cli-progress";
import chalk from "chalk";

export function makeProgressBar(label: string, totalResources: number) {
  const progress = new SingleBar({
    format: `${chalk.bold(label)} |${chalk.cyan(
      "{bar}",
    )}| {percentage}% – {value}/{total} Resources`,
    barCompleteChar: "\u2588",
    barIncompleteChar: "\u2591",
    clearOnComplete: true,
  });
  progress.start(totalResources, 0);
  return progress;
}
