import { fetchData, FetchDataParams } from "@/modules/fetching/fetcher";
import {
  zOsuControllerBeatmapsetsSearchResponse,
  zOsuControllerBeatmapsetsSearchData,
  zScoresControllerSubmitScoreData,
  zScoresControllerSubmitScoreResponse,
  zScoresControllerGetBeatmapLeaderboardData,
  zScoresControllerGetBeatmapLeaderboardResponse,
  zAuthControllerRegisterData,
  zAuthControllerRegisterResponse,
  zAuthControllerLoginData,
  zAuthControllerLoginResponse,
  zAuthControllerMeData,
  zAuthControllerMeResponse,
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
  "/auth/register": {
    method: "POST",
    queryParamsSchema: zAuthControllerRegisterData.shape.query,
    paramsSchema: zAuthControllerRegisterData.shape.path,
    bodySchema: zAuthControllerRegisterData.shape.body,
    responseSchema: zAuthControllerRegisterResponse,
  },
  "/auth/login": {
    method: "POST",
    queryParamsSchema: zAuthControllerLoginData.shape.query,
    paramsSchema: zAuthControllerLoginData.shape.path,
    bodySchema: zAuthControllerLoginData.shape.body,
    responseSchema: zAuthControllerLoginResponse,
  },
  "/auth/me": {
    method: "GET",
    queryParamsSchema: zAuthControllerMeData.shape.query,
    paramsSchema: zAuthControllerMeData.shape.path,
    bodySchema: zAuthControllerMeData.shape.body,
    responseSchema: zAuthControllerMeResponse,
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
  const authToken = localStorage.getItem("authToken");

  return fetchData({
    baseUrl: Env.NEXT_PUBLIC_BACKEND_URL,
    params: params.params,
    route: route,
    queryParams: params.queryParams,
    method: BACK_ROUTES[route].method,
    responseSchema: BACK_ROUTES[route].responseSchema,
    headers: {
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...params.headers,
    },
    body: params.body,
  }) as Promise<z.infer<BackRoutesType[Route]["responseSchema"]>>;
};
