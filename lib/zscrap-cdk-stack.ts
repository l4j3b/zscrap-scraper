import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as lambdaNodejs from "aws-cdk-lib/aws-lambda-nodejs";
import * as sqs from "aws-cdk-lib/aws-sqs";
import * as path from "node:path";
import { SqsEventSource } from "aws-cdk-lib/aws-lambda-event-sources";
import * as dotenv from "dotenv";
import * as apigateway from "aws-cdk-lib/aws-apigateway";

dotenv.config();

const MAX_CONCURRENCY = 10;

export class ZscrapCdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Check if required environment variables are set
    if (
      !process.env.API_KEY_SECRET ||
      !process.env.TEST_MODE ||
      !process.env.SUPABASE_URL ||
      !process.env.SUPABASE_ANON_KEY ||
      !process.env.ZENROWS_API_KEY ||
      !process.env.OPENAI_API_KEY ||
      !process.env.SENTRY_DSN ||
      !process.env.SENTRY_TRACES_SAMPLE_RATE ||
      !process.env.NODE_OPTIONS
    ) {
      throw new Error("Missing required environment variables");
    }

    const environment = {
      TEST_MODE: process.env.TEST_MODE,
      SUPABASE_URL: process.env.SUPABASE_URL,
      SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
      ZENROWS_API_KEY: process.env.ZENROWS_API_KEY,
      OPENAI_API_KEY: process.env.OPENAI_API_KEY,
      SENTRY_DSN: process.env.SENTRY_DSN,
      SENTRY_TRACES_SAMPLE_RATE: process.env.SENTRY_TRACES_SAMPLE_RATE,
      NODE_OPTIONS: process.env.NODE_OPTIONS,
    };

    const bundling = {
      forceDockerBundling: true,
      platform: "linux/amd64",
      nodeModules: ["@supabase/supabase-js", "@sentry/aws-serverless"],
    };

    // Create an SQS FIFO queue
    const zscrapQueue = new sqs.Queue(this, "ZscrapQueue", {
      queueName: "ZscrapQueue.fifo",
      fifo: true,
      contentBasedDeduplication: true,
      visibilityTimeout: cdk.Duration.seconds(45),
      retentionPeriod: cdk.Duration.days(4),
    });

    // Create the Lambda function using NodejsFunction
    const zscrapScraperWorker = new lambdaNodejs.NodejsFunction(
      this,
      "ZscrapScraperLambdaWorker",
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        handler: "handler",
        entry: path.join(__dirname, "../lambda/scraper-worker.ts"),
        timeout: cdk.Duration.seconds(40),
        memorySize: 512,
        environment,
        bundling,
      }
    );

    // Add SQS as an event source for the Lambda function
    zscrapScraperWorker.addEventSource(
      new SqsEventSource(zscrapQueue, {
        batchSize: 4, // Process one message at a time due to ~15s processing time
        maxConcurrency: MAX_CONCURRENCY,
      })
    );

    // Grant the Lambda function permissions to consume messages from the queue
    zscrapQueue.grantConsumeMessages(zscrapScraperWorker);

    // Create the Lambda function for direct API invocation from the frontend
    const zscrapScraperEndpoint = new lambdaNodejs.NodejsFunction(
      this,
      "ZscrapScraperLambdaEndpoint",
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        handler: "handler",
        entry: path.join(__dirname, "../lambda/scraper-endpoint.ts"),
        timeout: cdk.Duration.seconds(40),
        memorySize: 512,
        environment: {
          ...environment,
          API_KEY_SECRET: process.env.API_KEY_SECRET,
        },
        bundling,
      }
    );

    // Add a Function URL for direct invocation (to avoid API Gateway timeout)
    const functionUrl = zscrapScraperEndpoint.addFunctionUrl({
      // No authentication, open to the public (called from the backend with api key for now)
      authType: lambda.FunctionUrlAuthType.NONE,
      cors: {
        allowedOrigins: ["*"],
        allowedMethods: [lambda.HttpMethod.POST],
        allowedHeaders: ["*"],
      },
    });

    new cdk.CfnOutput(this, "ZscrapScraperEndpointFunctionUrl", {
      value: functionUrl.url,
      description: "The Function URL of the Zscrap Scraper Lambda Endpoint",
    });

    // // Create an API Gateway and integrate it with the Lambda function
    // const api = new apigateway.LambdaRestApi(
    //   this,
    //   "ZscrapScraperAPIGatewayEndpoint",
    //   {
    //     handler: zscrapScraperEndpoint,
    //     proxy: false,
    //   }
    // );

    // // Define the API endpoint and methods
    // const processUrlResource = api.root.addResource("process-url");
    // processUrlResource.addMethod("POST");
  }
}
