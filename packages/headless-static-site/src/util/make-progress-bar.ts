import chalk from "chalk";
import { SingleBar } from "cli-progress";

export function makeProgressBar(label: string, totalResources: number, uiEnabled = false): SingleBar {
  if (!uiEnabled) {
    return {
      update: () => {},
      stop: () => {},
      start: () => {},
      increment: () => {},
    } as any;
  }

  const progress = new SingleBar({
    format: `${chalk.bold(label)} |${chalk.cyan("{bar}")}| {percentage}% – {value}/{total} Resources`,
    barCompleteChar: "\u2588",
    barIncompleteChar: "\u2591",
    clearOnComplete: true,
  });
  progress.start(totalResources, 0);
  return progress;
}
