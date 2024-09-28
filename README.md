# Welcome to your CDK TypeScript project

This is a blank project for CDK development with TypeScript.

The `cdk.json` file tells the CDK Toolkit how to execute your app.

## Useful commands

- `npm run build` compile typescript to js
- `npm run watch` watch for changes and compile
- `npm run test` perform the jest unit tests
- `npx cdk deploy` deploy this stack to your default AWS account/region
- `npx cdk diff` compare deployed stack with current state
- `npx cdk synth` emits the synthesized CloudFormation template

## Test

```
curl -X POST 'https://<api-id>.execute-api.us-east-1.amazonaws.com/prod/process-url' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer sk_your_api_key' \
  -d '{
    "url": "https://www.youtube.com/watch?v=w4LRUBFy3pc",
    "prompt": "Extract the tracklist."
  }'
```
