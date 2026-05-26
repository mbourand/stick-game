import "dotenv/config";
import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app/app.module";

import { SERVER_CONFIG } from "./config/server.config";
import { cleanupOpenApiDoc } from "nestjs-zod";
import { writeFileSync } from "fs";
import path from "path";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 🔧 Swagger configuration
  const config = new DocumentBuilder()
    .setTitle("Tau API")
    .setDescription("API documentation for the Tau backend")
    .setVersion("1.0.0")
    .build();

  // 🌐 Server setup
  const globalPrefix = "api";
  app.setGlobalPrefix(globalPrefix);

  app.enableCors({
    origin: process.env.NODE_ENV === "development" ? "*" : SERVER_CONFIG.FRONTEND_ORIGIN,
  });

  const document = cleanupOpenApiDoc(SwaggerModule.createDocument(app, config));
  SwaggerModule.setup("docs", app, document);
  if (process.env.NODE_ENV === "development") {
    const openApiSpecPath = path.join(__dirname, "../../../packages/api-schemas/back-schemas/openapi.json");
    Logger.log(`Writing OpenAPI spec to ${openApiSpecPath}`);
    writeFileSync(openApiSpecPath, JSON.stringify(document));
  }

  const port = SERVER_CONFIG.PORT;
  await app.listen(port);

  Logger.log(`🚀 Application is running on: http://localhost:${port}/${globalPrefix}`);
  Logger.log(`📚 Swagger is running on: http://localhost:${port}/${globalPrefix}/docs`);
}

bootstrap();
