import { getCryptoQuotes, getStockQuotes } from "../../services/stock-service";
import { publicProcedure, router } from "../init";

export const stocksRouter = router({
  quotes: publicProcedure.query(async () => {
    const [stocks, crypto] = await Promise.all([
      getStockQuotes(),
      getCryptoQuotes().catch(() => []),
    ]);
    return { stocks, crypto };
  }),
});
