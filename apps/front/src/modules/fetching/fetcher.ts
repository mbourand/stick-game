import { z } from "zod";

type BodyMethod = "GET" | "POST" | "PUT";
type NoBodyMethod = "GET" | "DELETE";

export type FetchDataParams<
  ResponseSchemaType extends z.ZodType,
  QueryParamsSchemaType extends z.ZodType,
  BodySchemaType extends z.ZodType,
> =
  | {
      baseUrl: string;
      route: string;
      queryParams: z.infer<QueryParamsSchemaType>;
      responseSchema: ResponseSchemaType;
      headers?: Record<string, string>;
    } & (
      | {
          method: BodyMethod;
          body: z.infer<BodySchemaType>;
        }
      | {
          method: NoBodyMethod;
        }
    );

export const fetchData = async <
  ResponseSchemaType extends z.ZodType,
  QueryParamsSchemaType extends z.ZodType,
  BodySchemaType extends z.ZodType,
>(
  params: FetchDataParams<ResponseSchemaType, QueryParamsSchemaType, BodySchemaType>,
) => {
  const hasBody = "body" in params;

  const queryParamsParsed = params.queryParams ? (params.queryParams as z.infer<QueryParamsSchemaType>) : {};
  const queryString = new URLSearchParams(queryParamsParsed as Record<string, string>).toString();

  const completeUrl = `${params.baseUrl}${params.route}${queryString ? `?${queryString}` : ""}`;

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
