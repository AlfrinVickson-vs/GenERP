const { spawn, spawnSync } = require("child_process");
const path = require("path");

const command = process.argv[2];
const allowed = new Set(["dev", "build", "start"]);

if (!allowed.has(command)) {
  console.error("Usage: node scripts/run-web.js <dev|build|start>");
  process.exit(1);
}

const repoRoot = path.resolve(__dirname, "..");
const webDir = path.join(repoRoot, "apps", "web");
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

function runInDirectory(cwd) {
  const child = spawn(npmCommand, ["run", `_${command}`], {
    cwd,
    stdio: "inherit",
    shell: false
  });

  child.on("exit", (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }
    process.exit(code || 0);
  });
}

if (process.platform !== "win32") {
  runInDirectory(webDir);
} else {
  const drive = ["B", "A", "R", "Q", "P", "O", "N", "M", "L", "K", "J", "I", "H"].find((letter) => {
    const result = spawnSync("cmd.exe", ["/c", `if exist ${letter}:\\ (exit 1) else (exit 0)`], {
      stdio: "ignore"
    });
    return result.status === 0;
  });

  if (!drive) {
    console.error("No free drive letter is available for the clean-path Next.js run.");
    process.exit(1);
  }

  const mappedDrive = `${drive}:`;
  const map = spawnSync("subst", [mappedDrive, repoRoot], { stdio: "inherit" });
  if (map.status !== 0) {
    process.exit(map.status || 1);
  }

  process.on("exit", () => {
    spawnSync("subst", [mappedDrive, "/D"], { stdio: "ignore" });
  });

  runInDirectory(path.join(`${mappedDrive}\\`, "apps", "web"));
}
