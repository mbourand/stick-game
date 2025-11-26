import z from "zod";

export const relationSchema = <T extends z.core.SomeType>(schema: T) => z.lazy(() => schema).nullish();
