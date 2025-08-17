#!/bin/bash

# Fix all incorrect auth imports
files=(
  "/home/cjmorin/Downloads/Coding/coliving-da-nang/lib/storage/access-control.ts"
  "/home/cjmorin/Downloads/Coding/coliving-da-nang/lib/auth/session-security.ts"
  "/home/cjmorin/Downloads/Coding/coliving-da-nang/app/admin/users/page.tsx"
  "/home/cjmorin/Downloads/Coding/coliving-da-nang/app/admin/users/[id]/page.tsx"
  "/home/cjmorin/Downloads/Coding/coliving-da-nang/app/admin/page.tsx"
  "/home/cjmorin/Downloads/Coding/coliving-da-nang/app/admin/properties/settings/page.tsx"
  "/home/cjmorin/Downloads/Coding/coliving-da-nang/app/admin/system/backup/page.tsx"
  "/home/cjmorin/Downloads/Coding/coliving-da-nang/app/admin/system/monitoring/page.tsx"
  "/home/cjmorin/Downloads/Coding/coliving-da-nang/app/api/communications/templates/route.ts"
  "/home/cjmorin/Downloads/Coding/coliving-da-nang/app/api/communications/templates/[id]/route.ts"
  "/home/cjmorin/Downloads/Coding/coliving-da-nang/app/api/communications/templates/categories/route.ts"
  "/home/cjmorin/Downloads/Coding/coliving-da-nang/app/api/communications/route.ts"
  "/home/cjmorin/Downloads/Coding/coliving-da-nang/app/api/communications/[id]/route.ts"
  "/home/cjmorin/Downloads/Coding/coliving-da-nang/app/api/communications/[id]/escalate/route.ts"
  "/home/cjmorin/Downloads/Coding/coliving-da-nang/app/api/agreements/templates/[id]/clone/route.ts"
  "/home/cjmorin/Downloads/Coding/coliving-da-nang/app/api/agreements/templates/[id]/preview/route.ts"
  "/home/cjmorin/Downloads/Coding/coliving-da-nang/app/api/agreements/send/route.ts"
  "/home/cjmorin/Downloads/Coding/coliving-da-nang/app/api/payments/batch/route.ts"
  "/home/cjmorin/Downloads/Coding/coliving-da-nang/app/api/payments/bulk-reminders/route.ts"
  "/home/cjmorin/Downloads/Coding/coliving-da-nang/app/api/payments/route.ts"
  "/home/cjmorin/Downloads/Coding/coliving-da-nang/app/api/payments/[id]/route.ts"
  "/home/cjmorin/Downloads/Coding/coliving-da-nang/app/api/payments/[id]/refund/route.ts"
  "/home/cjmorin/Downloads/Coding/coliving-da-nang/app/api/reports/financial/route.ts"
)

for file in "${files[@]}"; do
  echo "Fixing: $file"
  sed -i "s|import { authOptions } from '@/lib/auth'|import { authOptions } from '@/lib/auth-config'|g" "$file"
done

echo "All auth imports fixed!"
