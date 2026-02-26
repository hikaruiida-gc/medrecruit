import { prisma } from "@/lib/prisma";

type NotificationType =
  | "NEW_APPLICANT"
  | "STATUS_CHANGED"
  | "INTERVIEW_SCHEDULED"
  | "INTERVIEW_COMPLETED"
  | "COMPATIBILITY_CALCULATED";

export async function createNotification({
  organizationId,
  type,
  title,
  message,
  relatedId,
  relatedType,
}: {
  organizationId: string;
  type: NotificationType;
  title: string;
  message: string;
  relatedId?: string;
  relatedType?: string;
}) {
  try {
    return await prisma.notification.create({
      data: {
        organizationId,
        type,
        title,
        message,
        relatedId,
        relatedType,
      },
    });
  } catch (error) {
    console.error("通知作成エラー:", error);
    // Notification creation failure should not break the main flow
    return null;
  }
}
