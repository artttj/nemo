Run security review off the zero-knowledge password manager extension Nemo.

Use the security-reviewer agent to review all files for security issues.

Steps:
1. Get the list of TypeScript/JavaScript files
2. For each TypeScript/JavaScript file, invoke the security-reviewer agent
3. Report any security issues found
4. Exit with error if critical issues are found