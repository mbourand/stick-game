import { Test, TestingModule } from "@nestjs/testing";
import { OsuHttpService } from "../osu.http.service";

describe("OsuHttpService", () => {
  let service: OsuHttpService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [OsuHttpService],
    }).compile();

    service = module.get<OsuHttpService>(OsuHttpService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
