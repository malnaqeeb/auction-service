import {
  APIGatewayClient,
  GetRestApisCommand,
  GetBasePathMappingsCommand,
  GetResourcesCommand,
  GetMethodCommand,
  RestApi,
  BasePathMapping,
  Resource,
  Method,
} from '@aws-sdk/client-api-gateway';
import { writeFileSync } from 'fs';

interface EndpointAudit {
  apiGatewayId: string;
  apiGatewayName: string;
  basePath: string;
  domainName: string;
  endpoint: string;
  httpMethod: string;
  authorizationType: string;
  authorizerArn?: string;
  authorizerId?: string;
}

interface AuditResults {
  totalApiGateways: number;
  totalEndpoints: number;
  endpointsByAuthorizer: Record<string, EndpointAudit[]>;
  unauthorizedEndpoints: EndpointAudit[];
  allEndpoints: EndpointAudit[];
}

class APIGatewayAuditor {
  private client: APIGatewayClient;

  constructor() {
    this.client = new APIGatewayClient({});
    console.log('🚀 API Gateway Auditor initialized');
  }

  async getAllApiGateways(): Promise<RestApi[]> {
    console.log('📋 Retrieving all API Gateways...');
    
    try {
      const command = new GetRestApisCommand({});
      const response = await this.client.send(command);
      
      const apiGateways = response.items || [];
      console.log(`✅ Found ${apiGateways.length} API Gateways`);
      
      apiGateways.forEach(api => {
        console.log(`  - ${api.name} (ID: ${api.id})`);
      });
      
      return apiGateways;
    } catch (error) {
      console.error('❌ Error retrieving API Gateways:', error);
      throw error;
    }
  }

  async getBasePathMappings(domainName: string): Promise<BasePathMapping[]> {
    console.log(`🔍 Getting base path mappings for domain: ${domainName}`);
    
    try {
      const command = new GetBasePathMappingsCommand({ domainName });
      const response = await this.client.send(command);
      
      const mappings = response.items || [];
      console.log(`  Found ${mappings.length} base path mappings for ${domainName}`);
      
      return mappings;
    } catch (error) {
      console.log(`  ⚠️  No base path mappings found for ${domainName} or error occurred:`, error.message);
      return [];
    }
  }

  async getApiResources(apiId: string): Promise<Resource[]> {
    console.log(`📂 Getting resources for API Gateway: ${apiId}`);
    
    try {
      const command = new GetResourcesCommand({ restApiId: apiId });
      const response = await this.client.send(command);
      
      const resources = response.items || [];
      console.log(`  Found ${resources.length} resources for API ${apiId}`);
      
      return resources;
    } catch (error) {
      console.error(`❌ Error getting resources for API ${apiId}:`, error);
      return [];
    }
  }

  async getMethodDetails(apiId: string, resourceId: string, httpMethod: string): Promise<Method | null> {
    try {
      const command = new GetMethodCommand({
        restApiId: apiId,
        resourceId,
        httpMethod,
      });
      
      const response = await this.client.send(command);
      return response;
    } catch (error) {
      console.log(`  ⚠️  Could not get method details for ${httpMethod} on resource ${resourceId}:`, error.message);
      return null;
    }
  }

  async auditApiGateway(apiGateway: RestApi, basePath: string = '', domainName: string = 'unknown'): Promise<EndpointAudit[]> {
    console.log(`\n🔍 Auditing API Gateway: ${apiGateway.name} (${apiGateway.id})`);
    
    const endpoints: EndpointAudit[] = [];
    const resources = await this.getApiResources(apiGateway.id!);
    
    for (const resource of resources) {
      if (resource.resourceMethods) {
        console.log(`  📍 Resource: ${resource.pathPart || '/'} (${resource.id})`);
        
        for (const httpMethod of Object.keys(resource.resourceMethods)) {
          if (httpMethod === 'OPTIONS') continue; // Skip OPTIONS methods
          
          console.log(`    🔗 Method: ${httpMethod}`);
          
          const methodDetails = await this.getMethodDetails(apiGateway.id!, resource.id!, httpMethod);
          
          if (methodDetails) {
            const endpoint: EndpointAudit = {
              apiGatewayId: apiGateway.id!,
              apiGatewayName: apiGateway.name || 'Unknown',
              basePath,
              domainName,
              endpoint: `${domainName}${basePath}${resource.pathPart || ''}`,
              httpMethod,
              authorizationType: methodDetails.authorizationType || 'NONE',
              authorizerArn: methodDetails.authorizerId ? `arn:aws:apigateway:${process.env.AWS_REGION || 'us-east-1'}:lambda:path/2015-03-31/functions/${methodDetails.authorizerId}` : undefined,
              authorizerId: methodDetails.authorizerId,
            };
            
            console.log(`      🔐 Authorization: ${endpoint.authorizationType}${endpoint.authorizerId ? ` (ID: ${endpoint.authorizerId})` : ''}`);
            endpoints.push(endpoint);
          }
        }
      }
    }
    
    return endpoints;
  }

  async performFullAudit(): Promise<AuditResults> {
    console.log('\n🎯 Starting comprehensive API Gateway audit...\n');
    
    const allEndpoints: EndpointAudit[] = [];
    const apiGateways = await this.getAllApiGateways();
    
    // For each API Gateway, we'll audit it directly since we may not have domain mappings
    for (const apiGateway of apiGateways) {
      const endpoints = await this.auditApiGateway(apiGateway);
      allEndpoints.push(...endpoints);
    }
    
    // Group endpoints by authorizer
    const endpointsByAuthorizer: Record<string, EndpointAudit[]> = {};
    const unauthorizedEndpoints: EndpointAudit[] = [];
    
    for (const endpoint of allEndpoints) {
      if (endpoint.authorizationType === 'NONE' || !endpoint.authorizerId) {
        unauthorizedEndpoints.push(endpoint);
      } else {
        const key = endpoint.authorizerId || endpoint.authorizationType;
        if (!endpointsByAuthorizer[key]) {
          endpointsByAuthorizer[key] = [];
        }
        endpointsByAuthorizer[key].push(endpoint);
      }
    }
    
    return {
      totalApiGateways: apiGateways.length,
      totalEndpoints: allEndpoints.length,
      endpointsByAuthorizer,
      unauthorizedEndpoints,
      allEndpoints,
    };
  }

  generateReport(results: AuditResults): string {
    const lines: string[] = [];
    
    lines.push('='.repeat(80));
    lines.push('API GATEWAY AUTHORIZATION AUDIT REPORT');
    lines.push('='.repeat(80));
    lines.push(`Generated: ${new Date().toISOString()}`);
    lines.push(`Total API Gateways: ${results.totalApiGateways}`);
    lines.push(`Total Endpoints: ${results.totalEndpoints}`);
    lines.push('');
    
    // Summary by authorization type
    lines.push('AUTHORIZATION SUMMARY:');
    lines.push('-'.repeat(40));
    
    const authorizerKeys = Object.keys(results.endpointsByAuthorizer);
    if (authorizerKeys.length > 0) {
      authorizerKeys.forEach(authorizerId => {
        const count = results.endpointsByAuthorizer[authorizerId].length;
        lines.push(`${authorizerId}: ${count} endpoints`);
      });
    }
    
    if (results.unauthorizedEndpoints.length > 0) {
      lines.push(`NONE/Unauthorized: ${results.unauthorizedEndpoints.length} endpoints`);
    }
    lines.push('');
    
    // Detailed endpoint listing
    lines.push('DETAILED ENDPOINT LISTING:');
    lines.push('-'.repeat(40));
    
    results.allEndpoints.forEach(endpoint => {
      lines.push(`${endpoint.httpMethod.padEnd(6)} ${endpoint.endpoint}`);
      lines.push(`       API: ${endpoint.apiGatewayName} (${endpoint.apiGatewayId})`);
      lines.push(`       Auth: ${endpoint.authorizationType}${endpoint.authorizerId ? ` (${endpoint.authorizerId})` : ''}`);
      if (endpoint.authorizerArn) {
        lines.push(`       ARN: ${endpoint.authorizerArn}`);
      }
      lines.push('');
    });
    
    // Unauthorized endpoints section
    if (results.unauthorizedEndpoints.length > 0) {
      lines.push('⚠️  UNAUTHORIZED ENDPOINTS (POTENTIAL SECURITY GAPS):');
      lines.push('-'.repeat(60));
      
      results.unauthorizedEndpoints.forEach(endpoint => {
        lines.push(`❌ ${endpoint.httpMethod} ${endpoint.endpoint}`);
        lines.push(`   API: ${endpoint.apiGatewayName} (${endpoint.apiGatewayId})`);
        lines.push('');
      });
    }
    
    // Endpoints by authorizer
    lines.push('ENDPOINTS BY AUTHORIZER:');
    lines.push('-'.repeat(40));
    
    Object.entries(results.endpointsByAuthorizer).forEach(([authorizerId, endpoints]) => {
      lines.push(`\n🔐 Authorizer: ${authorizerId}`);
      lines.push(`   Endpoints (${endpoints.length}):`);
      
      endpoints.forEach(endpoint => {
        lines.push(`   ✅ ${endpoint.httpMethod} ${endpoint.endpoint}`);
        lines.push(`      API: ${endpoint.apiGatewayName}`);
      });
    });
    
    return lines.join('\n');
  }

  async saveReport(report: string, filename: string = 'api-gateway-audit-report.txt'): Promise<void> {
    try {
      writeFileSync(filename, report, 'utf8');
      console.log(`\n📄 Report saved to: ${filename}`);
    } catch (error) {
      console.error('❌ Error saving report:', error);
      throw error;
    }
  }
}

// Main execution
async function main() {
  console.log('🔍 API Gateway Authorization Audit Tool');
  console.log('========================================\n');
  
  try {
    const auditor = new APIGatewayAuditor();
    
    // Perform the audit
    const results = await auditor.performFullAudit();
    
    // Generate and save the report
    const report = auditor.generateReport(results);
    await auditor.saveReport(report);
    
    // Print summary to console
    console.log('\n📊 AUDIT SUMMARY:');
    console.log(`   API Gateways: ${results.totalApiGateways}`);
    console.log(`   Total Endpoints: ${results.totalEndpoints}`);
    console.log(`   Unauthorized Endpoints: ${results.unauthorizedEndpoints.length}`);
    console.log(`   Unique Authorizers: ${Object.keys(results.endpointsByAuthorizer).length}`);
    
    if (results.unauthorizedEndpoints.length > 0) {
      console.log('\n⚠️  WARNING: Found unauthorized endpoints that may pose security risks!');
      console.log('   Check the report file for details.');
    } else {
      console.log('\n✅ All endpoints have authorization configured.');
    }
    
    console.log('\n🎉 Audit completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Audit failed:', error);
    process.exit(1);
  }
}

// Run the main function
if (require.main === module) {
  main();
}