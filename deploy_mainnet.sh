#!/bin/bash

# EchoLedger ICP Mainnet Deployment Script
# WCHL 2025 Competition Entry

set -e

echo "🚀 Starting EchoLedger deployment to ICP Mainnet..."

# Check if dfx is installed
if ! command -v dfx &> /dev/null; then
    echo "❌ dfx CLI not installed. Please install dfx first:"
    echo "sh -ci \"\$(curl -fsSL https://internetcomputer.org/install.sh)\""
    exit 1
fi

# Check if we have an identity
if ! dfx identity whoami &> /dev/null; then
    echo "❌ No dfx identity found. Please create one:"
    echo "dfx identity new default"
    exit 1
fi

# Check wallet balance (need cycles for deployment)
echo "📊 Checking wallet balance..."
dfx wallet balance --network ic

# Start local replica for testing (optional)
read -p "🤔 Start local replica for testing first? (y/n): " test_local
if [[ $test_local == "y" ]]; then
    echo "🏃 Starting local replica..."
    dfx start --clean --background
    
    echo "📦 Deploying to local network for testing..."
    dfx deploy --network local
    
    echo "✅ Local deployment complete. Testing canisters..."
    dfx canister call directive_manager get_system_info --network local
    
    echo "🛑 Stopping local replica..."
    dfx stop
fi

# Deploy to mainnet
echo "🌐 Deploying to ICP Mainnet..."
echo "⚠️  This will consume cycles from your wallet!"
read -p "Continue with mainnet deployment? (y/n): " confirm

if [[ $confirm != "y" ]]; then
    echo "❌ Deployment cancelled"
    exit 1
fi

echo "🔨 Building all canisters..."
dfx build --network ic

echo "📦 Deploying to IC mainnet..."
dfx deploy --network ic

echo "📋 Getting canister IDs..."
EMERGENCY_BRIDGE_ID=$(dfx canister id emergency_bridge --network ic)
DIRECTIVE_MANAGER_ID=$(dfx canister id directive_manager --network ic) 
EXECUTOR_AI_ID=$(dfx canister id executor_ai --network ic)
FRONTEND_ID=$(dfx canister id frontend --network ic)
LLM_CANISTER_ID=$(dfx canister id llm_canister --network ic)

echo "✅ Deployment Complete!"
echo ""
echo "🎉 EchoLedger Live on ICP Mainnet:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚨 Emergency Bridge:    https://${EMERGENCY_BRIDGE_ID}.icp0.io"
echo "📋 Directive Manager:   https://${DIRECTIVE_MANAGER_ID}.icp0.io" 
echo "🤖 Executor AI:         https://${EXECUTOR_AI_ID}.icp0.io"
echo "🧠 LLM Canister:        https://${LLM_CANISTER_ID}.icp0.io"
echo "🌐 Frontend dApp:       https://${FRONTEND_ID}.icp0.io"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Update README with live URLs
echo "📝 Updating README with live canister IDs..."
cat > DEPLOYMENT_INFO.md << EOF
# EchoLedger Live Deployment Information

## WCHL 2025 Competition - ICP Mainnet Deployment

**Deployment Date:** $(date)
**Network:** Internet Computer Mainnet

### Live Canister IDs:
- **Emergency Bridge:** \`${EMERGENCY_BRIDGE_ID}\`
- **Directive Manager:** \`${DIRECTIVE_MANAGER_ID}\`
- **Executor AI:** \`${EXECUTOR_AI_ID}\`
- **LLM Canister:** \`${LLM_CANISTER_ID}\`
- **Frontend:** \`${FRONTEND_ID}\`

### Live URLs:
- **Main dApp:** https://${FRONTEND_ID}.icp0.io
- **Emergency API:** https://${EMERGENCY_BRIDGE_ID}.icp0.io
- **Directive API:** https://${DIRECTIVE_MANAGER_ID}.icp0.io

### Testing the Deployment:

\`\`\`bash
# Test emergency directive check
dfx canister call emergency_bridge emergency_check '(record {
  patient_id = "test_patient_001";
  hospital_id = "ER_001";
  situation = "cardiac_arrest";
  vitals = opt "BP: 80/50, Pulse: 120";
  access_token = opt "test_token"
})' --network ic

# Test directive processing
dfx canister call directive_manager process_directive_nlp '(record {
  patient_id = "test_patient_001";
  patient_name = "John Doe";
  directive_text = "I do not want resuscitation if I have less than 5% chance of recovery. Donate my kidneys."
})' --network ic

# Test AI processing
dfx canister call llm_canister process_medical_directive '("test_patient_001", "I do not want to be resuscitated. Donate my organs.")' --network ic
\`\`\`

### Monitoring:
\`\`\`bash
# Check canister status
dfx canister status emergency_bridge --network ic
dfx canister status directive_manager --network ic
dfx canister status executor_ai --network ic
dfx canister status llm_canister --network ic
dfx canister status frontend --network ic
\`\`\`

EOF

echo "📄 Deployment information saved to DEPLOYMENT_INFO.md"

# Test basic functionality
echo "🧪 Testing basic functionality..."
echo "Testing directive manager..."
dfx canister call directive_manager get_system_info --network ic

echo ""
echo "🎊 EchoLedger Successfully Deployed to ICP Mainnet!"
echo "🏆 Ready for WCHL 2025 Competition Judging"
echo ""
echo "Next steps:"
echo "1. Update README.md with the canister IDs above"
echo "2. Test all functionality using the commands in DEPLOYMENT_INFO.md"
echo "3. Submit to WCHL 2025 competition with live URLs"
echo ""
echo "📺 Create your demo video showing the live dApp!"