# Universal API Documentation Generation Prompt

## Main Instruction

Analyze the API source files located at the path provided in $ARGUMENTS and generate complete, professional technical documentation in Markdown format. The documentation should be written in a clear, detailed, and developer-friendly manner, following REST API documentation best practices.

**Input**: The path to the source files to analyze will be provided as $ARGUMENTS

## Documentation Structure

Generate documentation containing the following sections:

### 1. Table of Contents
- Automatically generated table of contents with all major sections
- Anchor links to each section

### 2. API Overview
Include:
- **Base Information**: Base URL, API version, Content-Type, authentication method
- **Key Features**: List of main API capabilities
- **Supported Languages/Localization** (if applicable)
- **Purpose and Use Cases**: Who the API is for and what problems it solves

### 3. Architecture & Design
Describe:
- **Architectural Patterns** (e.g., REST, CQRS, Event-driven)
- **Project Structure** (code organization, modules, layers)
- **Technology Stack** (framework, database, cache, etc.)
- **Core Design Principles**

### 4. Authentication & Authorization
Detail:
- **Authentication Methods** (JWT, API Key, OAuth, etc.)
- **Required Headers** with examples
- **Role and Permission System** (if exists)
- **Authorization Policies** for different endpoints
- **Token/Key Acquisition Examples**

### 5. Rate Limiting & Throttling
If implemented:
- **Rate Limiting Policies** (limits per minute/hour)
- **Different Limits for Different Endpoint Types**
- **Rate Limit Headers** in responses
- **Handling Rate Limit Violations**

### 6. API Endpoints

For EACH endpoint provide:

#### Description Format:
```markdown
### [Number]. [Operation Name]

**Description**: [Brief, clear description of what the endpoint does]

```http
[METHOD] /api/v1/[path]
Authorization: [authentication requirements]
Content-Type: [content type]
Rate Limit: [rate limit policy if specific]
```

**Path Parameters** (if any):
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | string | Yes | Unique identifier |

**Query Parameters** (if any):
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | integer | 1 | Page number |

**Headers** (if specific):
| Header | Required | Description |
|--------|----------|-------------|
| X-Request-ID | No | Request tracking ID |

**Request Body** (for POST/PUT/PATCH):
```json
{
  "field1": "value",
  "field2": 123
}
```

**Response** (200 OK):
```json
{
  "id": "123",
  "status": "success"
}
```

**Response Codes**:
- `200 OK` - Success
- `400 Bad Request` - Validation error
- `401 Unauthorized` - Not authorized
- `404 Not Found` - Resource not found

**Business Rules** (if any):
- List of important rules/constraints

**Usage Example**:
```javascript
// JavaScript/TypeScript example
const response = await fetch('...');
```
```

### 7. Data Models & Enums
- Definitions of all data models used
- Enums and constants with value descriptions
- Data types and formats (dates, UUID, etc.)

### 8. Error Handling
- **Standard Error Format** with JSON examples
- **Error Codes** and their meanings
- **HTTP Code Mapping** to error scenarios
- **Error Handling Best Practices**

### 9. Utility Endpoints
Describe endpoints:
- **Health Checks** (/health, /health/ready, /health/live)
- **API Status**
- **API Version**
- **Test Endpoints** (if available)

### 10. Integration Examples
Provide practical code examples in popular languages:

#### Examples should include:
- **Basic Authentication Flow**
- **Common Usage Scenarios**
- **Error Handling and Retry Logic**
- **Pagination and Filtering**
- **Rate Limiting Handling**
- **Examples for Different Languages** (JavaScript/TypeScript, Python, C#, Java)

### 11. Webhooks (if applicable)
- Payload formats
- Signature verification
- Retry policy
- Handling examples

### 12. WebSockets (if applicable)
- Connection and authentication
- Message format
- Event types
- Implementation examples

### 13. Best Practices
- **Performance Optimization**
- **Caching Strategies**
- **Large Dataset Pagination**
- **Timeout Handling**
- **Logging and Monitoring**
- **Operation Idempotency**

### 14. Security Considerations
- **HTTPS Requirements**
- **Security Headers**
- **CORS Policy**
- **Sensitive Data Protection**
- **Input Validation**
- **Attack Protection** (SQL Injection, XSS, CSRF)

### 15. API Versioning
- **Versioning Strategy**
- **Legacy Version Support**
- **Deprecation Process**
- **Migration Guide** (if exists)

### 16. Limits & Constraints
- **Maximum Payload Sizes**
- **Request Timeout Limits**
- **Per-Resource Constraints**
- **Quotas** (if applicable)

### 17. Environments
- **Production**: URL and specifics
- **Staging/Test**: URL and differences
- **Development**: Local environment

### 18. FAQ & Troubleshooting
- Frequently asked questions
- Common issues and solutions
- Error code interpretation

### 19. Changelog
- API change history
- Breaking changes
- New features

### 20. Support & Contact
- Support channels
- SLA (if applicable)
- Bug reporting
- Contribution guidelines (for open source)

## Formatting Guidelines

1. **Use Markdown** with appropriate heading levels
2. **Tables** for parameters and response codes
3. **Code blocks** with proper syntax highlighting
4. **JSON examples** formatted and readable
5. **HTTP examples** in format:
   ```http
   GET /api/v1/resource
   Authorization: Bearer token
   ```

6. **Internal links** to other documentation sections
7. **Bold** for important terms and names
8. **Numbered lists** for process steps
9. **Bullet points** for features and options

## Additional Guidelines

1. **Completeness**: Document EVERY public endpoint
2. **Examples**: Provide realistic examples for each endpoint
3. **Errors**: Describe all possible error codes
4. **Business Context**: Explain why and when to use each endpoint
5. **Consistency**: Maintain uniform style and terminology
6. **Currency**: Mark deprecated endpoints
7. **Practicality**: Focus on what developers need to know
8. **Readability**: Use simple, technical language
9. **Navigation**: Ensure easy document navigation
10. **Validation**: Verify all examples are correct

## Final Format

Documentation should:
- Be a self-contained, complete guide
- Enable quick API onboarding
- Serve as reference for advanced users
- Be search-friendly (Ctrl+F friendly)
- Include an index of all endpoints
- Be ready for publication (e.g., on GitHub, Confluence, or as static page)

## Usage with File Path Arguments

The source files to analyze will be provided via $ARGUMENTS variable. The AI should:
1. Read all files from the path specified in $ARGUMENTS
2. Analyze the complete codebase structure
3. Generate documentation based on the discovered API endpoints and configurations

Example usage:
```
$ARGUMENTS = "/path/to/api/source/files"
```

## Source Code Analysis Questions

When analyzing source files from $ARGUMENTS path, pay attention to:
1. What controllers/handlers are defined?
2. What data models are used?
3. What middleware is applied?
4. What validators exist?
5. What authorization roles and policies are defined?
6. What are the rate limiting configurations?
7. What dependency injection is used?
8. What external services are integrated?
9. What tests exist (may indicate use cases)?
10. What configuration files are present?

---

**NOTE**: If source code lacks information about certain aspects (e.g., rate limiting, webhooks), skip those sections or mark as "Not Implemented" / "No Information Available".