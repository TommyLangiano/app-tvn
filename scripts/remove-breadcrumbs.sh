#!/bin/bash

# Script per rimuovere breadcrumb da tutti i file

FILES=$(find /Users/tommylangiano/Desktop/app.tvn.com/apps/web/app -name "*.tsx" -type f | grep -v ".bak" | grep -v "backup")

for file in $FILES; do
  # Check if file contains Breadcrumb
  if grep -q "Breadcrumb" "$file"; then
    echo "Cleaning: $file"

    # Remove import statement
    sed -i '' '/import.*Breadcrumb/d' "$file"

    # Remove <Breadcrumb /> component usage (with optional props)
    sed -i '' '/<Breadcrumb[^>]*\/>/d' "$file"

    # Remove multi-line Breadcrumb component
    sed -i '' '/<Breadcrumb$/,/\/>$/d' "$file"

    echo "  ✅ Done"
  fi
done

echo ""
echo "✅ All breadcrumbs removed!"
