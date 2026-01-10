#!/bin/bash

echo "🚀 Starting Bloomverd SMS Observability Stack..."
echo ""

# Start monitoring stack
echo "📊 Starting Prometheus, Grafana, Loki, and Promtail..."
docker-compose -f docker-compose.monitoring.yml up -d

echo ""
echo "⏳ Waiting for services to be ready..."
sleep 5

# Check Prometheus
echo -n "Checking Prometheus... "
if curl -s http://localhost:9090/-/healthy > /dev/null 2>&1; then
    echo "✅ Ready"
else
    echo "❌ Not responding"
fi

# Check Loki
echo -n "Checking Loki... "
if curl -s http://localhost:3100/ready > /dev/null 2>&1; then
    echo "✅ Ready"
else
    echo "❌ Not responding"
fi

# Check Grafana
echo -n "Checking Grafana... "
if curl -s http://localhost:3001/api/health > /dev/null 2>&1; then
    echo "✅ Ready"
else
    echo "❌ Not responding (may take a few more seconds)"
fi

echo ""
echo "📍 Services Available:"
echo "   Grafana:    http://localhost:3001 (admin/admin)"
echo "   Prometheus: http://localhost:9090"
echo "   Loki:       http://localhost:3100 (API only)"
echo ""
echo "📊 Dashboards:"
echo "   • Bloomverd SMS - API Monitoring (metrics)"
echo "   • Bloomverd SMS - Logs (logs)"
echo ""
echo "💡 Next steps:"
echo "   1. Start your app: npm run start:dev"
echo "   2. Generate test data: ./scripts/generate-test-traffic.sh"
echo "   3. Open Grafana and explore dashboards"
echo ""
echo "📚 Documentation: See OBSERVABILITY.md"
echo ""
echo "✨ Happy monitoring!"
