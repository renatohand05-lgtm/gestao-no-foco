import type { NetworkStatus } from "@gof/domain";
import * as Network from "expo-network";
import { useEffect, useState } from "react";

export async function fetchNetworkStatus(): Promise<NetworkStatus> {
  try {
    const state = await Network.getNetworkStateAsync();
    if (state.isConnected === false) return "offline";
    if (state.isConnected === true) return "online";
    return "unknown";
  } catch {
    return "unknown";
  }
}

export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>("unknown");

  useEffect(() => {
    let mounted = true;
    const refresh = async () => {
      const next = await fetchNetworkStatus();
      if (mounted) setStatus(next);
    };
    refresh();
    const id = setInterval(refresh, 10_000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, []);

  return status;
}

export function isOnline(status: NetworkStatus): boolean {
  return status === "online";
}
