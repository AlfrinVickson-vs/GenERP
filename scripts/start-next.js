const { spawn } = require("child_process");

const port = process.env.PORT || "3000";
const child = spawn("next", ["start", "-p", port], {
  stdio: "inherit",
  shell: process.platform === "win32"
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code || 0);
});
