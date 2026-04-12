interface DisplayValueOptions {
  isLoading: boolean;
  isError: boolean;
  value: string | number | null;
  loadingText?: string;
  errorText?: string;
  formatter?: (value: string | number) => string;
}

export function displayValue({
  isLoading,
  isError,
  value,
  loadingText = "--",
  errorText = "N/A",
  formatter,
}: DisplayValueOptions): string {
  if (isLoading) return loadingText;
  if (isError || value == null) return errorText;
  return formatter ? formatter(value) : String(value);
}
