export async function autoPublishMeliAnswer(
  accessToken: string,
  meliQuestionId: string,
  answerText: string
): Promise<boolean> {
  try {
    const res = await fetch("https://api.mercadolibre.com/answers", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        question_id: Number(meliQuestionId),
        text: answerText,
      }),
    });

    if (!res.ok) {
      console.error("Auto-publish failed:", await res.text());
      return false;
    }
    console.log("Auto-published answer for question:", meliQuestionId);
    return true;
  } catch (e) {
    console.error("Auto-publish error:", e);
    return false;
  }
}
