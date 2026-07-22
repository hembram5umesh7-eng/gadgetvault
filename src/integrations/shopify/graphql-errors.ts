export type GraphqlError = { message: string };

/** Shopify GraphQL `errors` may be an array, string, or single object. */
export function normalizeGraphqlErrors(errors: unknown): GraphqlError[] {
  if (!errors) return [];
  if (Array.isArray(errors)) {
    return errors.map((e) =>
      typeof e === "string"
        ? { message: e }
        : { message: String((e as { message?: unknown })?.message ?? e) },
    );
  }
  if (typeof errors === "string") return [{ message: errors }];
  if (typeof errors === "object" && errors !== null && "message" in errors) {
    return [{ message: String((errors as { message: unknown }).message) }];
  }
  return [{ message: String(errors) }];
}

export function graphqlErrorMessages(errors: unknown): string {
  return normalizeGraphqlErrors(errors).map((e) => e.message).join("; ");
}

export function hasGraphqlErrorMatching(errors: unknown, pattern: RegExp): boolean {
  return normalizeGraphqlErrors(errors).some((e) => pattern.test(e.message));
}

export function hasGraphqlErrors(errors: unknown): boolean {
  return normalizeGraphqlErrors(errors).length > 0;
}
