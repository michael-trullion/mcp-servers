import * as k8s from "@kubernetes/client-node";
import { spawn } from "child_process";
import { config } from "dotenv";

// Load environment variables
config();

// Set up Kubernetes client
const kc = new k8s.KubeConfig();
kc.loadFromDefault(); // This will load from ~/.kube/config by default

// Get the API clients
const k8sApi = kc.makeApiClient(k8s.CoreV1Api);
const exec = new k8s.Exec(kc);

// Type definitions
export interface PodList {
  kind: string | undefined;
  apiVersion: string | undefined;
  metadata: any;
  items: any[]; // Changed from Pod[] to any[] to handle V1Pod[]
}

export interface Pod {
  metadata: {
    name: string;
    namespace: string;
    [key: string]: any;
  };
  spec: any;
  status: {
    phase: string;
    conditions: any[];
    containerStatuses: any[];
    [key: string]: any;
  };
  [key: string]: any;
}

export interface ExecResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
}

/**
 * Get pods in a namespace with optional label and field selectors
 * @param namespace Kubernetes namespace
 * @param labelSelector Label selector to filter pods
 * @param fieldSelector Field selector to filter pods
 */
export async function getPods(
  namespace: string = "local",
  labelSelector?: string,
  fieldSelector?: string
): Promise<PodList> {
  try {
    const response = await k8sApi.listNamespacedPod(
      namespace,
      undefined, // pretty
      undefined, // allowWatchBookmarks
      undefined, // _continue
      undefined, // fieldSelector
      fieldSelector,
      undefined, // includeUninitialized
      labelSelector,
      undefined, // limit
      undefined, // resourceVersion
      undefined, // resourceVersionMatch
      undefined, // timeoutSeconds
      undefined // watch
    );

    return {
      kind: response.body.kind,
      apiVersion: response.body.apiVersion,
      metadata: response.body.metadata,
      items: response.body.items,
    };
  } catch (error) {
    console.error(`Error getting pods in namespace ${namespace}:`, error);
    throw error;
  }
}

/**
 * Find pods by name pattern
 * @param namePattern Pod name pattern
 * @param namespace Kubernetes namespace
 */
export async function findPodsByName(
  namePattern: string,
  namespace: string = "local"
): Promise<PodList> {
  try {
    // Get all pods in the namespace
    const allPods = await getPods(namespace);

    // Filter pods by name pattern
    // Convert * wildcard to JavaScript RegExp
    const regexPattern = new RegExp(
      "^" + namePattern.replace(/\*/g, ".*") + "$"
    );

    const filteredItems = allPods.items.filter((pod) =>
      regexPattern.test(pod.metadata?.name || "")
    );

    return {
      kind: allPods.kind,
      apiVersion: allPods.apiVersion,
      metadata: allPods.metadata,
      items: filteredItems,
    };
  } catch (error) {
    console.error(
      `Error finding pods by name pattern ${namePattern} in namespace ${namespace}:`,
      error
    );
    throw error;
  }
}

/**
 * Delete a pod
 * @param podName Pod name
 * @param namespace Kubernetes namespace
 * @param gracePeriodSeconds Grace period in seconds before force deletion
 */
export async function deletePod(
  podName: string,
  namespace: string = "local",
  gracePeriodSeconds?: number
): Promise<any> {
  try {
    // Create delete options
    const deleteOptions = new k8s.V1DeleteOptions();
    if (gracePeriodSeconds !== undefined) {
      deleteOptions.gracePeriodSeconds = gracePeriodSeconds;
    }

    const response = await k8sApi.deleteNamespacedPod(
      podName,
      namespace,
      undefined, // pretty
      undefined, // dryRun
      gracePeriodSeconds, // gracePeriodSeconds
      undefined, // orphanDependents
      undefined, // propagationPolicy
      deleteOptions
    );

    return response.body;
  } catch (error) {
    console.error(
      `Error deleting pod ${podName} in namespace ${namespace}:`,
      error
    );
    throw error;
  }
}

/**
 * Execute a command in a pod
 * @param podName Pod name
 * @param command Command to execute (will be split by space)
 * @param namespace Kubernetes namespace
 * @param containerName Container name (if pod has multiple containers)
 */
export async function execCommandInPod(
  podName: string,
  command: string,
  namespace: string = "local",
  containerName?: string
): Promise<ExecResult> {
  try {
    // First, get the pod to find container name if not provided
    if (!containerName) {
      const pod = await k8sApi.readNamespacedPod(podName, namespace);
      // Use first container as default if it exists
      if (
        pod.body.spec &&
        pod.body.spec.containers &&
        pod.body.spec.containers.length > 0
      ) {
        containerName = pod.body.spec.containers[0].name;
      } else {
        throw new Error(`No containers found in pod ${podName}`);
      }
    }

    // We'll use the kubectl exec command for reliability
    // Parse the command into array of arguments
    const cmd = command.split(/\s+/);

    return new Promise((resolve, reject) => {
      // Execute kubectl command
      const kubectl = spawn("kubectl", [
        "exec",
        "-n",
        namespace,
        podName,
        ...(containerName ? ["-c", containerName] : []),
        "--",
        ...cmd,
      ]);

      let stdout = "";
      let stderr = "";

      kubectl.stdout.on("data", (data) => {
        stdout += data.toString();
      });

      kubectl.stderr.on("data", (data) => {
        stderr += data.toString();
      });

      kubectl.on("close", (code) => {
        resolve({
          stdout,
          stderr,
          exitCode: code,
        });
      });

      kubectl.on("error", (err) => {
        reject(err);
      });
    });
  } catch (error) {
    console.error(
      `Error executing command in pod ${podName} in namespace ${namespace}:`,
      error
    );
    throw error;
  }
}

/**
 * Get logs from a pod
 * @param podName Pod name
 * @param namespace Kubernetes namespace
 * @param containerName Container name (if pod has multiple containers)
 * @param tailLines Number of lines to fetch from the end
 * @param previous Get logs from previous terminated container instance
 */
export async function getPodLogs(
  podName: string,
  namespace: string = "local",
  containerName?: string,
  tailLines?: number,
  previous?: boolean
): Promise<string> {
  try {
    // First, get the pod to find container name if not provided
    if (!containerName) {
      const pod = await k8sApi.readNamespacedPod(podName, namespace);
      // Use first container as default if it exists
      if (
        pod.body.spec &&
        pod.body.spec.containers &&
        pod.body.spec.containers.length > 0
      ) {
        containerName = pod.body.spec.containers[0].name;
      } else {
        throw new Error(`No containers found in pod ${podName}`);
      }
    }

    const response = await k8sApi.readNamespacedPodLog(
      podName,
      namespace,
      containerName,
      undefined, // follow
      undefined, // insecureSkipTLSVerifyBackend
      undefined, // pretty
      previous ? "true" : undefined, // previous - convert boolean to string
      undefined, // sinceSeconds
      undefined, // sinceTime
      tailLines, // tailLines
      undefined // timestamps
    );

    return response.body;
  } catch (error) {
    console.error(
      `Error getting logs from pod ${podName} in namespace ${namespace}:`,
      error
    );
    throw error;
  }
}
