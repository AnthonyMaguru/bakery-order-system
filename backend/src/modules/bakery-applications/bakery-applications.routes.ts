import { Router } from "express";
import { requireRole } from "../../lib/access.js";
import { requireAuth } from "../../middleware/auth.js";
import { BakeryApplicationInput, BakeryApplicationStatusUpdate } from "./bakery-applications.schemas.js";
import * as applications from "./bakery-applications.service.js";

export const bakeryApplicationsRouter = Router();

bakeryApplicationsRouter.post("/", async (req, res) => {
  const application = await applications.createApplication(BakeryApplicationInput.parse(req.body));
  res.status(201).json(application);
});

bakeryApplicationsRouter.get("/", requireAuth, requireRole("ADMIN"), async (_req, res) => {
  res.json(await applications.listApplications());
});

bakeryApplicationsRouter.patch("/:applicationId", requireAuth, requireRole("ADMIN"), async (req, res) => {
  const { status } = BakeryApplicationStatusUpdate.parse(req.body);
  res.json(await applications.updateApplicationStatus(String(req.params.applicationId), status));
});

bakeryApplicationsRouter.post("/:applicationId/onboard", requireAuth, requireRole("ADMIN"), async (req, res) => {
  res.status(201).json(await applications.onboardApplication(String(req.params.applicationId)));
});
