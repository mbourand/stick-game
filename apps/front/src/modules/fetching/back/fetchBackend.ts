import { fetchData, FetchDataParams } from "@/modules/fetching/fetcher";
import {
  zOsuControllerBeatmapsetsSearchResponse,
  zOsuControllerBeatmapsetsSearchData,
  zOsuControllerDailyResponse,
  zOsuControllerDailyData,
  zScoresControllerSubmitScoreData,
  zScoresControllerSubmitScoreResponse,
  zScoresControllerGetBeatmapLeaderboardData,
  zScoresControllerGetBeatmapLeaderboardResponse,
} from "@tau/back-schemas";
import { Env } from "@/modules/env/Env";
import z from "zod";

const BACK_ROUTES = {
  "/osu/beatmapsets/search": {
    method: "GET",
    queryParamsSchema: zOsuControllerBeatmapsetsSearchData.shape.query,
    bodySchema: zOsuControllerBeatmapsetsSearchData.shape.body,
    paramsSchema: zOsuControllerBeatmapsetsSearchData.shape.path,
    responseSchema: zOsuControllerBeatmapsetsSearchResponse,
  },
  "/osu/daily": {
    method: "GET",
    queryParamsSchema: zOsuControllerDailyData.shape.query,
    bodySchema: zOsuControllerDailyData.shape.body,
    paramsSchema: zOsuControllerDailyData.shape.path,
    responseSchema: zOsuControllerDailyResponse,
  },
  "/scores/submit": {
    method: "POST",
    queryParamsSchema: zScoresControllerSubmitScoreData.shape.query,
    paramsSchema: zScoresControllerSubmitScoreData.shape.path,
    bodySchema: zScoresControllerSubmitScoreData.shape.body,
    responseSchema: zScoresControllerSubmitScoreResponse,
  },
  "/scores/:beatmapId/leaderboard": {
    method: "GET",
    queryParamsSchema: zScoresControllerGetBeatmapLeaderboardData.shape.query,
    paramsSchema: zScoresControllerGetBeatmapLeaderboardData.shape.path,
    bodySchema: zScoresControllerGetBeatmapLeaderboardData.shape.body,
    responseSchema: zScoresControllerGetBeatmapLeaderboardResponse,
  },
} as const;

type BackRoutesType = typeof BACK_ROUTES;

type ParamsType<Route extends keyof BackRoutesType> = Omit<
  FetchDataParams<
    BackRoutesType[Route]["responseSchema"],
    BackRoutesType[Route]["queryParamsSchema"],
    BackRoutesType[Route]["paramsSchema"],
    BackRoutesType[Route]["bodySchema"]
  >,
  "baseUrl" | "method" | "route" | "responseSchema"
>;

export const fetchBackend = async <const Route extends keyof typeof BACK_ROUTES>(
  route: Route,
  params: ParamsType<Route>,
) => {
  return fetchData({
    baseUrl: Env.BACKEND_URL,
    params: params.params,
    route: route,
    queryParams: params.queryParams,
    method: BACK_ROUTES[route].method,
    responseSchema: BACK_ROUTES[route].responseSchema,
    headers: params.headers,
    body: params.body,
  }) as Promise<z.infer<BackRoutesType[Route]["responseSchema"]>>;
};
