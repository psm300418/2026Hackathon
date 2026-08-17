export const parseIngredientsText = (ingredientsText: string) =>
  ingredientsText
    .split(/[,\n]/)
    .map((value) => value.trim())
    .map((value) => value.replace(/\.$/, "").trim())
    .filter(Boolean);
