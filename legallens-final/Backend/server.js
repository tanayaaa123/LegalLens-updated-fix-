import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import User from "./models/User.js";
import Role from "./models/Role.js";
import Case from "./models/Case.js";
import Event from "./models/Event.js";
import Evidence from "./models/Evidence.js";
import CaseMember from "./models/CaseMember.js";
import AuditLog from "./models/AuditLog.js";
import Notification from "./models/Notification.js";
import bcrypt from "bcrypt";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, ".env") });
const app = express();

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// Multer for evidence files (max 50MB)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const caseId =
      req.params?.id ||
      req.body?.case_id ||
      req.body?.caseId ||
      req.query?.case_id ||
      "general";
    const caseFolder = path.join(uploadsDir, `case-${caseId}`);
    if (!fs.existsSync(caseFolder))
      fs.mkdirSync(caseFolder, { recursive: true });
    cb(null, caseFolder);
  },
  filename: (req, file, cb) =>
    cb(
      null,
      `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`,
    ),
});
const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });

// Multer for avatar images (max 5MB)
const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, "uploads/avatars");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) =>
    cb(null, `avatar-${req.user.id}${path.extname(file.originalname)}`),
});
const uploadAvatar = multer({
  storage: avatarStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
});

// CORS — allow React dev server
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "http://localhost:3000");
  res.header(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS, PATCH",
  );
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.header("Access-Control-Allow-Credentials", "true");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});
app.use(express.json());
app.use("/uploads", express.static(uploadsDir));

// Auth middleware 
function authenticateToken(req, res, next) {
  const token = req.headers["authorization"]?.split(" ")[1];
  if (!token) return res.sendStatus(401);
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}

function requireRole(...roles) {
  return (req, res, next) =>
    roles.includes(req.user.role_id)
      ? next()
      : res.status(403).json({ message: "Access denied" });
}

// Auto-increment helper
async function nextSeq(Model, field) {
  const last = await Model.findOne().sort({ [field]: -1 });
  return (last?.[field] ?? 0) + 1;
}

// toObjectId helper

function toObjectId(id) {
  return new mongoose.Types.ObjectId(id);
}

function escapeRegex(value = "") {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}


async function sendNotifications(userIds, message) {
  if (!userIds || !userIds.length) return;
  // Deduplicate and safely convert every id to ObjectId
  const seen = new Set();
  const uniqueObjectIds = [];
  for (const uid of userIds) {
    const str = uid.toString();
    if (!seen.has(str)) {
      seen.add(str);
      try {
        uniqueObjectIds.push(toObjectId(str));
      } catch {
      
      }
    }
  }
  if (!uniqueObjectIds.length) return;
  await Notification.insertMany(
    uniqueObjectIds.map((uid) => ({
      user_id: uid,
      message,
      read: false,
      created_at: new Date(),
    })),
  );
}

async function backfillNotificationsForUser(user) {
  const userObjectId = toObjectId(user.id);
  let candidateLogs = [];
  let candidateEvents = [];

  if (user.role_id === 1) {
    candidateLogs = await AuditLog.find({})
      .sort({ timestamp: -1 })
      .limit(80)
      .select("action timestamp");
    candidateEvents = await Event.find({})
      .sort({ event_date: -1 })
      .limit(80)
      .select("title event_date");
  } else {
    const memberships = await CaseMember.find({ user_id: userObjectId }).populate(
      "case_id",
      "title",
    );
    const caseTitles = memberships
      .map((m) => m.case_id?.title)
      .filter(Boolean)
      .map(escapeRegex);

    const caseIdList = memberships.map((m) => m.case_id?._id).filter(Boolean);
    const orClauses = [
      { target_user_ids: userObjectId },
      ...(caseIdList.length ? [{ case_id: { $in: caseIdList } }] : []),
      ...(caseTitles.length ? [{ action: { $regex: caseTitles.join("|"), $options: "i" } }] : []),
    ];
    if (!orClauses.length) return;

    candidateLogs = await AuditLog.find({ $or: orClauses })
      .sort({ timestamp: -1 })
      .limit(80)
      .select("action timestamp");

    candidateEvents = await Event.find({
      case_id: { $in: caseIdList },
    })
      .sort({ event_date: -1 })
      .limit(80)
      .select("title event_date");
  }

  if (!candidateLogs.length && !candidateEvents.length) return;

  const existingNotifications = await Notification.find({
    user_id: userObjectId,
  }).select("message created_at");
  const existingMessages = new Set(
    existingNotifications.map(
      (n) =>
        `${n.message}|${new Date(
          n.created_at || 0,
        ).toISOString()}`,
    ),
  );

  const normalizedCandidates = [
    ...candidateLogs.map((log) => ({
      message: log.action,
      created_at: log.timestamp,
    })),
    ...candidateEvents.map((event) => ({
      message: event.title,
      created_at: event.event_date,
    })),
  ];

  const missing = normalizedCandidates
    .filter(
      (item) =>
        item.message &&
        !existingMessages.has(
          `${item.message}|${new Date(item.created_at || 0).toISOString()}`,
        ),
    )
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

  if (!missing.length) return;

  await Notification.insertMany(
    missing.map((item) => ({
      user_id: userObjectId,
      message: item.message,
      read: false,
      created_at: item.created_at,
    })),
  );
}

async function getAdminIds() {
  const adminRole = await Role.findOne({ role_id: 1 });
  if (!adminRole) return [];
  const admins = await User.find({ role_id: adminRole._id }).select("_id");
  return admins.map((u) => u._id);
}

async function getAllUserIds() {
  const users = await User.find({}).select("_id");
  return users.map((u) => u._id);
}

async function notifyCaseMembers(caseId, message, excludeIds = []) {
  const members = await CaseMember.find({ case_id: caseId }).select("user_id");
  const memberIds = members.map((m) => m.user_id.toString());
  const adminIds = (await getAdminIds()).map((id) => id.toString());
  const excludeSet = new Set(excludeIds.map((id) => id.toString()));
  const notifyIds = [
    ...new Set([...memberIds, ...adminIds].filter((id) => !excludeSet.has(id))),
  ];
  if (notifyIds.length) {
    await sendNotifications(notifyIds, message);
  }
  return notifyIds;
}

async function getCaseNotificationRecipients(
  caseId,
  { extraUserIds = [], excludeIds = [] } = {},
) {
  const members = await CaseMember.find({ case_id: caseId }).select("user_id");
  const memberIds = members.map((m) => m.user_id.toString());
  const adminIds = (await getAdminIds()).map((id) => id.toString());
  const extraIds = extraUserIds.map((id) => id.toString());
  const excludeSet = new Set(excludeIds.map((id) => id.toString()));

  return [
    ...new Set(
      [...memberIds, ...adminIds, ...extraIds].filter(
        (id) => !excludeSet.has(id),
      ),
    ),
  ];
}


async function logAction(userId, action, options = {}) {
  try {
    const normalized =
      Array.isArray(options)
        ? { targetUserIds: options }
        : options && typeof options === "object"
          ? options
          : {};

    const targetUserIds = (normalized.targetUserIds || [])
      .map((id) => {
        try {
          return toObjectId(id);
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    await AuditLog.create({
      log_id: await nextSeq(AuditLog, "log_id"),
      user_id: userId,
      case_id: normalized.caseId || null,
      target_user_ids: targetUserIds,
      action,
    });
  } catch (e) {
    console.error("logAction error:", e.message);
  }
}

async function createCaseEvent(caseId, title, description, userId, date) {
  await Event.create({
    event_id: await nextSeq(Event, "event_id"),
    case_id: caseId,
    created_by: userId,
    title,
    description: description || "",
    event_date: date ? new Date(date) : new Date(),
  });
}

async function resolveCaseEndDate(caseDoc) {
  if (!caseDoc) return null;
  if (caseDoc.end_date) return caseDoc.end_date;
  if (caseDoc.status !== "Close") return null;

  const caseTitleRegex = escapeRegex(caseDoc.title || "");
  const closeEvent = await Event.findOne({
    case_id: caseDoc._id,
    title: { $regex: "status updated to close", $options: "i" },
  })
    .sort({ event_date: -1 })
    .select("event_date created_at");

  if (closeEvent?.event_date || closeEvent?.created_at) {
    return closeEvent.event_date || closeEvent.created_at;
  }

  const closeLog = await AuditLog.findOne({
    action: {
      $regex: `case\\s+"?${caseTitleRegex}"?.*status updated.*close|status updated.*close.*${caseTitleRegex}`,
      $options: "i",
    },
  })
    .sort({ timestamp: -1 })
    .select("timestamp");

  if (closeLog?.timestamp) {
    return closeLog.timestamp;
  }

  return caseDoc.updatedAt || caseDoc.start_date || null;
}

function resolveStoredFileUrl(fileUrl, caseId) {
  if (!fileUrl) return null;

  const normalized = String(fileUrl).replace(/\\/g, "/");
  const directPath = normalized.startsWith("/") ? normalized : `/${normalized}`;
  const directDiskPath = path.join(__dirname, directPath.replace(/^\//, ""));
  if (fs.existsSync(directDiskPath)) {
    return directPath.startsWith("/uploads")
      ? directPath
      : `/uploads/${path.basename(directPath)}`;
  }

  const fileName = path.basename(normalized);
  const caseScopedUrl = `/uploads/case-${caseId}/${fileName}`;
  const caseScopedDiskPath = path.join(__dirname, "uploads", `case-${caseId}`, fileName);
  if (fs.existsSync(caseScopedDiskPath)) {
    return caseScopedUrl;
  }

  const legacyUrl = `/uploads/${fileName}`;
  const legacyDiskPath = path.join(__dirname, "uploads", fileName);
  if (fs.existsSync(legacyDiskPath)) {
    return legacyUrl;
  }

  return normalized.startsWith("/uploads") ? normalized : `/uploads/${fileName}`;
}


mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log(" MongoDB connected"))
  .catch((err) => console.error("MongoDB error:", err));


// Login
app.post("/login", async (req, res) => {
  try {
    const email = req.body.email?.trim().toLowerCase();
    const { password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: "Email and password required" });

    const user = await User.findOne({ email }).populate("role_id");
    if (!user)
      return res
        .status(401)
        .json({ message: "No account found with this email" });
    const passwordMatch = user.password.startsWith("$2")
      ? await bcrypt.compare(password, user.password)
      : user.password === password; // legacy plaintext accounts
    if (!passwordMatch)
      return res.status(401).json({ message: "Incorrect password" });

    const token = jwt.sign(
      {
        id: user._id,
        email: user.email,
        role_id: user.role_id.role_id,
        role_name: user.role_id.role_name,
      },
      process.env.JWT_SECRET,
      { expiresIn: "8h" },
    );

    
    (async () => {
      try {
        const loginMsg = `Welcome back, ${user.name}! You logged in as ${user.role_id.role_name.replace(/_/g, " ")}.`;
        const alreadyToday = await Notification.findOne({
          user_id: user._id,
          message: { $regex: "Welcome back", $options: "i" },
          created_at: { $gte: new Date(Date.now() - 8 * 60 * 60 * 1000) },
        });
        if (!alreadyToday) {
          await Notification.create({
            user_id: user._id,
            message: loginMsg,
            read: false,
          });
        }
      } catch (e) {
     
      }
    })();

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role_id: user.role_id.role_id,
        role_name: user.role_id.role_name,
        avatar: user.avatar || null,
        bio: user.bio || "",
        phone: user.phone || "",
        department: user.department || "",
      },
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});


app.post("/password-reset-request-public", async (req, res) => {
  try {
    const email = req.body.email?.trim().toLowerCase();
    if (!email) return res.status(400).json({ message: "Email is required" });

    const requester = await User.findOne({ email }).populate("role_id");
    if (!requester)
      return res
        .status(404)
        .json({ message: "No account found with this email" });

    const allowedForgotRoles = new Set([
      "Lead_Investigator",
      "Forensic_Officer",
      "Police_Officer",
    ]);
    if (!allowedForgotRoles.has(requester.role_id?.role_name)) {
      return res.status(403).json({
        message:
          "Forgot password is only available for Lead Investigator, Forensic Officer, and Police Officer accounts.",
      });
    }

    const adminRole = await Role.findOne({ role_id: 1 });
    const admins = await User.find({ role_id: adminRole?._id });
    if (!admins.length)
      return res.status(404).json({ message: "No administrator found" });

    const roleName = (requester.role_id?.role_name || "").replace(/_/g, " ");
    requester.password = "pass123";
    await requester.save();
    const adminMessage = `Forgot password used by ${requester.name} (${roleName}, ${requester.email}). Password reset to default pass123.`;
    const memberMessage = `Your password has been reset to the default password: pass123. Please sign in and change it from Settings as soon as possible.`;
    const auditMessage = `Forgot password used by "${requester.name}" (${requester.email}); password reset to default pass123`;
    const msg = `🔑 PASSWORD RESET REQUEST — ${requester.name} (${roleName}, ${requester.email}) has requested a password reset. Go to Members page → find the member → Reset Password.`;

    res.json({
      message: "Password reset to default password",
      adminName: admins[0]?.name || "Admin",
    });

    try {
      await sendNotifications(
        admins.map((a) => a._id),
        adminMessage,
      );
    } catch (sideErr) {
      console.error("Password reset request notification error:", sideErr);
    }

    try {
      await sendNotifications([requester._id], memberMessage);
    } catch (sideErr) {
      console.error("Password reset member notification error:", sideErr);
    }

    try {
      await logAction(requester._id, auditMessage);
    } catch (sideErr) {
      console.error("Password reset request audit log error:", sideErr);
    }
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error processing request", error: err.message });
  }
});


app.use(authenticateToken);


app.get("/dashboard", authenticateToken, async (req, res) => {
  try {
    const roleNames = {
      1: "Administrator",
      2: "Lead Investigator",
      3: "Forensic Officer",
      4: "Police Officer",
    };
    const roleName = roleNames[req.user.role_id] || "User";
    res.json({ message: `Logged in as ${roleName}` });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});




app.get("/notifications/unread-count", authenticateToken, async (req, res) => {
  try {
    try { await backfillNotificationsForUser(req.user); } catch (bErr) {
      console.error("Backfill error (non-fatal):", bErr.message);
    }
    const count = await Notification.countDocuments({
      user_id: toObjectId(req.user.id),
      read: false,
    });
    res.json({ count });
  } catch {
    res.status(500).json({ count: 0 });
  }
});

app.patch("/notifications/read-all", authenticateToken, async (req, res) => {
  try {
    await Notification.updateMany(
      { user_id: toObjectId(req.user.id), read: false },
      { read: true },
    );
    res.json({ success: true });
  } catch {
    res.status(500).json({ message: "Error marking all read" });
  }
});

app.get("/notifications", authenticateToken, async (req, res) => {
  try {
    try { await backfillNotificationsForUser(req.user); } catch (bErr) {
      console.error("Backfill error (non-fatal):", bErr.message);
    }
    const notifications = await Notification.find({
      user_id: toObjectId(req.user.id),
    })
      .sort({ created_at: -1 })
      .limit(50);
    res.json(notifications);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error fetching notifications", error: err.message });
  }
});

app.patch("/notifications/:id/read", authenticateToken, async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      {
        _id: req.params.id,
        user_id: toObjectId(req.user.id),
      },
      { read: true },
      { new: true },
    );
    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }
    res.json({ success: true });
  } catch {
    res.status(500).json({ message: "Error updating notification" });
  }
});



app.get("/audit-logs", requireRole(1, 2), async (req, res) => {
  try {
    const { page = 1, limit = 15, search = "" } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    let filter = {};

    if (req.user.role_id === 2) {
      
      
      const memberships = await CaseMember.find({
        user_id: toObjectId(req.user.id),
      }).populate("case_id");
      const caseTitles = memberships
        .map((m) => m.case_id?.title)
        .filter(Boolean)
        .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));

      if (caseTitles.length === 0) {
        return res.json({ logs: [], total: 0, pages: 1 });
      }

      const caseRegex = caseTitles.join("|");
      const caseIds = memberships.map((m) => m.case_id?._id).filter(Boolean);
      filter = {
        $or: [
          { case_id: { $in: caseIds } },
          { target_user_ids: toObjectId(req.user.id) },
          { action: { $regex: caseRegex, $options: "i" } },
        ],
      };

      if (search) {
        filter = {
          $and: [filter, { action: { $regex: search, $options: "i" } }],
        };
      }
    } else {
      if (search) {
        filter = { action: { $regex: search, $options: "i" } };
      }
    }

    const shouldPaginateDb = req.user.role_id !== 2;
    const total = await AuditLog.countDocuments(filter);
    const logs = await AuditLog.find(filter)
      .populate("user_id", "name email role_id")
      .sort({ timestamp: -1 })
      .skip(shouldPaginateDb ? skip : 0)
      .limit(shouldPaginateDb ? Number(limit) : Math.max(total, Number(limit), 100));

    const enriched = await Promise.all(
      logs.map(async (log) => {
        const role = log.user_id?.role_id
          ? await Role.findById(log.user_id.role_id)
          : null;
        return {
          _id: log._id,
          log_id: log.log_id,
          user: log.user_id
            ? { name: log.user_id.name, email: log.user_id.email }
            : { name: "System", email: "" },
          role: role?.role_name || "Unknown",
          action: log.action,
          timestamp: log.timestamp,
        };
      }),
    );

    let result = enriched;
    if (req.user.role_id === 2) {
      const memberships = await CaseMember.find({
        user_id: toObjectId(req.user.id),
      }).populate("case_id", "title");
      const caseIds = memberships.map((m) => m.case_id?._id).filter(Boolean);
      const eventFallbacks = await Event.find({
        case_id: { $in: caseIds },
      })
        .populate("created_by", "name email role_id")
        .sort({ event_date: -1 });

      const existingActions = new Set(enriched.map((log) => log.action));
      const syntheticLogs = await Promise.all(
        eventFallbacks
          .filter((event) => event.title && !existingActions.has(event.title))
          .map(async (event) => {
            const role = event.created_by?.role_id
              ? await Role.findById(event.created_by.role_id)
              : null;
            return {
              _id: `event-${event._id}`,
              log_id: event.event_id,
              user: event.created_by
                ? { name: event.created_by.name, email: event.created_by.email }
                : { name: "System", email: "" },
              role: role?.role_name || "Unknown",
              action: event.title,
              timestamp: event.event_date || event.created_at,
            };
          }),
      );

      result = [...enriched, ...syntheticLogs].sort(
        (a, b) => new Date(b.timestamp) - new Date(a.timestamp),
      );
        if (search) {
          const lower = search.toLowerCase();
          result = result.filter(
            (l) =>
              l.action?.toLowerCase().includes(lower) ||
              l.user?.name?.toLowerCase().includes(lower),
          );
        }
        const paged = result.slice(skip, skip + Number(limit));
        return res.json({
          logs: paged,
          total: result.length,
          pages: Math.ceil(result.length / Number(limit)) || 1,
        });
      }
      if (req.user.role_id === 1 && search) {
        const lower = search.toLowerCase();
        result = result.filter(
          (l) =>
          l.action?.toLowerCase().includes(lower) ||
          l.user?.name?.toLowerCase().includes(lower),
      );
    }

    res.json({
      logs: result,
      total,
      pages: Math.ceil(total / Number(limit)) || 1,
    });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error fetching audit logs", error: err.message });
  }
});



app.get("/case-stats", authenticateToken, async (req, res) => {
  try {
    let cases;
    if (req.user.role_id === 1) {
      cases = await Case.find({});
    } else {
      // : toObjectId()
      const memberships = await CaseMember.find({
        user_id: toObjectId(req.user.id),
      }).populate("case_id");
      cases = memberships.map((m) => m.case_id).filter(Boolean);
    }
    res.json({
      totalAssigned: cases.length,
      activeCases: cases.filter((c) => c.status === "Open").length,
      closedCases: cases.filter((c) => c.status === "Close").length,
      highPriorityCases: cases.filter((c) => c.priority === 3).length,
    });
  } catch (err) {
    res.status(500).json({ message: "Error", error: err.message });
  }
});


app.get("/cases", authenticateToken, async (req, res) => {
  try {
    let cases;
    if (req.user.role_id === 1) {
      cases = await Case.find({}).sort({ case_id: -1 });
    } else {
     
      const memberships = await CaseMember.find({
        user_id: toObjectId(req.user.id),
      }).populate("case_id");
      cases = memberships
        .map((m) => m.case_id)
        .filter(Boolean)
        .sort((a, b) => b.case_id - a.case_id);
    }
    if (!cases.length) return res.json([]);
    res.json(
      cases.map((c) => ({
        id: c._id,
        caseId: c.case_id,
        title: c.title,
        priority: c.priority,
        status: c.status,
      })),
    );
  } catch (err) {
    res.status(500).json({ message: "Error", error: err.message });
  }
});


app.get("/assigned-cases", authenticateToken, async (req, res) => {
  try {
    let cases;
    if (req.user.role_id === 1) {
      cases = await Case.find().sort({ priority: -1 }).limit(3);
    } else {
     
      
      const memberships = await CaseMember.find({
        user_id: toObjectId(req.user.id),
      }).populate("case_id");
      cases = memberships
        .map((m) => m.case_id)
        .filter(Boolean)
        .slice(0, 3);
    }
    if (!cases.length) return res.json([]);
    res.json(
      cases.map((c) => ({
        id: c._id,
        caseId: c.case_id,
        title: c.title,
        priority: c.priority,
        status: c.status,
      })),
    );
  } catch (err) {
    res.status(500).json({ message: "Error", error: err.message });
  }
});


app.get("/recent-cases", authenticateToken, async (req, res) => {
  try {
    let cases;
    if (req.user.role_id === 1) {
      cases = await Case.find({ status: "Open" })
        .sort({ priority: -1 })
        .limit(3);
    } else {
      
      
      const memberships = await CaseMember.find({
        user_id: toObjectId(req.user.id),
      }).populate("case_id");
      cases = memberships
        .map((m) => m.case_id)
        .filter((c) => c && c.status === "Open")
        .slice(0, 3);
    }
    if (!cases.length) return res.json({ message: "no recent cases" });
    res.json(
      cases.map((c) => ({
        id: c._id,
        caseId: c.case_id,
        title: c.title,
        priority: c.priority,
        status: c.status,
      })),
    );
  } catch (err) {
    res.status(500).json({ message: "Error", error: err.message });
  }
});

app.get("/case/:id", async (req, res) => {
  try {
    const caseDoc = await Case.findOne({
      case_id: parseInt(req.params.id, 10),
    });
    if (!caseDoc) return res.status(404).json({ message: "Case not found" });

    if (req.user.role_id !== 1) {
      
      const membership = await CaseMember.findOne({
        case_id: caseDoc._id,
        user_id: toObjectId(req.user.id),
      });
      if (!membership)
        return res.status(403).json({ message: "Access denied" });
    }

    const memberships = await CaseMember.find({
      case_id: caseDoc._id,
    }).populate({
      path: "user_id",
      populate: { path: "role_id", model: "Roles" },
    });

    const resolvedEndDate = await resolveCaseEndDate(caseDoc);
    if (resolvedEndDate && !caseDoc.end_date) {
      caseDoc.end_date = resolvedEndDate;
      await caseDoc.save();
    }

    res.json({
      id: caseDoc._id,
      caseId: caseDoc.case_id,
      title: caseDoc.title,
      description: caseDoc.description,
      status: caseDoc.status,
      priority: caseDoc.priority,
      start_date: caseDoc.start_date,
      end_date: resolvedEndDate || caseDoc.end_date,
      members: memberships.map((m) => m.user_id?.name).filter(Boolean),
      leadInvestigators: memberships
        .filter((m) => m.user_id?.role_id?.role_name === "Lead_Investigator")
        .map((m) => m.user_id.name),
      memberDetails: memberships
        .map((m) => ({
          id: m.user_id?._id,
          name: m.user_id?.name,
          role: m.user_id?.role_id?.role_name,
        }))
        .filter((m) => m.id),
    });
  } catch (err) {
    res.status(500).json({ message: "Error", error: err.message });
  }
});

// Update case status (Admin only)
app.patch("/case/:id/status", requireRole(1), async (req, res) => {
  try {
    const caseDoc = await Case.findOne({ case_id: parseInt(req.params.id) });
    if (!caseDoc) return res.status(404).json({ message: "Case not found" });
    const previousStatus = caseDoc.status;
    const nextStatus = req.body.status;
    const normalizedStatus = nextStatus === "Closed" ? "Close" : nextStatus;
    if (!["Open", "Close", "Archived"].includes(normalizedStatus)) {
      return res.status(400).json({ message: "Invalid status" });
    }
    caseDoc.status = normalizedStatus;
    caseDoc.end_date = normalizedStatus === "Close" ? new Date() : null;
    await caseDoc.save();
    const statusMessage = `Case "${caseDoc.title}" status updated from ${previousStatus} to ${normalizedStatus}`;

    try {
      await createCaseEvent(
        caseDoc._id,
        `Case "${caseDoc.title}" status updated to ${normalizedStatus}`,
        `Case "${caseDoc.title}" status changed from ${previousStatus} to ${normalizedStatus}`,
        req.user.id,
        caseDoc.end_date || new Date(),
      );
    } catch (eventErr) {
      console.error("Case status event error:", eventErr.message);
    }

    let notifyIds = [];
    try {
      notifyIds = await getCaseNotificationRecipients(caseDoc._id);
    } catch (recipientErr) {
      console.error("Case status recipient error:", recipientErr.message);
    }

    try {
      if (notifyIds.length) {
        await sendNotifications(notifyIds, statusMessage);
      }
    } catch (notifyErr) {
      console.error("Case status notification error:", notifyErr.message);
    }

    try {
      await logAction(req.user.id, statusMessage, {
        caseId: caseDoc._id,
        targetUserIds: notifyIds,
      });
    } catch (logErr) {
      console.error("Case status audit log error:", logErr.message);
    }

    res.json({ message: "Status updated", case: caseDoc });
  } catch (err) {
    res.status(500).json({ message: "Error", error: err.message });
  }
});

// Delete case (Admin only)
app.delete("/case/:id", requireRole(1), async (req, res) => {
  try {
    const caseDoc = await Case.findOne({
      case_id: parseInt(req.params.id),
    });
    if (!caseDoc) return res.status(404).json({ message: "Case not found" });
    const notifyIds = await getCaseNotificationRecipients(caseDoc._id, {
      excludeIds: [req.user.id],
    });
    const deleteMessage = `Case "${caseDoc.title}" (Case ID: ${caseDoc.case_id}) was permanently deleted`;

    await Case.findByIdAndDelete(caseDoc._id);

    await CaseMember.deleteMany({ case_id: caseDoc._id });
    await Evidence.deleteMany({ case_id: caseDoc._id });
    await Event.deleteMany({ case_id: caseDoc._id });

    if (notifyIds.length) {
      await sendNotifications(notifyIds, deleteMessage);
    }

      await logAction(req.user.id, deleteMessage, { caseId: caseDoc._id });
    res.json({ message: "Case deleted" });
  } catch (err) {
    res.status(500).json({ message: "Error", error: err.message });
  }
});

//  CREATE CASE 
app.post("/create-case", requireRole(1), async (req, res) => {
  try {
    const {
      title,
      description,
      status,
      priority,
      start_date,
      leader_id,
      member_ids,
    } = req.body;

    if (!title?.trim())
      return res.status(400).json({ message: "Case title is required" });
    if (!description?.trim())
      return res.status(400).json({ message: "Description is required" });

    const priorityMap = { Low: 1, Medium: 2, High: 3 };
    const normalizedStatus = status === "Closed" ? "Close" : status || "Open";
    const nextCaseId = await nextSeq(Case, "case_id");

    const savedCase = await new Case({
      case_id: nextCaseId,
      title: title.trim(),
      description: description.trim(),
      status: normalizedStatus,
      priority: priorityMap[priority] ?? 2,
      start_date: start_date ? new Date(start_date) : new Date(),
      crime_date: req.body.crime_date ? new Date(req.body.crime_date) : null,
    }).save();

    const allMemberIds = [
      ...new Set([leader_id, ...(member_ids || [])].filter(Boolean)),
    ];
    const responseBody = {
      message: "Case created successfully",
      case: savedCase,
    };
    res.status(201).json(responseBody);

    try {
      await createCaseEvent(
        savedCase._id,
        `Case created: "${savedCase.title}"`,
        `Case opened on ${savedCase.start_date.toLocaleDateString()} and assigned to ${allMemberIds.length} member(s)`,
        req.user.id,
        savedCase.start_date,
      );
    } catch (e) {
      console.error("Case creation event error:", e.message);
    }

    if (allMemberIds.length) {
      try {
        let mid = await nextSeq(CaseMember, "case_member_id");
        await CaseMember.insertMany(
          allMemberIds.map((uid) => ({
            case_member_id: mid++,
            case_id: savedCase._id,
            user_id: uid,
          })),
        );
        const adminIds = await getAdminIds();
        const notifyIds = [
          ...new Set([
            ...allMemberIds,
            ...adminIds.map((id) => id.toString()),
            req.user.id.toString(),
          ]),
        ];
        await sendNotifications(
          notifyIds,
          `You have been assigned to case "${title}" (Case #${nextCaseId})`,
        );
      } catch (sideErr) {
        console.error("Case notification error:", sideErr);
      }
    }

      try {
        await logAction(
          req.user.id,
          `New case created: "${title}" (Case ID: ${nextCaseId})`,
          { caseId: savedCase._id, targetUserIds: allMemberIds },
        );
      } catch (sideErr) {
        console.error("Case audit log error:", sideErr);
      }
  } catch (err) {
    console.error("Create case error:", err);
    res
      .status(500)
      .json({ message: "Error creating case", error: err.message });
  }
});


app.post("/case/:caseId/member", requireRole(1), async (req, res) => {
  try {
    const caseDoc = await Case.findOne({
      case_id: parseInt(req.params.caseId, 10),
    });
    if (!caseDoc) return res.status(404).json({ message: "Case not found" });

    const targetUser = await User.findById(req.body.user_id);
    if (!targetUser) return res.status(404).json({ message: "User not found" });

    const existing = await CaseMember.findOne({
      case_id: caseDoc._id,
      user_id: req.body.user_id,
    });
    if (existing)
      return res.status(400).json({
        message: `${targetUser.name} is already a member of this case`,
      });

    await CaseMember.create({
      case_member_id: await nextSeq(CaseMember, "case_member_id"),
      case_id: caseDoc._id,
      user_id: req.body.user_id,
    });

    res.json({ message: `${targetUser.name} added to case successfully` });

      const notifyIds = await getCaseNotificationRecipients(caseDoc._id, {
        extraUserIds: [req.body.user_id, req.user.id],
      });
      const notificationMessage = `${targetUser.name} has been assigned to case "${caseDoc.title}"`;

    try {
      await createCaseEvent(
        caseDoc._id,
        `Member assigned: ${targetUser.name}`,
        `${targetUser.name} was added to the case`,
        req.user.id,
      );
    } catch (sideErr) {
      console.error("Case member event error:", sideErr);
    }
    try {
      if (notifyIds.length) {
        await sendNotifications(notifyIds, notificationMessage);
      }
    } catch (sideErr) {
      console.error("Case member notification error:", sideErr);
    }
    try {
        await logAction(
          req.user.id,
          `Member "${targetUser.name}" added to case "${caseDoc.title}"`,
          { caseId: caseDoc._id, targetUserIds: notifyIds },
        );
    } catch (sideErr) {
      console.error("Case member audit log error:", sideErr);
    }
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error adding member", error: err.message });
  }
});

app.delete("/case/:caseId/member/:userId", requireRole(1), async (req, res) => {
  try {
    const caseDoc = await Case.findOne({
      case_id: parseInt(req.params.caseId, 10),
    });
    if (!caseDoc) return res.status(404).json({ message: "Case not found" });

    const user = await User.findById(req.params.userId);
    await CaseMember.findOneAndDelete({
      case_id: caseDoc._id,
      user_id: req.params.userId,
    });
      const notifyIds = await getCaseNotificationRecipients(caseDoc._id, {
        extraUserIds: [req.params.userId, req.user.id],
      });
    const removalMessage = `Member "${user?.name || "Unknown"}" removed from case "${caseDoc.title}"`;

    try {
      await createCaseEvent(
        caseDoc._id,
        `Member removed: ${user?.name || "Unknown"}`,
        `${user?.name || "Unknown"} was removed from the case`,
        req.user.id,
      );
    } catch (sideErr) {
      console.error("Case member removal event error:", sideErr);
    }

    if (notifyIds.length) {
      await sendNotifications(notifyIds, removalMessage);
    }

      await logAction(req.user.id, removalMessage, {
        caseId: caseDoc._id,
        targetUserIds: notifyIds,
      });
    res.json({ message: "Member removed successfully" });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error removing member", error: err.message });
  }
});


app.get("/case/:id/evidence", async (req, res) => {
  try {
    const caseDoc = await Case.findOne({
      case_id: parseInt(req.params.id, 10),
    });
    if (!caseDoc) return res.status(404).json({ message: "Case not found" });

    if (req.user.role_id !== 1) {
      // : toObjectId()
      const membership = await CaseMember.findOne({
        case_id: caseDoc._id,
        user_id: toObjectId(req.user.id),
      });
      if (!membership)
        return res.status(403).json({ message: "Access denied" });
    }

    const ev = await Evidence.find({ case_id: caseDoc._id })
      .populate("uploaded_by", "name")
      .populate("verified_by", "name");
    res.json(
      ev.map((e) => ({
        _id: e._id,
        evidence_id: e.evidence_id,
        title: e.title,
        description: e.description,
        file_url: resolveStoredFileUrl(e.file_url || e.file_name, req.params.id),
        file_name: e.file_name,
        file_type: e.file_type,
        verified: e.verified,
        verified_note: e.verified_note || "",
        verified_at: e.verified_at,
        verified_by: e.verified_by?.name || null,
        uploaded_by: e.uploaded_by?.name || "Unknown",
        created_at: e.created_at,
        case_id: parseInt(req.params.id, 10),
        case_title: e.case_title,
      })),
    );
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error fetching evidence", error: err.message });
  }
});

app.post("/case/:id/evidence", upload.single("file"), async (req, res) => {
  try {
    const caseDoc = await Case.findOne({
      case_id: parseInt(req.params.id, 10),
    });
    if (!caseDoc) return res.status(404).json({ message: "Case not found" });

    if (req.user.role_id !== 1) {
      // : toObjectId()
      const membership = await CaseMember.findOne({
        case_id: caseDoc._id,
        user_id: toObjectId(req.user.id),
      });
      if (!membership)
        return res
          .status(403)
          .json({ message: "You are not a member of this case" });
    }

    const uploadPath = req.file
      ? path.posix.join("/uploads", `case-${req.params.id}`, req.file.filename)
      : null;

    const ev = await Evidence.create({
      evidence_id: await nextSeq(Evidence, "evidence_id"),
      case_id: caseDoc._id,
      case_title: caseDoc.title,
      uploaded_by: req.user.id,
      title: req.body.title || req.file?.originalname || "Untitled",
      description: req.body.description || "",
      file_url: uploadPath,
      file_name: req.file?.originalname || null,
      file_type: req.file?.mimetype || null,
      verified: false,
    });

      const notifyIds = await getCaseNotificationRecipients(caseDoc._id, {
        extraUserIds: [req.user.id],
      });

    try {
      await createCaseEvent(
        caseDoc._id,
        `Evidence uploaded: ${ev.title}`,
        `Uploaded by user ${req.user.email || req.user.id}`,
        req.user.id,
      );
    } catch (eventErr) {
      console.error("Evidence upload event error:", eventErr.message);
    }

    res.status(201).json({
      message: "Evidence uploaded",
      evidence: { ...ev.toObject(), case_id: parseInt(req.params.id, 10) },
    });

      try {
        await logAction(
          req.user.id,
          `Evidence "${ev.title}" uploaded for case "${caseDoc.title}"`,
          { caseId: caseDoc._id, targetUserIds: notifyIds },
        );
      } catch (sideErr) {
        console.error("Evidence audit log error:", sideErr);
      }

      if (notifyIds.length) {
        try {
          await sendNotifications(
            notifyIds,
            `New evidence uploaded for case "${caseDoc.title}": ${ev.title}`,
          );
        } catch (sideErr) {
          console.error("Evidence notification error:", sideErr);
        }
      }
  } catch (err) {
    console.error("Evidence upload error:", err);
    res
      .status(500)
      .json({ message: "Error uploading evidence", error: err.message });
  }
});

app.patch("/evidence/:id/verify", requireRole(1, 2, 3), async (req, res) => {
  try {
    const note = req.body.note?.trim() || "";
    const ev = await Evidence.findByIdAndUpdate(
      req.params.id,
      {
        verified: true,
        verified_by: req.user.id,
        verified_note: note,
        verified_at: new Date(),
      },
      { new: true },
    ).populate("case_id");
    if (!ev) return res.status(404).json({ message: "Evidence not found" });

      const notifyIds = await getCaseNotificationRecipients(ev.case_id._id, {
        extraUserIds: [req.user.id],
      });
    const verificationMessage = note
      ? ` Evidence "${ev.title}" verified for case "${ev.case_id?.title}" with note: ${note}`
      : ` Evidence "${ev.title}" verified for case "${ev.case_id?.title}"`;

    try {
      await createCaseEvent(
        ev.case_id._id,
        `Evidence verified: ${ev.title}`,
        note ? `Verified with note: ${note}` : "Verified without a note",
        req.user.id,
      );
    } catch (eventErr) {
      console.error("Evidence verify event error:", eventErr.message);
    }

    if (notifyIds.length) {
      await sendNotifications(notifyIds, verificationMessage);
    }
      await logAction(req.user.id, verificationMessage, {
        caseId: ev.case_id._id,
        targetUserIds: notifyIds,
      });
    res.json({ message: "Evidence verified", evidence: ev });
  } catch (err) {
    console.error("Verify evidence error:", err.message);
    res.status(500).json({ message: "Error verifying evidence" });
  }
});

app.delete("/evidence/:id", requireRole(1), async (req, res) => {
  try {
    const ev = await Evidence.findById(req.params.id).populate("case_id");
    if (!ev) return res.status(404).json({ message: "Evidence not found" });
    if (ev.verified)
      return res.status(400).json({
        message:
          "Verified evidence cannot be deleted. Unverify it first if needed.",
      });

    if (ev.file_url) {
      const filePath = path.join(__dirname, ev.file_url);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    await ev.deleteOne();

      const notifyIds = await getCaseNotificationRecipients(ev.case_id._id, {
        extraUserIds: [req.user.id],
      });
    const deleteMessage = `Evidence "${ev.title}" deleted from case "${ev.case_id?.title}"`;

    try {
      await createCaseEvent(
        ev.case_id._id,
        `Evidence deleted: ${ev.title}`,
        "Evidence removed from the case records",
        req.user.id,
      );
    } catch (eventErr) {
      console.error("Evidence delete event error:", eventErr.message);
    }

    if (notifyIds.length) {
      await sendNotifications(notifyIds, deleteMessage);
    }
      await logAction(req.user.id, deleteMessage, {
        caseId: ev.case_id._id,
        targetUserIds: notifyIds,
      });
    res.json({ message: "Evidence deleted" });
  } catch (err) {
    console.error("Delete evidence error:", err.message);
    res.status(500).json({ message: "Error deleting evidence" });
  }
});


app.get("/users", async (req, res) => {
  try {
    res.json(await User.find({}).populate("role_id"));
  } catch (err) {
    res.status(500).json({ message: "Error", error: err.message });
  }
});

app.get("/users/regions", async (req, res) => {
  try {
    res.json((await User.distinct("Region")).filter(Boolean));
  } catch {
    res.status(500).json([]);
  }
});

app.get("/users/leads", async (req, res) => {
  try {
    const role = await Role.findOne({ role_name: "Lead_Investigator" });
    if (!role)
      return res
        .status(404)
        .json({ message: "Lead Investigator role not found" });
    res.json(await User.find({ role_id: role._id }).populate("role_id"));
  } catch (err) {
    res.status(500).json({ message: "Error", error: err.message });
  }
});

app.get("/users/search", async (req, res) => {
  try {
    const q = req.query.q;
    const roleName = req.query.role;
    const region = req.query.region;
    const filter = {};

    if (roleName) {
      const role = await Role.findOne({ role_name: roleName });
      if (role) filter.role_id = role._id;
    }
    if (region) {
      filter.Region = { $regex: `^${region}$`, $options: "i" };
    }
    if (q) {
      filter.$or = [
        { name: { $regex: q, $options: "i" } },
        { email: { $regex: q, $options: "i" } },
      ];
    }
    if (!q && !roleName && !region) return res.json([]);

    res.json(await User.find(filter).populate("role_id"));
  } catch (err) {
    console.error("User search error:", err.message);
    res.status(500).json([]);
  }
});

app.get("/users/filter", async (req, res) => {
  try {
    const q = req.query.q;
    if (!q) return res.json([]);
    const role = await Role.findOne({
      role_name: { $regex: q, $options: "i" },
    });
    if (role)
      return res.json(
        await User.find({ role_id: role._id }).populate("role_id"),
      );
    res.json(
      await User.find({ Region: { $regex: q, $options: "i" } }).populate(
        "role_id",
      ),
    );
  } catch {
    res.status(500).json([]);
  }
});


app.post("/users/create", requireRole(1), async (req, res) => {
  try {
    const { name, email, role_name, Region, password } = req.body;
    if (!name?.trim() || !email?.trim() || !role_name)
      return res
        .status(400)
        .json({ message: "Name, email, and role are required" });

    const cleanEmail = email.trim().toLowerCase();
    if (await User.findOne({ email: cleanEmail }))
      return res
        .status(400)
        .json({ message: "A user with this email already exists" });

    const role = await Role.findOne({ role_name });
    if (!role)
      return res.status(400).json({ message: `Invalid role: "${role_name}"` });

    const nextUserId = await nextSeq(User, "user_id");
    const newUser = await User.create({
      user_id: nextUserId,
      name: name.trim(),
      email: cleanEmail,
      password: password?.trim() || "pass123",
      role_id: role._id,
      Region: Region || "",
    });

    const message = `New member "${name.trim()}" (${role_name.replace(/_/g, " ")}) added to system`;
    const allUserIds = await getAllUserIds();
    res.status(201).json({
      message: "Member created successfully",
      user: { _id: newUser._id, name: newUser.name, email: newUser.email },
    });

    try {
      await sendNotifications(allUserIds, message);
    } catch (sideErr) {
      console.error("Member notification error:", sideErr);
    }

    try {
      await logAction(req.user.id, message);
    } catch (sideErr) {
      console.error("Member audit log error:", sideErr);
    }
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error creating member", error: err.message });
  }
});

app.delete("/users/:userId", requireRole(1), async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (req.params.userId === req.user.id)
      return res
        .status(400)
        .json({ message: "You cannot delete your own account" });

    await CaseMember.deleteMany({ user_id: req.params.userId });
    await User.findByIdAndDelete(req.params.userId);

    await logAction(
      req.user.id,
      `Member "${user.name}" permanently deleted from system`,
    );
    res.json({ message: "Member deleted from system" });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error deleting member", error: err.message });
  }
});

app.get("/roles", async (req, res) => {
  try {
    const roles = await Role.find({});
    res.json(roles);
  } catch (err) {
    res.status(500).json({ message: "Error", error: err.message });
  }
});


app.get("/regions", async (req, res) => {
  try {
    const regions = await User.distinct("Region");
    res.json(regions.filter((r) => r && r.trim()));
  } catch (err) {
    res.status(500).json({ message: "Error", error: err.message });
  }
});


app.post("/users/:userId/reset-password", requireRole(1), async (req, res) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6)
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters" });

    const target = await User.findById(req.params.userId);
    if (!target) return res.status(404).json({ message: "User not found" });

    const admin = await User.findById(req.user.id);

    target.password = newPassword;
    await target.save();

    const msg = `🔐 Your password has been reset by ${admin?.name || "Admin"}. Your new temporary password is: "${newPassword}" — Please log in and go to Settings → Change Password.`;
    res.json({
      message: "Password reset successfully. Member has been notified.",
    });

    try {
      await sendNotifications([target._id], msg);
    } catch (sideErr) {
      console.error("Admin password reset notification error:", sideErr);
    }

    try {
      await AuditLog.create({
        log_id: await nextSeq(AuditLog, "log_id"),
        user_id: req.user.id,
        action: `Password reset for member "${target.name}" by Admin`,
      });
    } catch (sideErr) {
      console.error("Admin password reset audit log error:", sideErr);
    }
  } catch (err) {
    console.error("Reset password error:", err);
    res
      .status(500)
      .json({ message: "Error resetting password", error: err.message });
  }
});

app.delete("/users/:userId/cases", requireRole(1), async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const adminIds = (await getAdminIds())
      .map((id) => id.toString())
      .filter((id) => id !== req.user.id.toString());
    const notifyIds = [...new Set([req.params.userId, ...adminIds])];
    const removalMessage = `Member "${user.name}" removed from all assigned cases`;

    await CaseMember.deleteMany({ user_id: req.params.userId });
    if (notifyIds.length) {
      await sendNotifications(notifyIds, removalMessage);
    }
    await logAction(req.user.id, removalMessage);
    res.json({ message: "Member removed from all cases" });
  } catch (err) {
    res.status(500).json({ message: "Error", error: err.message });
  }
});

app.get("/all-cases", requireRole(1), async (req, res) => {
  try {
    res.json(
      await Case.find({}).select("case_id title status").sort({ case_id: -1 }),
    );
  } catch {
    res.status(500).json({ message: "Error fetching cases" });
  }
});


app.get("/profile", async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate("role_id");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone || "",
      department: user.department || "",
      bio: user.bio || "",
      avatar: user.avatar || null,
      role_id: user.role_id.role_id,
      role_name: user.role_id.role_name,
    });
  } catch {
    res.status(500).json({ message: "Error fetching profile" });
  }
});

app.put("/profile", async (req, res) => {
  try {
    const { name, phone, department, bio } = req.body;
    if (!name?.trim())
      return res.status(400).json({ message: "Name is required" });

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { name: name.trim(), phone, department, bio },
      { new: true },
    ).populate("role_id");

    await logAction(req.user.id, `Profile updated by "${user.name}"`);

    res.json({
      message: "Profile updated",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        department: user.department,
        bio: user.bio,
        avatar: user.avatar,
        role_id: user.role_id.role_id,
        role_name: user.role_id.role_name,
      },
    });
  } catch {
    res.status(500).json({ message: "Error updating profile" });
  }
});

app.post("/profile/avatar", uploadAvatar.single("avatar"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    const avatarUrl = `/uploads/avatars/${req.file.filename}`;
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { avatar: avatarUrl },
      { new: true },
    );
    await logAction(req.user.id, `Profile picture updated by "${user.name}"`);
    res.json({ message: "Avatar updated", avatar: avatarUrl });
  } catch {
    res.status(500).json({ message: "Error uploading avatar" });
  }
});


app.post("/change-password", async (req, res) => {
  try {
    const currentPassword = req.body.currentPassword;
    const newPassword = req.body.newPassword;

    if (!currentPassword || !newPassword)
      return res.status(400).json({ message: "Both fields are required" });
    if (String(newPassword).length < 6)
      return res
        .status(400)
        .json({ message: "New password must be at least 6 characters" });

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    // Support both bcrypt-hashed and plaintext passwords
    const passwordMatch = user.password.startsWith("$2")
      ? await bcrypt.compare(currentPassword, user.password)
      : user.password === currentPassword;
    if (!passwordMatch)
      return res.status(400).json({ message: "Current password is incorrect" });

    user.password = newPassword;
    await user.save();

    res.json({ message: "Password changed successfully" });

    // Send notifications and audit logs in the background so password updates
    // still succeed even if notification/log writing has intermittent errors.
    try {
      await sendNotifications(
        [user._id],
        `🔐 Your password was successfully changed. If you did not do this, contact your administrator immediately.`,
      );
    } catch (notifyErr) {
      console.error("Password change notification error:", notifyErr);
    }

    try {
      await logAction(req.user.id, `Password changed by "${user.name}"`);
    } catch (logErr) {
      console.error("Password change audit log error:", logErr);
    }
  } catch (err) {
    console.error("Change password error:", err);
    res
      .status(500)
      .json({ message: "Error changing password", error: err.message });
  }
});


  app.get("/case/:id/events", async (req, res) => {
    try {
      const caseDoc = await Case.findOne({
        case_id: parseInt(req.params.id, 10),
      });
    if (!caseDoc) return res.status(404).json({ message: "Case not found" });
    const storedEvents = await Event.find({ case_id: caseDoc._id })
      .populate("created_by", "name")
      .sort({ event_date: 1 });

    const evidenceEvents = await Evidence.find({ case_id: caseDoc._id })
      .populate("uploaded_by", "name")
      .select("title description created_at uploaded_by");

    const auditLogs = await AuditLog.find({
      action: { $regex: escapeRegex(caseDoc.title), $options: "i" },
    })
      .populate("user_id", "name")
      .sort({ timestamp: 1 })
      .select("action timestamp user_id");

    const storedKeys = new Set(
      storedEvents.map(
        (event) =>
          `${event.title || event.action || ""}|${new Date(event.event_date || event.created_at || 0).toISOString()}`,
      ),
    );

    const syntheticEvidenceEvents = evidenceEvents
      .map((evidence) => ({
        _id: `legacy-evidence-${evidence._id}`,
        title: `Evidence uploaded: ${evidence.title}`,
        description: evidence.description || "Existing evidence linked to this case",
        event_date: evidence.created_at,
        created_by: evidence.uploaded_by,
      }))
      .filter((event) => {
        const key = `${event.title}|${new Date(event.event_date || 0).toISOString()}`;
        return !storedKeys.has(key);
      });

      const syntheticAuditEvents = auditLogs
        .filter((log) =>
          /case|member|evidence|timeline event|uploaded|verified|deleted|removed|added|status/i.test(
            log.action || "",
          ),
      )
      .map((log) => ({
        _id: `legacy-audit-${log._id}`,
        title: log.action,
        description: "",
        event_date: log.timestamp,
        created_by: log.user_id,
      }))
      .filter((event) => {
          const key = `${event.title}|${new Date(event.event_date || 0).toISOString()}`;
          return !storedKeys.has(key);
        });

      const syntheticStatusEvent =
        caseDoc.status === "Close" &&
        ![...storedEvents, ...syntheticAuditEvents].some((event) =>
          /status updated to close|status updated from .* to close/i.test(
            event.title || event.action || "",
          ),
        )
          ? [
              {
                _id: `legacy-close-${caseDoc._id}`,
                title: `Case "${caseDoc.title}" status updated to Close`,
                description: `Case "${caseDoc.title}" was closed`,
                event_date: (await resolveCaseEndDate(caseDoc)) || caseDoc.end_date,
                created_by: null,
              },
            ].filter((event) => event.event_date)
          : [];

      res.json(
        [
          ...storedEvents,
          ...syntheticEvidenceEvents,
          ...syntheticAuditEvents,
          ...syntheticStatusEvent,
        ].sort(
          (a, b) =>
            new Date(a.event_date || a.created_at || 0) -
            new Date(b.event_date || b.created_at || 0),
        ),
      );
  } catch (err) {
    res.status(500).json({ message: "Error", error: err.message });
  }
});

app.post("/case/:id/events", async (req, res) => {
  try {
    const caseDoc = await Case.findOne({
      case_id: parseInt(req.params.id, 10),
    });
    if (!caseDoc) return res.status(404).json({ message: "Case not found" });

    if (req.user.role_id !== 1) {
      // : toObjectId()
      const membership = await CaseMember.findOne({
        case_id: caseDoc._id,
        user_id: toObjectId(req.user.id),
      });
      if (!membership)
        return res.status(403).json({ message: "Not a member of this case" });
    }

    if (!req.body.title?.trim())
      return res.status(400).json({ message: "Event title is required" });

    const ev = await Event.create({
      event_id: await nextSeq(Event, "event_id"),
      case_id: caseDoc._id,
      created_by: req.user.id,
      title: req.body.title.trim(),
      event_date: req.body.event_date
        ? new Date(req.body.event_date)
        : new Date(),
      description: req.body.description || "",
    });

      const notifyIds = await getCaseNotificationRecipients(caseDoc._id, {
        extraUserIds: [req.user.id],
      });
      const eventMessage = `Timeline event "${ev.title}" added to case "${caseDoc.title}"`;

    if (notifyIds.length) {
      await sendNotifications(notifyIds, eventMessage);
    }

      await logAction(req.user.id, eventMessage, {
        caseId: caseDoc._id,
        targetUserIds: notifyIds,
      });
    res.status(201).json({ message: "Event added", event: ev });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error creating event", error: err.message });
  }
});

app.delete("/case/:id/events/:eventId", requireRole(1, 2), async (req, res) => {
  try {
    const caseDoc = await Case.findOne({
      case_id: parseInt(req.params.id, 10),
    });
    if (!caseDoc) return res.status(404).json({ message: "Case not found" });

    const event = await Event.findById(req.params.eventId);
    if (!event) return res.status(404).json({ message: "Event not found" });

    await Event.findByIdAndDelete(req.params.eventId);

      const notifyIds = await getCaseNotificationRecipients(caseDoc._id, {
        extraUserIds: [req.user.id],
      });
      const deleteMessage = `Timeline event "${event.title}" deleted from case "${caseDoc.title}"`;

    if (notifyIds.length) {
      await sendNotifications(notifyIds, deleteMessage);
    }
      await logAction(req.user.id, deleteMessage, {
        caseId: caseDoc._id,
        targetUserIds: notifyIds,
      });
    res.json({ message: "Event deleted" });
  } catch {
    res.status(500).json({ message: "Error deleting event" });
  }
});

app.listen(process.env.PORT || 5000, () =>
  console.log(` Server running on port ${process.env.PORT || 5000}`),
);
