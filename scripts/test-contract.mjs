import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const windows = process.platform === "win32";
const command = windows ? "wsl" : "compactc";
const prefix = windows ? ["-d", "Ubuntu", "--", "compactc"] : [];
const compilerRoot = windows
  ? execFileSync("wsl", ["-d", "Ubuntu", "--", "wslpath", "-a", root.replaceAll("\\", "/")], { encoding: "utf8" }).trim()
  : root;
const version = execFileSync(command, [...prefix, "--version"], { encoding: "utf8" }).trim();
if (version !== "0.26.0") throw new Error(`Expected Compact 0.26.0, received ${version}`);
execFileSync(command, [...prefix, "--skip-zk", `${compilerRoot}/contracts/survey.compact`, `${compilerRoot}/.compact-build`], { stdio: "inherit" });
execFileSync(process.execPath, ["--test", "tests/contract.runtime.mjs"], { cwd: root, stdio: "inherit" });
