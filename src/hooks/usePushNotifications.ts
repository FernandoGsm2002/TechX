"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

const urlBase64ToUint8Array = (base64String: string) => {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, "+")
    .replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

export function usePushNotifications() {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);

  const checkSubscription = async () => {
    try {
      // getRegistration() returns undefined if no SW is registered yet (avoids hanging)
      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration) return;
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    } catch (error) {
      console.error("Error checking subscription:", error);
    }
  };

  useEffect(() => {
    if ("serviceWorker" in navigator && "PushManager" in window) {
      setIsSupported(true);
      checkSubscription();
    }
  }, []);

  const subscribeToPush = async () => {
    if (!isSupported) {
      toast.error("Tu navegador no soporta notificaciones push.");
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        toast.error("Permiso denegado por el usuario o el sistema.");
        return;
      }

      const publicVapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!publicVapidKey) {
        toast.error("Falta llave VAPID pública (Configuración de entorno).");
        return;
      }

      let registration = await navigator.serviceWorker.getRegistration();
      if (!registration) {
        toast.error("Esperando al Service Worker...");
        registration = await navigator.serviceWorker.ready;
      }

      if (!registration) {
        toast.error("No se pudo iniciar el Service Worker.");
        return;
      }

      // A subscription created with an older VAPID key cannot be reused.
      // Remove it so a key rotation or a previous failed setup does not block registration.
      const existingSubscription = await registration.pushManager.getSubscription();
      if (existingSubscription) {
        const removed = await existingSubscription.unsubscribe();
        if (!removed) {
          throw new Error("No se pudo reemplazar la suscripción Push anterior.");
        }
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicVapidKey),
      });

      // Send subscription to our backend
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription),
      });

      if (res.ok) {
        setIsSubscribed(true);
        toast.success("Push activado correctamente en este dispositivo.");
      } else {
        const data = await res.json().catch(() => null) as { error?: string } | null;
        throw new Error(data?.error || "El servidor rechazó la suscripción (Código " + res.status + ")");
      }
    } catch (error: unknown) {
      console.error("Failed to subscribe to push notifications:", error);
      const message = error instanceof Error ? error.message : "Error desconocido";
      toast.error(`Fallo al activar Push: ${message}`);
    }
  };

  const unsubscribeFromPush = async () => {
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration) return;
      const subscription = await registration.pushManager.getSubscription();
      if (!subscription) { setIsSubscribed(false); return; }

      await subscription.unsubscribe();

      // Remove from backend
      await fetch("/api/push/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: subscription.endpoint }),
      });

      setIsSubscribed(false);
      toast.success("Notificaciones push desactivadas.");
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Error desconocido";
      toast.error(`Error al desactivar push: ${msg}`);
    }
  };

  return {
    isSupported,
    isSubscribed,
    subscribeToPush,
    unsubscribeFromPush,
  };
}
