import { describe, it, expect } from "vitest";
import { computeHealth, getHealthUI, type MeliHealthStatus } from "../lib/meliTokenHealth";

describe("meliTokenHealth", () => {
  describe("computeHealth", () => {
    it("should return disconnected when token is null", () => {
      const result = computeHealth(null);
      expect(result).toEqual({ status: "disconnected" });
    });

    it("should return connected for valid token with refresh", () => {
      const futureDate = new Date(Date.now() + 3600000).toISOString(); // 1 hour from now
      const token = {
        expires_at: futureDate,
        refresh_token: "refresh_token",
        has_refresh_token: true,
      };
      const result = computeHealth(token);
      expect(result.status).toBe("connected");
      expect(result.minutesLeft).toBeGreaterThan(0);
    });

    it("should return no_refresh_valid for valid token without refresh", () => {
      const futureDate = new Date(Date.now() + 3600000).toISOString();
      const token = {
        expires_at: futureDate,
        refresh_token: null,
        has_refresh_token: false,
      };
      const result = computeHealth(token);
      expect(result.status).toBe("no_refresh_valid");
      expect(result.minutesLeft).toBeGreaterThan(0);
    });

    it("should return expired_with_refresh for expired token with refresh", () => {
      const pastDate = new Date(Date.now() - 3600000).toISOString(); // 1 hour ago
      const token = {
        expires_at: pastDate,
        refresh_token: "refresh_token",
        has_refresh_token: true,
      };
      const result = computeHealth(token);
      expect(result.status).toBe("expired_with_refresh");
      expect(result.minutesLeft).toBe(0);
    });

    it("should return no_refresh_expired for expired token without refresh", () => {
      const pastDate = new Date(Date.now() - 3600000).toISOString();
      const token = {
        expires_at: pastDate,
        refresh_token: null,
        has_refresh_token: false,
      };
      const result = computeHealth(token);
      expect(result.status).toBe("no_refresh_expired");
      expect(result.minutesLeft).toBe(0);
    });

    it("should handle has_refresh_token boolean correctly", () => {
      const futureDate = new Date(Date.now() + 3600000).toISOString();
      const token = {
        expires_at: futureDate,
        has_refresh_token: true,
      };
      const result = computeHealth(token);
      expect(result.status).toBe("connected");
    });

    // Bug exposure test: invalid date string should be handled properly
    it("should handle invalid date strings gracefully", () => {
      const token = {
        expires_at: "invalid-date-string",
        refresh_token: "refresh_token",
        has_refresh_token: true,
      };
      // Should return disconnected for invalid dates
      const result = computeHealth(token);
      expect(result).toEqual({ status: "disconnected" });
    });

    it("should handle empty string as expires_at", () => {
      const token = {
        expires_at: "",
        refresh_token: "refresh_token",
        has_refresh_token: true,
      };
      const result = computeHealth(token);
      expect(result).toEqual({ status: "disconnected" });
    });

    it("should handle null expires_at", () => {
      const token = {
        expires_at: null as any,
        refresh_token: "refresh_token",
        has_refresh_token: true,
      };
      const result = computeHealth(token);
      expect(result).toEqual({ status: "disconnected" });
    });
  });

  describe("getHealthUI", () => {
    it("should return correct UI for connected status", () => {
      const result = getHealthUI("connected");
      expect(result).toEqual({
        label: "Conectado",
        description: "MercadoLibre conectado y funcionando correctamente.",
        color: "green",
        showReconnectCTA: false,
      });
    });

    it("should return correct UI for no_refresh_valid status", () => {
      const result = getHealthUI("no_refresh_valid");
      expect(result).toEqual({
        label: "Conectado (sin renovación)",
        description: "Llegan consultas, pero cuando venza no se podrá renovar solo. Conviene reconectar.",
        color: "amber",
        showReconnectCTA: true,
      });
    });

    it("should return correct UI for expired_with_refresh status", () => {
      const result = getHealthUI("expired_with_refresh");
      expect(result).toEqual({
        label: "Renovación automática pendiente",
        description: "El token se renovará automáticamente en el próximo sync. Podés seguir trabajando.",
        color: "amber",
        showReconnectCTA: false,
      });
    });

    it("should return correct UI for no_refresh_expired status", () => {
      const result = getHealthUI("no_refresh_expired");
      expect(result).toEqual({
        label: "Reconexión necesaria",
        description: "No se puede renovar automáticamente. Reconectá MercadoLibre para seguir recibiendo consultas.",
        color: "red",
        showReconnectCTA: true,
      });
    });

    it("should return correct UI for disconnected status", () => {
      const result = getHealthUI("disconnected");
      expect(result).toEqual({
        label: "No conectado",
        description: "Conectá tu cuenta de MercadoLibre para empezar a recibir consultas.",
        color: "muted",
        showReconnectCTA: true,
      });
    });

    it("should return loading UI for null status", () => {
      const result = getHealthUI(null);
      expect(result).toEqual({
        label: "Cargando...",
        description: "",
        color: "muted",
        showReconnectCTA: false,
      });
    });
  });
});