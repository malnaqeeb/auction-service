import {
  APIGatewayClient,
  GetRestApisCommand,
  GetBasePathMappingsCommand,
  GetResourcesCommand,
  GetMethodCommand,
  GetAuthorizersCommand,
  GetAuthorizerCommand,
} from "@aws-sdk/client-api-gateway";
import { writeFileSync } from "fs";

// Types for our audit results
interface EndpointInfo {
  apiGatewayId: string;
  apiGatewayName: string;
  basePath: string;
  httpMethod: string;
  resourcePath: string;
  fullEndpoint: string;
  authorizerType: string;
  authorizerName?: string;
  authorizerArn?: string;
  authorizerId?: string;
}

interface AuditResults {
  totalApiGateways: number;
  totalEndpoints: number;
  endpointsWithCustomAuthorizers: number;
  endpointsWithoutAuthorizers: number;
  endpoints: EndpointInfo[];
}

class APIGatewayAuditor {
  private client: APIGatewayClient;
  private domainName: string;

  constructor(domainName: string = "myapi.com") {
    this.client = new APIGatewayClient({});
    this.domainName = domainName;
  }

  async auditAllApiGateways(): Promise<AuditResults> {
    console.log("🔍 Starting API Gateway audit...");
    
    const results: AuditResults = {
      totalApiGateways: 0,
      totalEndpoints: 0,
      endpointsWithCustomAuthorizers: 0,
      endpointsWithoutAuthorizers: 0,
      endpoints: []
    };

    try {
      // Step 1: Get all API Gateways
      const apiGateways = await this.getAllApiGateways();
      results.totalApiGateways = apiGateways.length;
      console.log(`📊 Found ${apiGateways.length} API Gateways`);

      // Step 2: Process each API Gateway
      for (const apiGateway of apiGateways) {
        console.log(`\n🔄 Processing API Gateway: ${apiGateway.name} (${apiGateway.id})`);
        
        try {
          // Get base path mappings
          const basePathMappings = await this.getBasePathMappings(apiGateway.id!);
          console.log(`  📍 Found ${basePathMappings.length} base path mappings`);

          // Get all authorizers for this API Gateway
          const authorizers = await this.getAuthorizers(apiGateway.id!);
          console.log(`  🔐 Found ${authorizers.length} authorizers`);

          // Get all resources and their methods
          const endpoints = await this.getEndpointsForApiGateway(
            apiGateway.id!,
            apiGateway.name!,
            basePathMappings,
            authorizers
          );
          
          results.endpoints.push(...endpoints);
          results.totalEndpoints += endpoints.length;
          
          const withCustomAuth = endpoints.filter(e => e.authorizerType === 'CUSTOM').length;
          const withoutAuth = endpoints.filter(e => e.authorizerType === 'NONE').length;
          
          results.endpointsWithCustomAuthorizers += withCustomAuth;
          results.endpointsWithoutAuthorizers += withoutAuth;
          
          console.log(`  ✅ Processed ${endpoints.length} endpoints (${withCustomAuth} with custom auth, ${withoutAuth} without auth)`);
        } catch (error) {
          console.error(`  ❌ Error processing API Gateway ${apiGateway.name}:`, error);
        }
      }

      console.log(`\n🎯 Audit completed successfully!`);
      console.log(`📈 Summary: ${results.totalEndpoints} total endpoints across ${results.totalApiGateways} API Gateways`);
      console.log(`🔐 ${results.endpointsWithCustomAuthorizers} endpoints with custom authorizers`);
      console.log(`⚠️  ${results.endpointsWithoutAuthorizers} endpoints without authorizers`);

      return results;
    } catch (error) {
      console.error("💥 Fatal error during audit:", error);
      throw error;
    }
  }

  private async getAllApiGateways() {
    console.log("🔍 Retrieving all API Gateways...");
    
    const command = new GetRestApisCommand({
      limit: 500 // Adjust if you have more than 500 API Gateways
    });
    
    const response = await this.client.send(command);
    return response.items || [];
  }

  private async getBasePathMappings(apiGatewayId: string) {
    try {
      const command = new GetBasePathMappingsCommand({
        domainName: this.domainName
      });
      
      const response = await this.client.send(command);
      
      // Filter mappings for this specific API Gateway
      const mappings = (response.items || []).filter(
        mapping => mapping.restApiId === apiGatewayId
      );
      
      return mappings;
    } catch (error) {
      console.log(`  ⚠️  No base path mappings found for domain ${this.domainName} (this is normal if using default domain)`);
      return [];
    }
  }

  private async getAuthorizers(apiGatewayId: string) {
    try {
      const command = new GetAuthorizersCommand({
        restApiId: apiGatewayId
      });
      
      const response = await this.client.send(command);
      return response.items || [];
    } catch (error) {
      console.log(`  ⚠️  Error getting authorizers for API Gateway ${apiGatewayId}:`, error);
      return [];
    }
  }

  private async getEndpointsForApiGateway(
    apiGatewayId: string,
    apiGatewayName: string,
    basePathMappings: any[],
    authorizers: any[]
  ): Promise<EndpointInfo[]> {
    const endpoints: EndpointInfo[] = [];

    try {
      // Get all resources for this API Gateway
      const resourcesCommand = new GetResourcesCommand({
        restApiId: apiGatewayId,
        limit: 500
      });
      
      const resourcesResponse = await this.client.send(resourcesCommand);
      const resources = resourcesResponse.items || [];
      
      console.log(`    📂 Found ${resources.length} resources`);

      // Process each resource
      for (const resource of resources) {
        if (!resource.resourceMethods) continue;

        // Process each HTTP method for this resource
        for (const [httpMethod, methodInfo] of Object.entries(resource.resourceMethods)) {
          if (httpMethod === 'OPTIONS') continue; // Skip OPTIONS methods
          
          try {
            // Get detailed method information including authorizer
            const methodCommand = new GetMethodCommand({
              restApiId: apiGatewayId,
              resourceId: resource.id!,
              httpMethod: httpMethod
            });
            
            const methodResponse = await this.client.send(methodCommand);
            
            // Determine authorizer information
            let authorizerType = 'NONE';
            let authorizerName = undefined;
            let authorizerArn = undefined;
            let authorizerId = undefined;

            if (methodResponse.authorizationType === 'CUSTOM') {
              authorizerType = 'CUSTOM';
              authorizerId = methodResponse.authorizerId;
              
              // Find the authorizer details
              const authorizer = authorizers.find(auth => auth.id === authorizerId);
              if (authorizer) {
                authorizerName = authorizer.name;
                authorizerArn = authorizer.authorizerUri;
              }
            } else if (methodResponse.authorizationType === 'AWS_IAM') {
              authorizerType = 'AWS_IAM';
            } else if (methodResponse.authorizationType === 'COGNITO_USER_POOLS') {
              authorizerType = 'COGNITO_USER_POOLS';
            }

            // Build the full endpoint URL
            const basePath = basePathMappings.length > 0 ? basePathMappings[0].basePath : apiGatewayName.toLowerCase();
            const fullEndpoint = `https://${this.domainName}/${basePath}${resource.pathPart === '/' ? '' : resource.pathPart}`;

            const endpointInfo: EndpointInfo = {
              apiGatewayId,
              apiGatewayName,
              basePath: basePath || '',
              httpMethod,
              resourcePath: resource.pathPart || '/',
              fullEndpoint,
              authorizerType,
              authorizerName,
              authorizerArn,
              authorizerId
            };

            endpoints.push(endpointInfo);
          } catch (methodError) {
            console.log(`    ⚠️  Error getting method details for ${httpMethod} ${resource.pathPart}:`, methodError);
          }
        }
      }
    } catch (error) {
      console.error(`  ❌ Error getting resources for API Gateway ${apiGatewayId}:`, error);
    }

    return endpoints;
  }

  generateReport(results: AuditResults): string {
    let report = "API Gateway Authorization Audit Report\n";
    report += "=====================================\n\n";
    
    report += `Generated on: ${new Date().toISOString()}\n`;
    report += `Total API Gateways: ${results.totalApiGateways}\n`;
    report += `Total Endpoints: ${results.totalEndpoints}\n`;
    report += `Endpoints with Custom Authorizers: ${results.endpointsWithCustomAuthorizers}\n`;
    report += `Endpoints without Authorizers: ${results.endpointsWithoutAuthorizers}\n\n`;

    // Group by authorization type
    const byAuthType = results.endpoints.reduce((acc, endpoint) => {
      if (!acc[endpoint.authorizerType]) {
        acc[endpoint.authorizerType] = [];
      }
      acc[endpoint.authorizerType].push(endpoint);
      return acc;
    }, {} as Record<string, EndpointInfo[]>);

    for (const [authType, endpoints] of Object.entries(byAuthType)) {
      report += `\n${authType} ENDPOINTS (${endpoints.length})\n`;
      report += "=".repeat(authType.length + 20) + "\n";
      
      endpoints.forEach(endpoint => {
        report += `${endpoint.httpMethod.padEnd(6)} ${endpoint.fullEndpoint}\n`;
        report += `       API Gateway: ${endpoint.apiGatewayName} (${endpoint.apiGatewayId})\n`;
        if (endpoint.authorizerName) {
          report += `       Authorizer: ${endpoint.authorizerName} (${endpoint.authorizerId})\n`;
        }
        if (endpoint.authorizerArn) {
          report += `       Authorizer ARN: ${endpoint.authorizerArn}\n`;
        }
        report += "\n";
      });
    }

    // Potential security gaps section
    report += "\nPOTENTIAL SECURITY GAPS\n";
    report += "======================\n";
    
    const unprotectedEndpoints = results.endpoints.filter(e => e.authorizerType === 'NONE');
    if (unprotectedEndpoints.length > 0) {
      report += `\n⚠️  Found ${unprotectedEndpoints.length} endpoints without authorization:\n\n`;
      unprotectedEndpoints.forEach(endpoint => {
        report += `- ${endpoint.httpMethod} ${endpoint.fullEndpoint}\n`;
      });
    } else {
      report += "\n✅ All endpoints have some form of authorization configured.\n";
    }

    return report;
  }

  async saveReport(results: AuditResults, filename: string = 'api-gateway-audit-report.txt') {
    const report = this.generateReport(results);
    writeFileSync(filename, report, 'utf8');
    console.log(`📄 Report saved to ${filename}`);
    
    // Also save raw JSON data
    const jsonFilename = filename.replace('.txt', '.json');
    writeFileSync(jsonFilename, JSON.stringify(results, null, 2), 'utf8');
    console.log(`📊 Raw data saved to ${jsonFilename}`);
  }
}

// Main execution
async function main() {
  try {
    console.log("🚀 Starting API Gateway Authorization Audit");
    console.log("============================================\n");

    // You can customize the domain name here
    const auditor = new APIGatewayAuditor("myapi.com");
    
    const results = await auditor.auditAllApiGateways();
    await auditor.saveReport(results);
    
    console.log("\n✨ Audit completed successfully!");
    console.log("Check the generated report files for detailed results.");
    
  } catch (error) {
    console.error("💥 Audit failed:", error);
    process.exit(1);
  }
}

// Run the audit
main().catch(console.error);