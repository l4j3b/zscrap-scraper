import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as lambdaNodejs from "aws-cdk-lib/aws-lambda-nodejs";
import * as sqs from "aws-cdk-lib/aws-sqs";
import * as path from "node:path";
import { SqsEventSource } from "aws-cdk-lib/aws-lambda-event-sources";
import * as dotenv from "dotenv";

dotenv.config();

export class ZscrapCdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create an SQS FIFO queue
    const zscrapQueue = new sqs.Queue(this, "ZscrapQueue", {
      queueName: "ZscrapQueue.fifo",
      fifo: true,
      contentBasedDeduplication: true,
      visibilityTimeout: cdk.Duration.seconds(45),
      retentionPeriod: cdk.Duration.days(4),
    });

    // Create the Lambda function using NodejsFunction
    const zscrapScraper = new lambdaNodejs.NodejsFunction(
      this,
      "ZscrapLambdaScraper",
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        handler: "handler",
        entry: path.join(__dirname, "../lambda/scraper.ts"),
        timeout: cdk.Duration.seconds(30),
        // memorySize: 1024,
        environment: {
          SUPABASE_URL: process.env.SUPABASE_URL || "",
          SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || "",
        },
        // bundling: {
        //   nodeModules: ["@supabase/supabase-js"],
        // },
      }
    );

    // Add SQS as an event source for the Lambda function
    zscrapScraper.addEventSource(
      new SqsEventSource(zscrapQueue, {
        batchSize: 1, // Process one message at a time due to ~15s processing time
      })
    );

    // Grant the Lambda function permissions to consume messages from the queue
    zscrapQueue.grantConsumeMessages(zscrapScraper);
  }
}
