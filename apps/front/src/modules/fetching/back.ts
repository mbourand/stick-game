import { fetchData, FetchDataParams } from "@/modules/fetching/fetcher";
import { zOsuControllerBeatmapsetsSearchResponse, zOsuControllerBeatmapsetsSearchData } from "@tau/back-types";
import { Env } from "@/modules/env/Env";

const BACK_ROUTES = {
  "/osu/beatmapsets/search": {
    method: "GET",
    queryParamsSchema: zOsuControllerBeatmapsetsSearchData.shape.query,
    bodySchema: zOsuControllerBeatmapsetsSearchData.shape.body,
    responseSchema: zOsuControllerBeatmapsetsSearchResponse,
  },
} as const;

type BackRoutesType = typeof BACK_ROUTES;

type ParamsType<Route extends keyof BackRoutesType> = Omit<
  FetchDataParams<
    BackRoutesType[Route]["responseSchema"],
    BackRoutesType[Route]["queryParamsSchema"],
    BackRoutesType[Route]["bodySchema"]
  >,
  "baseUrl" | "method" | "route" | "responseSchema"
> & {
  route: keyof BackRoutesType;
};

export const fetchBackend = async <Route extends keyof typeof BACK_ROUTES>(params: ParamsType<Route>) => {
  return await fetchData({
    baseUrl: Env.NEXT_PUBLIC_BACKEND_URL,
    route: params.route,
    queryParams: params.queryParams,
    method: BACK_ROUTES[params.route].method,
    responseSchema: BACK_ROUTES[params.route].responseSchema,
    headers: params.headers,
    ...("body" in params ? { body: params.body } : {}),
  });
};
