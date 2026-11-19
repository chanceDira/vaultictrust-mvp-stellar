const MODAL_CLOSED_MESSAGE = "The user closed the modal.";
const CONNECT_FALLBACK = "The wallet did not connect. Unlock it and try again.";

function errorMessage(error: unknown): string | null {
  if (typeof error === "string") return error.trim() || null;
  if (typeof error !== "object" || error === null || !("message" in error)) return null;
  const { message } = error as { message: unknown };
  return typeof message === "string" && message.trim() ? message.trim() : null;
}

export function connectFailureMessage(error: unknown): string | null {
  const message = errorMessage(error);
  if (message === MODAL_CLOSED_MESSAGE) return null;
  return message ?? CONNECT_FALLBACK;
}
