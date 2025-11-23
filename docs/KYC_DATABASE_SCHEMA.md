# KYC Proof Database Schema

## DynamoDB Table: `treza-kyc-proofs`

### Table Configuration

```yaml
TableName: treza-kyc-proofs
BillingMode: PAY_PER_REQUEST  # or PROVISIONED
PartitionKey: proofId (String)
TTL: expiresAt (Number, epoch timestamp)
```

### Item Schema

```typescript
interface ProofRecord {
  // Primary Key
  proofId: string;              // UUID, Partition Key
  
  // User Info
  userId: string;               // UUID from KYC submission
  
  // Proof Data
  commitment: string;           // 64-char hex string (SHA-256 hash)
  proof: string;                // 256+ char proof signature
  publicInputs: string[];       // Array of public claims
  algorithm: string;            // "Pedersen-SHA256"
  
  // Status
  status: string;               // "verified" | "pending" | "expired"
  verifiedAt?: string;          // ISO 8601 timestamp
  
  // Expiry
  expiresAt: string;            // ISO 8601 timestamp (7 days from creation)
  createdAt: string;            // ISO 8601 timestamp
  
  // Device Info
  devicePlatform?: string;      // "iOS" | "Android"
  deviceVersion?: string;       // App version
  
  // Blockchain
  chainTxHash?: string;         // Transaction hash if posted on-chain
  chainVerified: boolean;       // Whether verified on blockchain
}
```

### Indexes

#### GSI-1: User Proofs Index
```yaml
IndexName: userId-createdAt-index
PartitionKey: userId
SortKey: createdAt
ProjectionType: ALL
```

**Use case:** Query all proofs for a specific user
```typescript
// Query
{
  IndexName: "userId-createdAt-index",
  KeyConditionExpression: "userId = :userId",
  ExpressionAttributeValues: {
    ":userId": "user-123"
  }
}
```

#### GSI-2: Commitment Index
```yaml
IndexName: commitment-index
PartitionKey: commitment
ProjectionType: ALL
```

**Use case:** Check if a commitment already exists (prevent duplicates)
```typescript
// Query
{
  IndexName: "commitment-index",
  KeyConditionExpression: "commitment = :commitment",
  ExpressionAttributeValues: {
    ":commitment": "a1b2c3d4e5f6..."
  }
}
```

### CloudFormation Template

```yaml
Resources:
  KYCProofsTable:
    Type: AWS::DynamoDB::Table
    Properties:
      TableName: treza-kyc-proofs
      BillingMode: PAY_PER_REQUEST
      AttributeDefinitions:
        - AttributeName: proofId
          AttributeType: S
        - AttributeName: userId
          AttributeType: S
        - AttributeName: createdAt
          AttributeType: S
        - AttributeName: commitment
          AttributeType: S
      KeySchema:
        - AttributeName: proofId
          KeyType: HASH
      GlobalSecondaryIndexes:
        - IndexName: userId-createdAt-index
          KeySchema:
            - AttributeName: userId
              KeyType: HASH
            - AttributeName: createdAt
              KeyType: RANGE
          Projection:
            ProjectionType: ALL
        - IndexName: commitment-index
          KeySchema:
            - AttributeName: commitment
              KeyType: HASH
          Projection:
            ProjectionType: ALL
      TimeToLiveSpecification:
        Enabled: true
        AttributeName: expiresAt
      Tags:
        - Key: Project
          Value: Treza
        - Key: Component
          Value: KYC
```

### AWS CLI Commands

#### Create Table

```bash
aws dynamodb create-table \
  --table-name treza-kyc-proofs \
  --attribute-definitions \
    AttributeName=proofId,AttributeType=S \
    AttributeName=userId,AttributeType=S \
    AttributeName=createdAt,AttributeType=S \
    AttributeName=commitment,AttributeType=S \
  --key-schema \
    AttributeName=proofId,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --global-secondary-indexes \
    "[
      {
        \"IndexName\": \"userId-createdAt-index\",
        \"KeySchema\": [
          {\"AttributeName\": \"userId\", \"KeyType\": \"HASH\"},
          {\"AttributeName\": \"createdAt\", \"KeyType\": \"RANGE\"}
        ],
        \"Projection\": {\"ProjectionType\": \"ALL\"}
      },
      {
        \"IndexName\": \"commitment-index\",
        \"KeySchema\": [
          {\"AttributeName\": \"commitment\", \"KeyType\": \"HASH\"}
        ],
        \"Projection\": {\"ProjectionType\": \"ALL\"}
      }
    ]"
```

#### Enable TTL

```bash
aws dynamodb update-time-to-live \
  --table-name treza-kyc-proofs \
  --time-to-live-specification \
    Enabled=true,AttributeName=expiresAt
```

### Environment Variables

Add to `.env.local`:

```bash
# DynamoDB Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
DYNAMODB_TABLE_NAME=treza-kyc-proofs
```

### Example Queries

#### Get Proof by ID

```typescript
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({ region: 'us-east-1' });
const ddbDocClient = DynamoDBDocumentClient.from(client);

const result = await ddbDocClient.send(
  new GetCommand({
    TableName: 'treza-kyc-proofs',
    Key: { proofId: 'abc-123' },
  })
);

const proof = result.Item;
```

#### Query User's Proofs

```typescript
import { QueryCommand } from '@aws-sdk/lib-dynamodb';

const result = await ddbDocClient.send(
  new QueryCommand({
    TableName: 'treza-kyc-proofs',
    IndexName: 'userId-createdAt-index',
    KeyConditionExpression: 'userId = :userId',
    ExpressionAttributeValues: {
      ':userId': 'user-123',
    },
    ScanIndexForward: false, // Most recent first
    Limit: 10,
  })
);

const proofs = result.Items;
```

#### Check for Duplicate Commitment

```typescript
const result = await ddbDocClient.send(
  new QueryCommand({
    TableName: 'treza-kyc-proofs',
    IndexName: 'commitment-index',
    KeyConditionExpression: 'commitment = :commitment',
    ExpressionAttributeValues: {
      ':commitment': 'a1b2c3d4e5f6...',
    },
  })
);

const exists = result.Items && result.Items.length > 0;
```

### Security Considerations

1. **Access Control**
   - Use IAM roles for API access to DynamoDB
   - Never expose AWS credentials in client code
   - Implement fine-grained access control

2. **Data Privacy**
   - Never store raw KYC data (only commitments)
   - Encrypt sensitive fields at rest
   - Use TTL to auto-delete expired proofs

3. **Rate Limiting**
   - Implement rate limiting on API endpoints
   - Use DynamoDB's built-in throttling
   - Monitor for abuse patterns

### Monitoring

#### CloudWatch Metrics

```typescript
// Add metrics to API endpoints
await cloudwatch.putMetricData({
  Namespace: 'Treza/KYC',
  MetricData: [
    {
      MetricName: 'ProofSubmissions',
      Value: 1,
      Unit: 'Count',
      Timestamp: new Date(),
    },
    {
      MetricName: 'ProofVerifications',
      Value: 1,
      Unit: 'Count',
      Timestamp: new Date(),
    },
  ],
});
```

### Cost Estimation

**Assumptions:**
- 10,000 proofs/month
- Average item size: 2 KB
- 7-day TTL (auto-delete)

**Monthly Costs:**
- Storage: ~$0.50 (10k items × 2 KB = 20 MB)
- Writes: ~$1.25 (10k writes)
- Reads: ~$0.25 (assume 2:1 read/write ratio)

**Total:** ~$2/month for small-scale usage

For high-scale usage (1M+ proofs/month), consider:
- Provisioned capacity
- DynamoDB on-demand with reserved capacity
- S3 for archival storage

---

**Created:** November 22, 2025  
**Author:** Treza Development Team

