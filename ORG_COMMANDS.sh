#!/bin/bash
# Quick command reference for organization migration

echo "════════════════════════════════════════════════════════════════"
echo "  CIVIC-AI-AUDITS ORGANIZATION - COMMAND REFERENCE"
echo "════════════════════════════════════════════════════════════════"
echo

# Commands ready to copy/paste

echo "1. CREATE ORG (web interface):"
echo "   https://github.com/organizations/plan"
echo

echo "2. TRANSFER REPO (after org created):"
echo
cat << 'CMD'
gh api -X POST /repos/jonasneves/durham-transport-safety-audit/transfer \
  -f new_owner='civic-ai-audits' \
  -f new_name='durham-transport'
CMD
echo
echo "   OR use web: https://github.com/jonasneves/durham-transport-safety-audit/settings"
echo

echo "3. RUN MIGRATION SCRIPT:"
echo "   ./scripts/migrate_to_org.sh"
echo

echo "4. ENABLE PAGES (after transfer):"
echo
cat << 'CMD'
cat > /tmp/pages_config.json << 'EOF'
{"build_type": "workflow"}
EOF

gh api --method POST \
  /repos/civic-ai-audits/durham-transport/pages \
  --input /tmp/pages_config.json
CMD
echo
echo "   OR use web: https://github.com/civic-ai-audits/durham-transport/settings/pages"
echo

echo "5. ADD TOPICS:"
echo
cat << 'CMD'
gh repo edit civic-ai-audits/durham-transport \
  --add-topic ai-ethics \
  --add-topic transportation \
  --add-topic civic-tech \
  --add-topic equity \
  --add-topic data-visualization \
  --add-topic geospatial \
  --add-topic durham-nc \
  --add-topic bias-detection \
  --add-topic hackathon
CMD
echo

echo "6. VERIFY MIGRATION:"
echo "   gh repo view civic-ai-audits/durham-transport --web"
echo

echo "════════════════════════════════════════════════════════════════"
echo "New URLs after migration:"
echo "  Repo: https://github.com/civic-ai-audits/durham-transport"
echo "  Live: https://civic-ai-audits.github.io/durham-transport/"
echo "════════════════════════════════════════════════════════════════"
