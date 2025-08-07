# API Gateway Authorization Audit Tool

A TypeScript tool to audit AWS API Gateway endpoints and their custom authorizers across your infrastructure.

## Overview

This tool helps you:
- Retrieve all API Gateways in your AWS account
- Get their respective base path mappings
- Identify custom authorizers referenced by each endpoint
- Generate a comprehensive audit report highlighting potential security gaps

## Prerequisites

- Node.js (v18 or higher)
- AWS credentials configured in your environment (via AWS CLI, environment variables, or IAM roles)
- Appropriate AWS permissions to read API Gateway resources

## Required AWS Permissions

Your AWS credentials need the following permissions:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "apigateway:GET"
      ],
      "Resource": "*"
    }
  ]
}
```

## Installation

1. Install dependencies:
```bash
npm install
```

## Usage

### Basic Usage
```bash
npm run audit
```

### Alternative Commands
```bash
# Run directly with tsx
npx tsx api-gateway-authorizer-audit.ts

# Or compile first then run
npm run build
node api-gateway-authorizer-audit.js
```

### Customizing Domain Name

By default, the script uses `myapi.com` as the domain name for constructing endpoint URLs. To use a different domain, modify the domain name in the script:

```typescript
// In the main() function, change:
const auditor = new APIGatewayAuditor("your-domain.com");
```

## Output

The tool generates two files:

1. **`api-gateway-audit-report.txt`** - Human-readable audit report
2. **`api-gateway-audit-report.json`** - Raw JSON data for programmatic processing

### Sample Report Structure

```
API Gateway Authorization Audit Report
=====================================

Generated on: 2024-01-15T10:30:00.000Z
Total API Gateways: 5
Total Endpoints: 23
Endpoints with Custom Authorizers: 18
Endpoints without Authorizers: 2

CUSTOM ENDPOINTS (18)
====================
GET    https://myapi.com/order-service/orders
       API Gateway: order-service-api (abc123def456)
       Authorizer: jwt-authorizer (auth123)
       Authorizer ARN: arn:aws:lambda:us-east-1:123456789012:function:jwt-authorizer

POST   https://myapi.com/order-service/orders
       API Gateway: order-service-api (abc123def456)
       Authorizer: jwt-authorizer (auth123)
       Authorizer ARN: arn:aws:lambda:us-east-1:123456789012:function:jwt-authorizer

NONE ENDPOINTS (2)
==================
GET    https://myapi.com/health-service/health
       API Gateway: health-service-api (xyz789abc123)

POTENTIAL SECURITY GAPS
======================

⚠️  Found 2 endpoints without authorization:

- GET https://myapi.com/health-service/health
- GET https://myapi.com/status-service/status
```

## How It Works

1. **Discovery**: Scans all API Gateways in your AWS account
2. **Base Path Mapping**: Retrieves custom domain mappings for each API Gateway
3. **Resource Analysis**: Examines all resources and HTTP methods for each API Gateway
4. **Authorization Check**: Identifies the authorization type and custom authorizer details
5. **Report Generation**: Creates comprehensive reports highlighting security gaps

## Troubleshooting

### Common Issues

1. **"Access Denied" errors**: Ensure your AWS credentials have the required API Gateway read permissions
2. **"No base path mappings found"**: This is normal if you're using default API Gateway domains
3. **Rate limiting**: The script includes error handling for AWS API rate limits

### Debug Mode

The script includes extensive console logging to help with debugging. Watch the console output for detailed progress information.

## Architecture Notes

This tool is designed for the following setup:
- Multiple microservices in separate Git repositories
- Each service deploys its own API Gateway
- Services use the Serverless framework
- Custom domain names with base path mappings
- Shared Lambda authorizers referenced via ARNs

## Future Enhancements

- Support for API Gateway v2 (HTTP APIs)
- Integration with AWS Organizations for multi-account audits
- Custom reporting formats (CSV, Excel)
- Integration with security scanning tools
- Automated remediation suggestions

## Contributing

Feel free to submit issues and enhancement requests!