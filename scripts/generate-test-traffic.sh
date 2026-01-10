#!/bin/bash

# Generate test traffic to populate metrics
# Usage: ./scripts/generate-test-traffic.sh

echo "Generating test traffic to http://localhost:3000..."

# Make 50 requests to GraphQL endpoint
for i in {1..50}; do
  echo "Request $i of 50"

  # Example GraphQL query - adjust based on your actual schema
  curl -X POST http://localhost:3000/graphql \
    -H "Content-Type: application/json" \
    -d '{"query":"{ __schema { queryType { name } } }"}' \
    > /dev/null 2>&1

  # Small delay between requests
  sleep 0.1
done

echo ""
echo "✅ Done! Check your Grafana dashboard at http://localhost:3001"
echo "   Metrics should update within 10-15 seconds"
