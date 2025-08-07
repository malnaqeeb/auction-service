# API Gateway Authorization Audit Tool

A TypeScript tool to audit AWS API Gateway endpoints and their associated custom authorizers across all your microservices. This tool helps identify potential security gaps by providing visibility into authorization configurations across your entire API ecosystem.

## Overview

This tool addresses the challenge of having visibility into endpoint authorization across multiple API Gateways deployed by different teams. It:

- 🔍 **Discovers** all API Gateways in your AWS account
- 📋 **Inventories** all endpoints and their HTTP methods
- 🔐 **Audits** authorization configurations (custom authorizers, API keys, etc.)
- 📊 **Reports** potential security gaps (unauthorized endpoints)
- 📄 **Outputs** detailed audit results to a text file

## Features

- **Comprehensive Discovery**: Finds all API Gateways and their resources
- **Authorization Analysis**: Identifies which endpoints use which authorizers
- **Security Gap Detection**: Highlights endpoints without proper authorization
- **Detailed Reporting**: Generates human-readable audit reports
- **Debug Logging**: Extensive console output for troubleshooting
- **Error Handling**: Graceful handling of permission issues and missing resources

## Prerequisites

- Node.js 18.0.0 or higher
- AWS credentials configured (via environment variables, AWS CLI, or IAM roles)
- Appropriate AWS permissions:
  - `apigateway:GET` (for API Gateway operations)
  - Access to all API Gateways you want to audit

## Installation

1. Clone or download the files to your local machine
2. Install dependencies:

```bash
npm install
```

## Usage

### Quick Start

```bash
# Run the audit
npm run audit

# Or directly with ts-node
npx ts-node api-gateway-audit.ts

# Or compile and run
npm run build
npm start
```

### AWS Credentials

Ensure your AWS credentials are available through one of these methods:

```bash
# Environment variables
export AWS_ACCESS_KEY_ID=your-access-key
export AWS_SECRET_ACCESS_KEY=your-secret-key
export AWS_REGION=us-east-1

# Or use AWS CLI profile
aws configure

# Or use IAM roles if running on EC2/Lambda
```

## Output

The tool generates two types of output:

### 1. Console Output
Real-time progress and debugging information:
```
🔍 API Gateway Authorization Audit Tool
========================================

🚀 API Gateway Auditor initialized
📋 Retrieving all API Gateways...
✅ Found 3 API Gateways
  - order-service-api (ID: abc123def)
  - company-service-api (ID: xyz789uvw)
  - user-service-api (ID: mno456pqr)

🔍 Auditing API Gateway: order-service-api (abc123def)
📂 Getting resources for API Gateway: abc123def
  Found 4 resources for API abc123def
  📍 Resource: / (root123)
    🔗 Method: GET
      🔐 Authorization: CUSTOM (auth-lambda-123)
```

### 2. Text Report File
Detailed audit report saved as `api-gateway-audit-report.txt`:

```
================================================================================
API GATEWAY AUTHORIZATION AUDIT REPORT
================================================================================
Generated: 2024-01-15T10:30:45.123Z
Total API Gateways: 3
Total Endpoints: 12

AUTHORIZATION SUMMARY:
----------------------------------------
auth-lambda-123: 8 endpoints
auth-lambda-456: 3 endpoints
NONE/Unauthorized: 1 endpoints

DETAILED ENDPOINT LISTING:
----------------------------------------
GET    unknown/orders
       API: order-service-api (abc123def)
       Auth: CUSTOM (auth-lambda-123)
       ARN: arn:aws:apigateway:us-east-1:lambda:path/2015-03-31/functions/auth-lambda-123

⚠️  UNAUTHORIZED ENDPOINTS (POTENTIAL SECURITY GAPS):
------------------------------------------------------------
❌ GET unknown/health
   API: order-service-api (abc123def)
```

## Understanding the Report

### Authorization Types
- **CUSTOM**: Uses a Lambda authorizer (your custom authorizers)
- **AWS_IAM**: Uses AWS IAM for authorization
- **COGNITO_USER_POOLS**: Uses Cognito User Pools
- **NONE**: No authorization (⚠️ potential security risk)

### Key Sections
1. **Authorization Summary**: Count of endpoints by authorizer type
2. **Detailed Endpoint Listing**: All endpoints with their authorization details
3. **Unauthorized Endpoints**: Endpoints without authorization (security gaps)
4. **Endpoints by Authorizer**: Grouped view of which endpoints use which authorizers

## Troubleshooting

### Common Issues

**1. Permission Errors**
```
❌ Error retrieving API Gateways: AccessDenied
```
**Solution**: Ensure your AWS credentials have `apigateway:GET` permissions.

**2. No API Gateways Found**
```
✅ Found 0 API Gateways
```
**Solution**: Check if you're in the correct AWS region and have API Gateways deployed.

**3. Resource Access Errors**
```
⚠️  Could not get method details for GET on resource xyz: AccessDenied
```
**Solution**: This is usually fine - the tool will continue with other resources.

### Debug Mode
The tool includes extensive logging. If you need more details, check the console output for:
- API Gateway discovery process
- Resource enumeration
- Method details retrieval
- Authorization information extraction

## Customization

### Modify Output Format
Edit the `generateReport()` method in the `APIGatewayAuditor` class to customize the report format.

### Add Custom Filtering
Modify the `performFullAudit()` method to filter specific API Gateways or endpoints.

### Change Output File
Modify the filename in the `main()` function:
```typescript
await auditor.saveReport(report, 'custom-audit-report.txt');
```

## Security Considerations

- The tool only reads API Gateway configurations (no modifications)
- Ensure your AWS credentials follow the principle of least privilege
- Review the generated report for sensitive information before sharing
- Store audit reports securely as they contain your API structure

## Contributing

To enhance this tool:

1. Add support for API Gateway v2 (HTTP APIs)
2. Include custom domain name resolution
3. Add filtering options for specific services
4. Export results in JSON/CSV format
5. Add integration with security scanning tools

## License

MIT License - see LICENSE file for details.