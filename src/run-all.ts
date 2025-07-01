import { spawn } from "child_process";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Define available servers
const servers = [
  {
    name: "PostgreSQL Server",
    path: join(__dirname, "servers/postgres-server/postgres-server.ts"),
  },
  {
    name: "Kubernetes Server",
    path: join(__dirname, "servers/kubernetes-server/kubernetes-server.ts"),
  },
  // Add more servers here as they are created
];

// Function to start a server
function startServer(serverInfo: { name: string; path: string }) {
  console.log(`Starting ${serverInfo.name}...`);

  // Use ts-node to run the TypeScript file directly
  const serverProcess = spawn("npx", ["ts-node", "--esm", serverInfo.path], {
    stdio: "pipe", // Capture output
    detached: false,
  });

  // Set up logging for the server
  serverProcess.stdout.on("data", (data) => {
    console.log(`[${serverInfo.name}] ${data.toString().trim()}`);
  });

  serverProcess.stderr.on("data", (data) => {
    console.error(`[${serverInfo.name}] ERROR: ${data.toString().trim()}`);
  });

  // Handle server exit
  serverProcess.on("exit", (code) => {
    console.log(`[${serverInfo.name}] exited with code ${code}`);
  });

  return serverProcess;
}

// Function to start all servers
function startAllServers() {
  console.log("Starting all MCP servers...");

  const processes = servers.map(startServer);

  // Handle script termination
  process.on("SIGINT", () => {
    console.log("Shutting down all servers...");
    processes.forEach((p) => {
      if (!p.killed) {
        p.kill("SIGINT");
      }
    });
  });

  process.on("SIGTERM", () => {
    console.log("Shutting down all servers...");
    processes.forEach((p) => {
      if (!p.killed) {
        p.kill("SIGTERM");
      }
    });
  });

  console.log("All servers started. Press Ctrl+C to stop.");
}

// Start all servers if this script is run directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  startAllServers();
}
