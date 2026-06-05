import { z } from "zod";

type BodyMethod = "GET" | "POST" | "PUT" | "PATCH";
type NoBodyMethod = "GET" | "DELETE";

export type FetchDataParams<
  ResponseSchemaType extends z.ZodType,
  QueryParamsSchemaType extends z.ZodType,
  ParamsType extends z.ZodType,
  BodySchemaType extends z.ZodType,
> = {
  baseUrl: string;
  route: string;
  params?: z.infer<ParamsType>;
  queryParams?: z.infer<QueryParamsSchemaType>;
  responseSchema: ResponseSchemaType;
  headers?: Record<string, string>;
  method: BodyMethod | NoBodyMethod;
} & (z.infer<BodySchemaType> extends undefined ? { body?: never } : { body: z.infer<BodySchemaType> });

export const fetchData = async <
  ResponseSchemaType extends z.ZodType,
  QueryParamsSchemaType extends z.ZodType,
  ParamsType extends z.ZodType,
  BodySchemaType extends z.ZodType,
>(
  params: FetchDataParams<ResponseSchemaType, QueryParamsSchemaType, ParamsType, BodySchemaType>,
) => {
  const hasBody = "body" in params;

  const queryParamsParsed = params.queryParams ? (params.queryParams as z.infer<QueryParamsSchemaType>) : {};
  const queryString = new URLSearchParams(queryParamsParsed as Record<string, string>).toString();

  let completeUrl = `${params.baseUrl}${params.route}${queryString ? `?${queryString}` : ""}`;
  for (const [key, value] of Object.entries(params.params || {})) {
    completeUrl = completeUrl.replace(new RegExp(`/:${key}(/|$)`, "g"), "/" + encodeURIComponent(String(value)) + "/");
  }

  const response = await fetch(completeUrl, {
    method: params.method,
    headers: {
      ...(hasBody ? { "Content-Type": "application/json" } : {}),
      ...params.headers,
    },
    body: hasBody ? JSON.stringify(params.body) : undefined,
  });

  if (!response.ok) {
    throw new Error(`Network response was not ok: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return params.responseSchema.parse(data);
};
