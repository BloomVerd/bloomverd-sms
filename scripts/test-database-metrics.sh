#!/bin/bash

# Test database metrics collection
# This script makes GraphQL requests that trigger database queries

echo "Testing database metrics collection..."
echo ""

# Make 10 requests that will trigger database queries
for i in {1..10}; do
  echo "Request $i of 10..."

  # Example: Query that triggers SELECT
  curl -X POST http://localhost:3000/graphql \
    -H "Content-Type: application/json" \
    -d '{"query":"{ __type(name: \"Query\") { name } }"}' \
    > /dev/null 2>&1

  sleep 0.2
done

echo ""
echo "✅ Done! Check database metrics:"
echo ""
echo "1. Visit http://localhost:3000/metrics"
echo "   Look for:"
echo "   - db_queries_total"
echo "   - db_query_duration_seconds"
echo ""
echo "2. Or query in Prometheus:"
echo "   rate(db_queries_total[5m])"
echo ""
echo "3. Or view in Grafana:"
echo "   Panel 6: Database Queries Per Second"
