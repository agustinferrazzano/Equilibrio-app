import cron from "node-cron";
import { CheckPriceAlertsUseCase } from "@equilibrio/core";
import type { Server as SocketIOServer } from "socket.io";

export function startPriceAlertsCronJob(
  checkPriceAlertsUseCase: CheckPriceAlertsUseCase,
  io: SocketIOServer
): void {
  // Ejecutar cada 5 minutos
  cron.schedule("*/5 * * * *", async () => {
    try {
      console.log("[CronJob] Starting price alerts check at", new Date().toISOString());
      const triggeredAlerts = await checkPriceAlertsUseCase.execute();

      if (triggeredAlerts.length > 0) {
        console.log(`[CronJob] ${triggeredAlerts.length} alerts were triggered`);
        triggeredAlerts.forEach((event) => {
          console.log(
            `  - User: ${event.userId}, Asset: ${event.assetId}, Condition: ${event.condition}, Target: ${event.targetPrice}, Current: ${event.currentPrice}`,
          );
          io.emit("price-alert-triggered", event);
        });
      } else {
        console.log("[CronJob] No alerts triggered");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error(`[CronJob] Error in price alerts check: ${message}`);
    }
  });

  console.log("[CronJob] Price alerts cron job started (every 5 minutes)");
}
