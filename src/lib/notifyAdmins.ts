export async function notifyAdmins(organizationId: string, title: string, body: string, url: string = "/") {
  try {
    const response = await fetch("/api/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ organizationId, title, body, url }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => null) as { error?: string } | null;
      throw new Error(data?.error ?? `Push rechazado (${response.status})`);
    }
  } catch (error) {
    console.error("Failed to notify admins", error);
  }
}
