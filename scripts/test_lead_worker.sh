#!/bin/bash
# Test script for lead/worker provider functionality

# Set up test environment variables
export MTS_PROVIDER="openai"
export MTS_MODEL="gpt-4o-mini"
export OPENAI_API_KEY="test-key"

# Test 1: Default behavior (no lead/worker)
echo "Test 1: Default behavior (no lead/worker)"
unset MTS_LEAD_MODEL
unset MTS_WORKER_MODEL
unset MTS_LEAD_TURNS

# Test 2: Lead/worker with same provider
echo -e "\nTest 2: Lead/worker with same provider"
export MTS_LEAD_MODEL="gpt-4o"
export MTS_WORKER_MODEL="gpt-4o-mini"
export MTS_LEAD_TURNS="3"

# Test 3: Lead/worker with default worker (uses main model)
echo -e "\nTest 3: Lead/worker with default worker"
export MTS_LEAD_MODEL="gpt-4o"
unset MTS_WORKER_MODEL
export MTS_LEAD_TURNS="5"

echo -e "\nConfiguration examples:"
echo "- Default: Uses MTS_MODEL for all turns"
echo "- Lead/Worker: Set MTS_LEAD_MODEL to use a different model for initial turns"
echo "- MTS_LEAD_TURNS: Number of turns to use lead model (default: 5)"
echo "- MTS_WORKER_MODEL: Model to use after lead turns (default: MTS_MODEL)"