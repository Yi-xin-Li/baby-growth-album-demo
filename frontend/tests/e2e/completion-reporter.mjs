import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

export default class CompletionReporter {
  onEnd(result) {
    const directory = path.resolve("test-results");
    mkdirSync(directory, { recursive: true });
    writeFileSync(path.join(directory, "e2e-result.txt"), result.status, "utf8");
  }
}
