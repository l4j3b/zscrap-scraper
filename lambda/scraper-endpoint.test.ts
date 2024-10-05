import { handler } from "./scraper-endpoint";
import { APIGatewayProxyEvent } from "aws-lambda";

describe("ZscrapScraperEndpoint", () => {
  it("should return a 200 response for valid input", async () => {
    const event = {
      body: JSON.stringify({
        url: "https://www.youtube.com/watch?v=w4LRUBFy3pc",
        prompt: "Extract the tracklist.",
      }),
      headers: {
        Authorization: `Bearer ${process.env.SCRAPER_ORG_API_KEY}`,
      },
      // Additional params to make the event valid
      httpMethod: "POST",
      isBase64Encoded: false,
      path: "/",
      queryStringParameters: null,
      multiValueHeaders: {},
      multiValueQueryStringParameters: null,
      stageVariables: null,
      requestContext: {} as any,
      resource: "",
      pathParameters: null,
    } as APIGatewayProxyEvent;

    const result = await handler(event, {} as any, {} as any);

    if (!result) {
      throw new Error("Handler returned void");
    }

    console.log("Result:", result.body.slice(0, 1000));

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body)).toHaveProperty("result");
  }, 30000);

  it("should return a 401 response for missing API key", async () => {
    const event = {
      body: JSON.stringify({
        url: "https://www.youtube.com/watch?v=w4LRUBFy3pc",
        prompt: "Extract the tracklist.",
      }),
      headers: {},
    } as APIGatewayProxyEvent;

    const result = await handler(event, {} as any, {} as any);

    if (!result) {
      throw new Error("Handler returned void");
    }

    expect(result.statusCode).toBe(401);
  });
});
