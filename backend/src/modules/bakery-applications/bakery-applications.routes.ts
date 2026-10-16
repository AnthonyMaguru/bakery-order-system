import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { BakeryApplicationInput, BakeryApplicationStatusUpdate } from "./bakery-applications.schemas.js";
import * as applications from "./bakery-applications.service.js";

export const bakeryApplicationsRouter = Router();

bakeryApplicationsRouter.post("/", async (req, res) => {
  const application = await applications.createApplication(BakeryApplicationInput.parse(req.body));
  res.status(201).json(application);
});

bakeryApplicationsRouter.get("/", requireAuth, async (req, res) => {
  if (req.user!.role !== "ADMIN") {
    res.status(403).json({ error: "Platform admin access required" });
    return;
  }
  res.json(await applications.listApplications());
});

bakeryApplicationsRouter.patch("/:applicationId", requireAuth, async (req, res) => {
  if (req.user!.role !== "ADMIN") {
    res.status(403).json({ error: "Platform admin access required" });
    return;
  }
  const { status } = BakeryApplicationStatusUpdate.parse(req.body);
  res.json(await applications.updateApplicationStatus(req.params.applicationId, status));
});
