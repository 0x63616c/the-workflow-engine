import { trpc } from "@/lib/trpc";

type ConfigValue = string | number | boolean | null;

export interface AppConfigHook {
  get: (key: string) => ConfigValue;
  set: (key: string, value: ConfigValue) => void;
  isLoading: boolean;
}

export function useAppConfig(): AppConfigHook {
  const { data, isLoading } = trpc.appConfig.getAll.useQuery();
  const { mutate } = trpc.appConfig.set.useMutation();

  const get = (key: string): ConfigValue => {
    if (!data) return null;
    const value = data[key];
    return value === undefined ? null : (value as ConfigValue);
  };

  const set = (key: string, value: ConfigValue) => {
    mutate({ key, value });
  };

  return { get, set, isLoading };
}
