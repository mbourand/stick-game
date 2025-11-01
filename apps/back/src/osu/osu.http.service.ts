import { Injectable } from "@nestjs/common";
import { OSU_CONFIG } from "../config/osu.config";
import axios from "axios";
import z from "zod";

@Injectable()
export class OsuHttpService {
  private accessToken: string | null = null;
  private expiresAt = 0;

  private async getToken() {
    if (!this.accessToken || Date.now() >= this.expiresAt) {
      const response = await axios.post(OSU_CONFIG.OSU_OAUTH_TOKEN_URL, {
        client_id: OSU_CONFIG.OSU_CLIENT_ID,
        client_secret: OSU_CONFIG.OSU_CLIENT_SECRET,
        grant_type: "client_credentials",
        scope: "public",
      });
      this.accessToken = response.data.access_token;
      this.expiresAt = Date.now() + response.data.expires_in * 1000 - 5000;
    }

    return this.accessToken;
  }

  async get<T>(endpoint: string, schema: z.ZodType<T>) {
    const token = await this.getToken();
    const response = await axios.get(OSU_CONFIG.OSU_API_BASE_URL + endpoint, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return schema.parse(response.data);
  }

  async post<T>(endpoint: string, data: T, schema: z.ZodType<T>) {
    const token = await this.getToken();
    const response = await axios.post(OSU_CONFIG.OSU_API_BASE_URL + endpoint, data, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const responseData = schema.parse(response.data);
    return responseData;
  }
}
