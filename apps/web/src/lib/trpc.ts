import { faro } from "@grafana/faro-web-sdk";
import type { AppRouter } from "@repo/api/trpc";
import { httpBatchLink, splitLink, unstable_httpSubscriptionLink } from "@trpc/client";
import type { TRPCLink } from "@trpc/client";
import { createTRPCReact } from "@trpc/react-query";
import { observable } from "@trpc/server/observable";

export const trpc = createTRPCReact<AppRouter>();

const errorReportingLink: TRPCLink<AppRouter> = () => {
  return ({ next, op }) => {
    return observable((observer) => {
      const subscription = next(op).subscribe({
        next(value) {
          observer.next(value);
        },
        error(err) {
          if (faro.api) {
            faro.api.pushError(new Error(err.message), {
              context: {
                source: "trpc-request",
                path: op.path,
                type: op.type,
                code: String(err.data?.code ?? "UNKNOWN"),
              },
            });
          }
          observer.error(err);
        },
        complete() {
          observer.complete();
        },
      });
      return subscription;
    });
  };
};

export const trpcClient = trpc.createClient({
  links: [
    errorReportingLink,
    splitLink({
      condition: (op) => op.type === "subscription",
      true: unstable_httpSubscriptionLink({
        url: "/trpc",
      }),
      false: httpBatchLink({
        url: "/trpc",
      }),
    }),
  ],
});
