import { spawn } from "node:child_process";
import { clearTimeout } from "node:timers";
import PyDetect from "detect-python-interpreter";

export function runPython<Output, Input>(
  scriptPath: string,
  args: string[],
  stdInput?: Input,
  timeout?: number
): Promise<Output> {
  return new Promise((resolve, reject) => {
    const py = spawn(PyDetect.detect(), [scriptPath, ...args]);
    let dataString = "";

    const time = setTimeout(() => {
      py.kill();
      reject("Timeout");
    }, timeout || 30000);

    py.stdout.on("data", (data) => {
      dataString += data.toString();
    });

    py.stderr.on("data", (data) => {
      reject(data.toString());
    });

    py.stdout.on("end", () => {
      if (!dataString) {
        resolve({} as any);
      }
      try {
        const parsed = JSON.parse(dataString);
        clearTimeout(time);
        resolve(parsed);
      } catch (e) {
        reject(e);
      }
    });

    if (stdInput) {
      py.stdin.write(JSON.stringify(stdInput));
      py.stdin.end();
    }

    py.stderr.on("data", (data) => {
      reject(data.toString());
      py.kill();
    });
  });
}
