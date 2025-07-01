import { spawn } from "child_process";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Define available servers
const servers = [
  {
    name: "jira",
    displayName: "Jira Server",
    path: join(__dirname, "servers/jira-server/jira-server.ts"),
  },
  {
    name: "github",
    displayName: "GitHub Server",
    path: join(__dirname, "servers/github-server/github-server.ts"),
  },
  {
    name: "postgres",
    displayName: "PostgreSQL Server",
    path: join(__dirname, "servers/postgres-server/postgres-server.ts"),
  },
  {
    name: "kubernetes",
    displayName: "Kubernetes Server",
    path: join(__dirname, "servers/kubernetes-server/kubernetes-server.ts"),
  },
  // Add more servers here as they are created
];

// Function to start a server by name
function startServerByName(serverName: string) {
  const server = servers.find((s) => s.name === serverName);

  if (!server) {
    console.error(
      `Server "${serverName}" not found. Available servers: ${servers
        .map((s) => s.name)
        .join(", ")}`
    );
    process.exit(1);
  }

  console.log(`Starting ${server.displayName}...`);

  // Use ts-node to run the TypeScript file directly
  const serverProcess = spawn("npx", ["ts-node", "--esm", server.path], {
    stdio: "inherit", // Inherit stdio from parent process
    detached: false,
  });

  // Handle server exit
  serverProcess.on("exit", (code) => {
    console.log(`${server.displayName} exited with code ${code}`);
    process.exit(code || 0);
  });

  // Forward termination signals
  process.on("SIGINT", () => serverProcess.kill("SIGINT"));
  process.on("SIGTERM", () => serverProcess.kill("SIGTERM"));
}

// Function to list all available servers
function listServers() {
  console.log("Available MCP servers:");
  servers.forEach((server) => {
    console.log(`- ${server.name}: ${server.displayName}`);
  });
}

// Main function to parse arguments and run the appropriate server
function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
    console.log("Usage: npm run dev -- [server-name]");
    console.log("       npm run dev -- --list");
    console.log("\nOptions:");
    console.log("  --list, -l    List all available servers");
    console.log("  --help, -h    Show this help message");
    console.log("\nTo run all servers: npm run dev:all");
    listServers();
    return;
  }

  if (args[0] === "--list" || args[0] === "-l") {
    listServers();
    return;
  }

  startServerByName(args[0]);
}

// Run the main function if this script is executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
