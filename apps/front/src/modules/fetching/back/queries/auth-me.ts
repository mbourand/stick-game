import { fetchBackend } from "@/modules/fetching/back/fetchBackend";
import { queryOptions } from "@tanstack/react-query";

const fetchMe = async () => fetchBackend("/auth/me", {});

export const authMeQueryOptions = () =>
  queryOptions({
    queryKey: ["auth", "me"],
    queryFn: () => fetchMe(),
  });
