import { Router } from "express";
import { requireMember } from "../../lib/access.js";
import { requireAuth } from "../../middleware/auth.js";
import { getCalendar, todayFor } from "./availability.service.js";
import { AvailabilityQuery, BakeriesQuery, BakerySettingsUpdate, BlockedDateInput, MemberInput } from "./bakeries.schemas.js";
import * as bakeries from "./bakeries.service.js";

// Mounted at /api/bakeries.
export const bakeriesRouter = Router();

// ---- Public ---------------------------------------------------------------

bakeriesRouter.get("/", async (req, res) => {
  res.json(await bakeries.listBakeries(BakeriesQuery.parse(req.query)));
});

bakeriesRouter.get("/:bakeryId", async (req, res) => {
  res.json(await bakeries.getPublicBakery(req.params.bakeryId));
});

// Which days can take a custom cake. The app greys out the rest in its date picker.
bakeriesRouter.get("/:bakeryId/availability", async (req, res) => {
  const { from, days } = AvailabilityQuery.parse(req.query);
  const bakery = await bakeries.findActiveBakery(req.params.bakeryId);
  res.json(await getCalendar(bakery, from ?? todayFor(bakery), days));
});

// ---- Staff ----------------------------------------------------------------

// Full settings, including capacity rules, for the dashboard.
bakeriesRouter.get("/:bakeryId/settings", requireAuth, requireMember(), async (req, res) => {
  res.json(await bakeries.getStaffBakery(req.params.bakeryId));
});

bakeriesRouter.patch("/:bakeryId", requireAuth, requireMember("OWNER"), async (req, res) => {
  res.json(await bakeries.updateSettings(req.params.bakeryId, BakerySettingsUpdate.parse(req.body)));
});

bakeriesRouter.get("/:bakeryId/members", requireAuth, requireMember(), async (req, res) => {
  res.json(await bakeries.listMembers(req.params.bakeryId));
});

bakeriesRouter.post("/:bakeryId/members", requireAuth, requireMember("OWNER"), async (req, res) => {
  const { email, role } = MemberInput.parse(req.body);
  res.status(201).json(await bakeries.addMember(req.params.bakeryId, email, role));
});

bakeriesRouter.delete("/:bakeryId/members/:memberId", requireAuth, requireMember("OWNER"), async (req, res) => {
  await bakeries.removeMember(req.params.bakeryId, req.params.memberId);
  res.status(204).end();
});

bakeriesRouter.get("/:bakeryId/blocked-dates", requireAuth, requireMember(), async (req, res) => {
  res.json(await bakeries.listBlockedDates(req.params.bakeryId));
});

bakeriesRouter.post("/:bakeryId/blocked-dates", requireAuth, requireMember(), async (req, res) => {
  const { date, reason } = BlockedDateInput.parse(req.body);
  res.status(201).json(await bakeries.blockDate(req.params.bakeryId, date, reason));
});

bakeriesRouter.delete("/:bakeryId/blocked-dates/:blockedDateId", requireAuth, requireMember(), async (req, res) => {
  await bakeries.unblockDate(req.params.bakeryId, req.params.blockedDateId);
  res.status(204).end();
});
