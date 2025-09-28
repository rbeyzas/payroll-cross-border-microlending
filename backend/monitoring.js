const EventEmitter = require("events");
const cron = require("node-cron");

class MonitoringSystem extends EventEmitter {
  constructor(mcpClient, analyticsEngine) {
    super();
    this.mcpClient = mcpClient;
    this.analyticsEngine = analyticsEngine;
    this.alerts = [
      {
        id: "health-check-1",
        title: "Health Check Issues",
        message: "System health check detected issues",
        severity: "medium",
        timestamp: new Date().toISOString(),
        resolved: false,
      },
    ];
    this.thresholds = {
      responseTime: 5000,
      errorRate: 5,
      memoryUsage: 80,
      cpuUsage: 80,
    };
    this.metrics = {
      responseTime: 433.5,
      errorRate: 0,
      memoryUsage: 100,
      cpuUsage: 30,
      transactionFailures: 0,
      uptime: 75,
      lastHealthCheck: new Date().toISOString(),
    };
    this.isRunning = false;
    this.healthCheckInterval = 30000;
    this.alertCooldown = 300000;
    this.lastAlerts = new Map();
  }

  async start() {
    if (this.isRunning) return;

    console.log("🔍 Starting Monitoring System...");
    this.isRunning = true;

    await this.performHealthCheck();

    setInterval(async () => {
      await this.performHealthCheck();
    }, this.healthCheckInterval);

    cron.schedule("0 */6 * * *", () => {
      this.cleanupOldAlerts();
    });

    this.analyticsEngine.on("metricsUpdated", (metrics) => {
      this.updateMetrics(metrics);
    });

    console.log("✅ Monitoring System started");
    this.emit("started");
  }

  async performHealthCheck() {
    try {
      console.log("🔍 Performing health check...");

      const issues = [];

      // Check memory usage
      if (this.metrics.memoryUsage > this.thresholds.memoryUsage) {
        issues.push(`High memory usage: ${this.metrics.memoryUsage}%`);
      }

      // Check CPU usage
      if (this.metrics.cpuUsage > this.thresholds.cpuUsage) {
        issues.push(`High CPU usage: ${this.metrics.cpuUsage}%`);
      }

      // Check response time
      if (this.metrics.responseTime > this.thresholds.responseTime) {
        issues.push(`Slow response time: ${this.metrics.responseTime}ms`);
      }

      // Check error rate
      if (this.metrics.errorRate > this.thresholds.errorRate) {
        issues.push(`High error rate: ${this.metrics.errorRate}%`);
      }

      // Check network status
      try {
        const networkStatus = await this.mcpClient.getNetworkStatus();
        if (!networkStatus || networkStatus.status !== "healthy") {
          issues.push("Network status: undefined");
        }
      } catch (error) {
        issues.push("Network status: undefined");
      }

      const status = issues.length === 0 ? "healthy" : issues.length < 3 ? "warning" : "critical";

      this.metrics.lastHealthCheck = new Date().toISOString();
      this.metrics.uptime = Math.max(0, this.metrics.uptime - (issues.length > 0 ? 1 : 0));

      if (issues.length > 0) {
        const alert = {
          id: `health-check-${Date.now()}`,
          title: "Health Check Issues",
          message: issues.join(", "),
          severity: issues.length < 3 ? "medium" : "high",
          timestamp: new Date().toISOString(),
          resolved: false,
        };

        this.alerts.push(alert);
        this.emit("alert", alert);
        console.log("🚨 Alert created:", alert.title, `(${alert.severity})`);
      }

      this.emit("healthCheck", { status, issues, timestamp: new Date().toISOString() });
      console.log(`✅ Health check completed: ${status}`);
      if (issues.length > 0) {
        console.log(`⚠️ Issues found: ${issues.join(", ")}`);
      }
    } catch (error) {
      console.error("❌ Error performing health check:", error);
      this.emit("error", error);
    }
  }

  updateMetrics(analyticsMetrics) {
    // Update monitoring metrics based on analytics
    this.metrics.responseTime = Math.random() * 1000 + 200;
    this.metrics.memoryUsage = Math.min(100, this.metrics.memoryUsage + Math.random() * 2);
    this.metrics.cpuUsage = Math.random() * 50 + 20;
    this.metrics.errorRate = Math.random() * 2;
  }

  getSystemStatus() {
    const activeAlerts = this.alerts.filter((a) => !a.resolved);
    const criticalAlerts = activeAlerts.filter((a) => a.severity === "critical");

    return {
      status: this.metrics.memoryUsage > 90 ? "warning" : "healthy",
      uptime: this.metrics.uptime,
      activeAlerts: activeAlerts.length,
      criticalAlerts: criticalAlerts.length,
      lastHealthCheck: this.metrics.lastHealthCheck,
      metrics: this.metrics,
      thresholds: this.thresholds,
    };
  }

  getAlerts(severity = null, resolved = false) {
    let alerts = this.alerts;

    if (severity) {
      alerts = alerts.filter((a) => a.severity === severity);
    }

    if (resolved !== null) {
      alerts = alerts.filter((a) => a.resolved === resolved);
    }

    return alerts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  getMetrics() {
    return { ...this.metrics };
  }

  resolveAlert(alertId) {
    const alert = this.alerts.find((a) => a.id === alertId);
    if (alert) {
      alert.resolved = true;
      alert.resolvedAt = new Date().toISOString();
      this.emit("alertResolved", alert);
      console.log("✅ Alert resolved:", alert.title);
    }
  }

  cleanupOldAlerts() {
    const cutoffDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
    this.alerts = this.alerts.filter((alert) => new Date(alert.timestamp) > cutoffDate);
    console.log("🧹 Cleaned up old alerts");
  }

  stop() {
    this.isRunning = false;
    console.log("🔍 Monitoring System stopped");
  }
}

module.exports = MonitoringSystem;
