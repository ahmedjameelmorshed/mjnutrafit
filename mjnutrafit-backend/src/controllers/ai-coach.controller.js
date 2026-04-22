const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8000";

const aiCoachChat = async (req, res, next) => {
  try {
    if (req.user.role !== "client") {
      res.status(403).json({ message: "Only clients can use AI Coach" });
      return;
    }

    const { message, session_id: sessionId } = req.body;

    if (!message || typeof message !== "string") {
      res.status(400).json({ message: "Message is required" });
      return;
    }

    const authHeader = req.headers.authorization;
    if (!authHeader) {
      res.status(401).json({ message: "Authorization required" });
      return;
    }

    const response = await fetch(`${AI_SERVICE_URL}/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
      body: JSON.stringify({
        message: message.trim(),
        session_id: sessionId || undefined,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("MJNutraFit AI service error:", response.status, errText);
      let detail = "AI Coach is unavailable. Please try again later.";
      try {
        const j = JSON.parse(errText);
        if (j.detail) detail = typeof j.detail === "string" ? j.detail : JSON.stringify(j.detail);
      } catch {
      }
      res.status(response.status >= 400 && response.status < 600 ? response.status : 503).json({
        message: detail,
      });
      return;
    }

    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    console.error("AI Coach proxy error:", error);
    next(error);
  }
};

module.exports = { aiCoachChat };
