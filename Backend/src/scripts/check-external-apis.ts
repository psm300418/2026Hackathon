import { listMfdsIngredients } from "../gateways/mfds-ingredients.gateway.js";

const main = async () => {
  const mfds = await listMfdsIngredients({ pageNo: 1, numOfRows: 3 });
  console.log("MFDS ingredients:", {
    totalCount: mfds.totalCount,
    sample: mfds.items.slice(0, 2)
  });
};

main().catch((error: unknown) => {
  console.error("External API check: failed");
  console.error(error);
  process.exit(1);
});
