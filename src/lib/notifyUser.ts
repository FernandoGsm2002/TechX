/**
 * Sends a push notification to a specific user (by userId).
 * Used to alert a technician about an assigned collection task.
 */
export async function notifyUser(
  organizationId: string,
  targetUserId: string,
  title: string,
  body: string,
  url: string = "/"
) {
  try {
    await fetch("/api/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ organizationId, targetUserId, title, body, url }),
    });
  } catch (error) {
    console.error("Failed to notify user", error);
  }
}
