import { IPriceAlertRepository } from "../repositories/IPriceAlertRepository";
import { IMarketDataService } from "../services/IMarketDataService";

export interface PriceAlertTriggeredEvent {
  alertId: string;
  userId: string;
  assetId: string;
  targetPrice: number;
  currentPrice: number;
  condition: "GREATER_THAN" | "LESS_THAN";
  timestamp: Date;
}

export class CheckPriceAlertsUseCase {
  constructor(
    private readonly priceAlertRepository: IPriceAlertRepository,
    private readonly marketDataService: IMarketDataService,
  ) {}

  async execute(): Promise<PriceAlertTriggeredEvent[]> {
    const triggeredEvents: PriceAlertTriggeredEvent[] = [];

    try {
      // Obtener todas las alertas activas
      const activeAlerts = await this.priceAlertRepository.findActiveAlerts();

      if (activeAlerts.length === 0) {
        console.log("[CheckPriceAlerts] No active alerts found");
        return triggeredEvents;
      }

      console.log(`[CheckPriceAlerts] Checking ${activeAlerts.length} active alerts...`);

      // Verificar cada alerta
      for (const alert of activeAlerts) {
        try {
          // Obtener precio actual del activo
          const currentPrice = await this.marketDataService.getCurrentPrice(alert.assetId);

          if (currentPrice === null) {
            console.warn(`[CheckPriceAlerts] Could not fetch price for ${alert.assetId}`);
            continue;
          }

          // Evaluar si se dispara la alerta
          if (alert.isTriggered(currentPrice)) {
            console.log(
              `[CheckPriceAlerts] ALERT TRIGGERED! ${alert.assetId} ${alert.condition} ${alert.targetPrice} (current: ${currentPrice})`,
            );

            // Registrar el evento
            const event: PriceAlertTriggeredEvent = {
              alertId: alert.id,
              userId: alert.userId,
              assetId: alert.assetId,
              targetPrice: alert.targetPrice,
              currentPrice,
              condition: alert.condition,
              timestamp: new Date(),
            };

            triggeredEvents.push(event);

            // Marcar la alerta como disparada (desactivar)
            await this.priceAlertRepository.markAsTriggered(alert.id);
            console.log(`[CheckPriceAlerts] Alert ${alert.id} marked as triggered`);
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unknown error";
          console.error(`[CheckPriceAlerts] Error checking alert ${alert.id}: ${message}`);
        }
      }

      return triggeredEvents;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error(`[CheckPriceAlerts] Critical error: ${message}`);
      return triggeredEvents;
    }
  }
}
