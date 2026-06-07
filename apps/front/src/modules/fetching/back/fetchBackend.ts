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
  zLeaderboardsControllerGetPlayerRankingsData,
  zLeaderboardsControllerGetPlayerRankingsResponse,
  zLeaderboardsControllerGetMyPlayerRankData,
  zLeaderboardsControllerGetMyPlayerRankResponse,
  zAuthControllerProvidersData,
  zAuthControllerProvidersResponse,
  zUsersControllerMeData,
  zUsersControllerMeResponse,
  zUsersControllerUpdateUsernameData,
  zUsersControllerUpdateUsernameResponse,
} from "@tau/back-schemas";
import { Env } from "@/modules/env/Env";
import { getAuthToken } from "@/modules/auth/authStore";
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
  "/leaderboards/players": {
    method: "GET",
    queryParamsSchema: zLeaderboardsControllerGetPlayerRankingsData.shape.query,
    paramsSchema: zLeaderboardsControllerGetPlayerRankingsData.shape.path,
    bodySchema: zLeaderboardsControllerGetPlayerRankingsData.shape.body,
    responseSchema: zLeaderboardsControllerGetPlayerRankingsResponse,
  },
  "/leaderboards/players/me": {
    method: "GET",
    queryParamsSchema: zLeaderboardsControllerGetMyPlayerRankData.shape.query,
    paramsSchema: zLeaderboardsControllerGetMyPlayerRankData.shape.path,
    bodySchema: zLeaderboardsControllerGetMyPlayerRankData.shape.body,
    responseSchema: zLeaderboardsControllerGetMyPlayerRankResponse,
  },
  "/auth/providers": {
    method: "GET",
    queryParamsSchema: zAuthControllerProvidersData.shape.query,
    paramsSchema: zAuthControllerProvidersData.shape.path,
    bodySchema: zAuthControllerProvidersData.shape.body,
    responseSchema: zAuthControllerProvidersResponse,
  },
  "/users/me": {
    method: "GET",
    queryParamsSchema: zUsersControllerMeData.shape.query,
    paramsSchema: zUsersControllerMeData.shape.path,
    bodySchema: zUsersControllerMeData.shape.body,
    responseSchema: zUsersControllerMeResponse,
  },
  "/users/me/username": {
    method: "PATCH",
    queryParamsSchema: zUsersControllerUpdateUsernameData.shape.query,
    paramsSchema: zUsersControllerUpdateUsernameData.shape.path,
    bodySchema: zUsersControllerUpdateUsernameData.shape.body,
    responseSchema: zUsersControllerUpdateUsernameResponse,
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
  // Attach the session token (when logged in) so authed routes — score submit,
  // profile — are recognised. Public routes simply ignore it.
  const token = getAuthToken();
  const headers = token ? { Authorization: `Bearer ${token}`, ...params.headers } : params.headers;

  return fetchData({
    baseUrl: Env.BACKEND_URL,
    params: params.params,
    route: route,
    queryParams: params.queryParams,
    method: BACK_ROUTES[route].method,
    responseSchema: BACK_ROUTES[route].responseSchema,
    headers,
    body: params.body,
  }) as Promise<z.infer<BackRoutesType[Route]["responseSchema"]>>;
};
