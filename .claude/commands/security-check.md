Run security review on changed files

Use the security-reviewer agent to review all changed files for security issues.

Steps:
1. Get the list of changed files with `git diff --name-only HEAD~1 HEAD` (or staged files with `git diff --name-only --cached`)
2. For each changed TypeScript/JavaScript file, invoke the security-reviewer agent
3. Report any security issues found
4. Exit with error if critical issues are found