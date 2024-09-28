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

export class ZscrapCdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Check if required environment variables are set
    if (
      !process.env.DEBUG ||
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
      DEBUG: process.env.DEBUG,
      SUPABASE_URL: process.env.SUPABASE_URL,
      SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
      ZENROWS_API_KEY: process.env.ZENROWS_API_KEY,
      OPENAI_API_KEY: process.env.OPENAI_API_KEY,
      SENTRY_DSN: process.env.SENTRY_DSN,
      SENTRY_TRACES_SAMPLE_RATE: process.env.SENTRY_TRACES_SAMPLE_RATE,
      NODE_OPTIONS: process.env.NODE_OPTIONS,
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
        timeout: cdk.Duration.seconds(30),
        environment,
        // bundling: {
        //   nodeModules: ["@supabase/supabase-js"],
        // },
      }
    );

    // Add SQS as an event source for the Lambda function
    zscrapScraperWorker.addEventSource(
      new SqsEventSource(zscrapQueue, {
        batchSize: 1, // Process one message at a time due to ~15s processing time
      })
    );

    // Grant the Lambda function permissions to consume messages from the queue
    zscrapQueue.grantConsumeMessages(zscrapScraperWorker);

    // Create the Lambda function for API invocation
    const zscrapScraperEndpoint = new lambdaNodejs.NodejsFunction(
      this,
      "ZscrapScraperLambdaEndpoint",
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        handler: "handler",
        entry: path.join(__dirname, "../lambda/scraper-endpoint.ts"),
        timeout: cdk.Duration.seconds(30),
        environment,
      }
    );

    // Create an API Gateway and integrate it with the Lambda function
    const api = new apigateway.LambdaRestApi(
      this,
      "ZscrapScraperAPIGatewayEndpoint",
      {
        handler: zscrapScraperEndpoint,
        proxy: false,
      }
    );

    // Define the API endpoint and methods
    const processUrlResource = api.root.addResource("process-url");
    processUrlResource.addMethod("POST");
  }
}
