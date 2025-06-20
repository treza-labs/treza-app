import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { 
  DynamoDBDocumentClient, 
  PutCommand, 
  GetCommand, 
  QueryCommand, 
  UpdateCommand, 
  DeleteCommand 
} from '@aws-sdk/lib-dynamodb';

// Initialize DynamoDB client
const client = new DynamoDBClient({ 
  region: process.env.AWS_REGION || 'us-west-2',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  }
});

export const docClient = DynamoDBDocumentClient.from(client);

// Table names
export const TABLES = {
  ENCLAVES: 'treza-enclaves',
  TASKS: 'treza-tasks',
  API_KEYS: 'treza-api-keys'
} as const;

// Helper function to generate unique IDs
export function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Helper function to get current timestamp
export function getCurrentTimestamp(): string {
  return new Date().toISOString();
}

// Generic DynamoDB operations
export async function putItem(tableName: string, item: any) {
  const command = new PutCommand({
    TableName: tableName,
    Item: item
  });
  return await docClient.send(command);
}

export async function getItem(tableName: string, key: any) {
  const command = new GetCommand({
    TableName: tableName,
    Key: key
  });
  return await docClient.send(command);
}

export async function queryItems(tableName: string, indexName: string, keyConditionExpression: string, expressionAttributeValues: any) {
  const command = new QueryCommand({
    TableName: tableName,
    IndexName: indexName,
    KeyConditionExpression: keyConditionExpression,
    ExpressionAttributeValues: expressionAttributeValues
  });
  return await docClient.send(command);
}

export async function updateItem(
  tableName: string, 
  key: any, 
  updateExpression: string, 
  expressionAttributeValues: any, 
  conditionExpression?: string,
  expressionAttributeNames?: any
) {
  const command = new UpdateCommand({
    TableName: tableName,
    Key: key,
    UpdateExpression: updateExpression,
    ExpressionAttributeValues: expressionAttributeValues,
    ...(expressionAttributeNames && { ExpressionAttributeNames: expressionAttributeNames }),
    ...(conditionExpression && { ConditionExpression: conditionExpression }),
    ReturnValues: 'ALL_NEW'
  });
  return await docClient.send(command);
}

export async function deleteItem(tableName: string, key: any, conditionExpression?: string, expressionAttributeValues?: any) {
  const command = new DeleteCommand({
    TableName: tableName,
    Key: key,
    ...(conditionExpression && { ConditionExpression: conditionExpression }),
    ...(expressionAttributeValues && { ExpressionAttributeValues: expressionAttributeValues })
  });
  return await docClient.send(command);
} 