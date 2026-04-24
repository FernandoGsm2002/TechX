export async function notifyAdmins(organizationId: string, title: string, body: string, url: string = "/") {
  try {
    await fetch("/api/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ organizationId, title, body, url }),
    });
  } catch (error) {
    console.error("Failed to notify admins", error);
  }
}
