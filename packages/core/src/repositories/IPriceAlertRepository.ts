import { PriceAlert } from "../models/PriceAlert";

export interface IPriceAlertRepository {
  /**
   * Guarda una nueva alerta de precio
   */
  save(alert: PriceAlert): Promise<void>;

  /**
   * Obtiene todas las alertas activas
   */
  findActiveAlerts(): Promise<PriceAlert[]>;

  /**
   * Marca una alerta como disparada (desactivándola)
   */
  markAsTriggered(id: string): Promise<void>;

  /**
   * Obtiene una alerta por ID
   */
  findById(id: string): Promise<PriceAlert | null>;

  /**
   * Obtiene alertas por usuario
   */
  findByUserId(userId: string): Promise<PriceAlert[]>;

  /**
   * Elimina una alerta
   */
  deleteById(id: string): Promise<boolean>;
}
