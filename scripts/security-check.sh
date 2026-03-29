#!/bin/bash
set -e

echo "Running security checks..."

FILES=$(find . -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) \
  -not -path "*/node_modules/*" \
  -not -path "*/.pnpm/*" \
  -not -path "./.output/*" \
  -not -path "./.wxt/*" \
  -not -path "./.cache/*" \
  2>/dev/null | head -100)

if [ -z "$FILES" ]; then
  echo "No source files found"
  exit 0
fi

ERRORS=0
WARNINGS=0

echo ""
echo "=== Checking for hardcoded secrets ==="
for FILE in $FILES; do
  if grep -qEi "(password|api_key|secret|token)\s*=\s*['\"][^'\"]{20,}['\"]" "$FILE" 2>/dev/null; then
    echo "ERROR: Potential hardcoded secret in $FILE"
    grep -nEi "(password|api_key|secret|token)\s*=\s*['\"][^'\"]{20,}['\"]" "$FILE" | head -3
    ERRORS=$((ERRORS + 1))
  fi
done

echo ""
echo "=== Checking for dangerous eval/Function ==="
for FILE in $FILES; do
  if grep -qE "(eval|new Function)\s*\(" "$FILE" 2>/dev/null; then
    echo "ERROR: Dangerous eval/Function in $FILE"
    grep -nE "(eval|new Function)\s*\(" "$FILE" | head -3
    ERRORS=$((ERRORS + 1))
  fi
done

echo ""
echo "=== Checking for buffer overflow patterns ==="
for FILE in $FILES; do
  if grep -qE "String\.fromCharCode\s*\(\s*\.\.\." "$FILE" 2>/dev/null; then
    echo "ERROR: Potential buffer overflow in $FILE"
    grep -nE "String\.fromCharCode\s*\(\s*\.\.\." "$FILE" | head -3
    ERRORS=$((ERRORS + 1))
  fi
done

echo ""
echo "=== Checking for password logging ==="
for FILE in $FILES; do
  if [[ "$FILE" == *"test"* ]] || [[ "$FILE" == *"spec"* ]] || [[ "$FILE" == *"mock"* ]]; then
    continue
  fi
  if grep -qE "console\.(log|error|warn)\s*\([^)]*password" "$FILE" 2>/dev/null; then
    echo "ERROR: Password logging in $FILE"
    grep -nE "console\.(log|error|warn)\s*\([^)]*password" "$FILE" | head -3
    ERRORS=$((ERRORS + 1))
  fi
done

echo ""
echo "=== Checking for sensitive data in localStorage ==="
for FILE in $FILES; do
  if grep -qE "localStorage\.setItem\s*\([^)]*(password|secret|key|token)" "$FILE" 2>/dev/null; then
    echo "ERROR: Sensitive data in localStorage in $FILE"
    grep -nE "localStorage\.setItem\s*\([^)]*(password|secret|key|token)" "$FILE" | head -3
    ERRORS=$((ERRORS + 1))
  fi
done

echo ""
echo "=== Checking for plaintext passwords in session storage ==="
for FILE in $FILES; do
  if grep -qE "chrome\.storage\.session\.set" "$FILE" 2>/dev/null; then
    if grep -A5 "chrome\.storage\.session\.set" "$FILE" 2>/dev/null | grep -qE "(password|secret|key)\s*:"; then
      echo "WARNING: Potential sensitive data in session storage in $FILE"
      grep -nE "(password|secret|key)" "$FILE" | head -3
      WARNINGS=$((WARNINGS + 1))
    fi
  fi
done

echo ""
echo "=== Checking for subdomain spoofing in URL matching ==="
for FILE in $FILES; do
  if grep -qE "\.endsWith\s*\(\s*[a-zA-Z_]" "$FILE" 2>/dev/null; then
    if ! grep -E "\.endsWith\s*\(\s*['\"]\." "$FILE" 2>/dev/null | grep -q "endsWith"; then
      echo "WARNING: Potential subdomain spoofing in $FILE"
      grep -nE "\.endsWith\s*\(\s*[a-zA-Z_]" "$FILE" | head -3
      WARNINGS=$((WARNINGS + 1))
    fi
  fi
done

echo ""
echo "=== Running TypeScript compilation check ==="
if command -v pnpm &> /dev/null; then
  if pnpm compile 2>&1 | grep -qE "error TS[0-9]+"; then
    echo "ERROR: TypeScript compilation failed"
    pnpm compile 2>&1 | grep -E "error TS[0-9]+" | head -10
    ERRORS=$((ERRORS + 1))
  else
    echo "TypeScript compilation: OK"
  fi
fi

echo ""
echo "========================================"
echo "Security check complete."
echo "Errors: $ERRORS"
echo "Warnings: $WARNINGS"
echo ""

if [ $ERRORS -gt 0 ]; then
  echo "FAILED: Found $ERRORS critical security issue(s)"
  exit 1
fi

if [ $WARNINGS -gt 0 ]; then
  echo "PASSED with $WARNINGS warning(s)"
else
  echo "PASSED: No security issues found"
fi

exit 0