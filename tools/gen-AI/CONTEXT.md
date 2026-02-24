# CONTEXT

## Usage Instructions

When referencing this context:
1. Always read the **General Statement** first
2. Then consult the specific **Topic** relevant to your task
3. Align all work with the three core principles: Simplicity, Compatibility, Automation

## General Statement

This is an AWS CDK construct library that provides a serverless reverse proxy using CloudFront and Lambda. The project embodies three core principles:

**Simplicity** - Clean architecture with minimal components: CloudFront for edge delivery, Lambda for proxying, no load balancer required. Clear API with minimal required props.

**Compatibility** - Standards-based CDK construct following AWS best practices. Peer dependencies on aws-cdk-lib and constructs for maximum compatibility. TypeScript with strict mode for type safety.

**Automation** - CI/CD pipeline via GitHub Actions for publishing to GitHub Packages. TypeScript compilation with declaration maps and source maps. Automated testing with Jest.

**Open-source and collaboration** - MIT licensed, community contributions welcome

### Project Purpose

Provide a reusable CDK construct for creating serverless reverse proxies to private origins (ECS containers, EC2 instances) without requiring Application Load Balancers. Simplify the architecture while maintaining security through CloudFront Origin Access Control.

### Architecture Philosophy

- Serverless-first - no infrastructure to manage
- Security by default - OAC, WAF, Shield Standard included
- Cost-effective - eliminate ALB costs for simple proxy scenarios
- VPC-aware - Lambda runs in VPC to access private resources
- Production-ready - proper error handling and monitoring hooks

### Technical Stack

- **Framework**: AWS CDK (Cloud Development Kit)
- **Language**: TypeScript with strict mode
- **Runtime**: Node.js Lambda for proxy handler
- **Testing**: Jest with ts-jest
- **Linting**: ESLint with TypeScript plugin
- **Publishing**: GitHub Packages via GitHub Actions

### Project Structure

- `src/` - CDK construct source code
- `lambda/proxy/` - Lambda handler runtime code
- `lib/` - Compiled TypeScript output
- `test/` - Jest test files
- `.github/` - Issue templates and CI/CD workflows

### Quality Standards

- TypeScript strict mode enabled
- Peer dependencies for CDK compatibility
- Proper package.json `files` field to minimize package size
- `.npmignore` for explicit package content control
- Comprehensive JSDoc comments on public APIs

---

## Topic Index

### 1. Keeping a Changelog

**File Location**: `/CHANGELOG.md` (repository root)

**Version Format**: `YYYY.MM.DD.HH.MM`

**Workflow**:
1. User requests changelog update
2. Check git history for changes (user may specify date range)
3. Generate entry summarizing meaningful changes
4. Add new entry to CHANGELOG.md

**Purpose**: Informal track record of meaningful changes, not formal software releases

**When generating entries**:
- Review git commits since last entry or specified date
- Summarize changes in clear, concise language
- Focus on meaningful updates (features, fixes, content additions)
- Skip trivial commits (typos, formatting-only changes)
- Use present tense, imperative mood ("Add feature" not "Added feature")
- Group related changes together
- Order is chronological, with newer entries at top.

